use serde::Serialize;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use tauri::State;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeScreenSource {
    source_id: String,
    title: String,
    detail: String,
    kind: String,
    width: u32,
    height: u32,
    primary: bool,
}

#[derive(Clone, Default)]
pub struct NativeShareState(Arc<Mutex<Option<Arc<AtomicBool>>>>);

#[cfg(target_os = "windows")]
mod windows {
    use super::{NativeScreenSource, NativeShareState};
    use base64::{engine::general_purpose::STANDARD, Engine};
    use image::{imageops::FilterType, DynamicImage, ImageFormat, RgbaImage};
    use livekit::{
        options::{TrackPublishOptions, VideoEncoding},
        prelude::{LocalTrack, LocalVideoTrack, Room, RoomEvent, RoomOptions, TrackSource},
        webrtc::{
            video_frame::{I420Buffer, VideoFrame, VideoRotation},
            video_source::{native::NativeVideoSource, RtcVideoSource, VideoResolution},
        },
    };
    use std::{
        error::Error,
        io::Cursor,
        sync::{
            atomic::{AtomicBool, Ordering},
            mpsc::{self, SyncSender},
            Arc,
        },
        thread,
        time::{Duration, Instant},
    };
    use tauri::{AppHandle, Emitter, State};
    use windows_capture::{
        capture::{Context, GraphicsCaptureApiHandler},
        frame::Frame,
        graphics_capture_api::InternalCaptureControl,
        monitor::Monitor,
        settings::{
            ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
            GraphicsCaptureItemType, MinimumUpdateIntervalSettings, SecondaryWindowSettings,
            Settings,
        },
        window::Window,
    };

    #[derive(Clone, Copy)]
    enum Target {
        Window(Window),
        Monitor(Monitor),
    }

    impl Target {
        fn capture_item(self) -> Result<GraphicsCaptureItemType, String> {
            match self {
                Self::Window(window) => window
                    .try_into()
                    .map_err(|_| "A janela selecionada não está mais disponível.".to_string()),
                Self::Monitor(monitor) => monitor
                    .try_into()
                    .map_err(|_| "A tela selecionada não está mais disponível.".to_string()),
            }
        }

        fn dimensions(self) -> Result<(u32, u32), String> {
            match self {
                Self::Window(window) => Ok((
                    u32::try_from(window.width().map_err(|e| e.to_string())?)
                        .map_err(|_| "Tamanho da janela inválido.".to_string())?,
                    u32::try_from(window.height().map_err(|e| e.to_string())?)
                        .map_err(|_| "Tamanho da janela inválido.".to_string())?,
                )),
                Self::Monitor(monitor) => Ok((
                    monitor.width().map_err(|e| e.to_string())?,
                    monitor.height().map_err(|e| e.to_string())?,
                )),
            }
        }

        fn source_id(self) -> String {
            match self {
                Self::Window(window) => {
                    format!("window:{:x}", window.as_raw_hwnd() as usize)
                }
                Self::Monitor(monitor) => {
                    format!("monitor:{:x}", monitor.as_raw_hmonitor() as usize)
                }
            }
        }
    }

    fn resolve_target(source_id: &str) -> Result<Target, String> {
        let (kind, raw_id) = source_id
            .split_once(':')
            .ok_or_else(|| "Fonte de captura inválida.".to_string())?;
        let raw_id = usize::from_str_radix(raw_id, 16)
            .map_err(|_| "Fonte de captura inválida.".to_string())?;
        match kind {
            "window" => Window::enumerate()
                .map_err(|e| e.to_string())?
                .into_iter()
                .find(|window| {
                    window.as_raw_hwnd() as usize == raw_id
                        && window.is_valid()
                        && window.process_id().ok() != Some(std::process::id())
                })
                .map(Target::Window)
                .ok_or_else(|| "A janela selecionada não está mais disponível.".to_string()),
            "monitor" => Monitor::enumerate()
                .map_err(|e| e.to_string())?
                .into_iter()
                .find(|monitor| monitor.as_raw_hmonitor() as usize == raw_id)
                .map(Target::Monitor)
                .ok_or_else(|| "A tela selecionada não está mais disponível.".to_string()),
            _ => Err("Fonte de captura inválida.".to_string()),
        }
    }

    #[tauri::command]
    pub fn list_native_screen_sources() -> Result<Vec<NativeScreenSource>, String> {
        let mut sources = Vec::new();
        let primary = Monitor::primary().ok();
        for monitor in Monitor::enumerate().map_err(|e| e.to_string())? {
            let Ok(width) = monitor.width() else { continue };
            let Ok(height) = monitor.height() else {
                continue;
            };
            sources.push(NativeScreenSource {
                source_id: Target::Monitor(monitor).source_id(),
                title: monitor.name().unwrap_or_else(|_| "Tela".into()),
                detail: format!("Monitor · {width} × {height}"),
                kind: "monitor".into(),
                width,
                height,
                primary: primary == Some(monitor),
            });
        }
        for window in Window::enumerate().map_err(|e| e.to_string())? {
            if !window.is_valid() || window.process_id().ok() == Some(std::process::id()) {
                continue;
            }
            let title = window.title().unwrap_or_default().trim().to_string();
            let Ok(width) = u32::try_from(window.width().unwrap_or_default()) else {
                continue;
            };
            let Ok(height) = u32::try_from(window.height().unwrap_or_default()) else {
                continue;
            };
            if title.is_empty() || width < 80 || height < 60 {
                continue;
            }
            let app = window
                .process_name()
                .unwrap_or_else(|_| "Aplicativo".into());
            sources.push(NativeScreenSource {
                source_id: Target::Window(window).source_id(),
                title,
                detail: format!("{app} · {width} × {height}"),
                kind: "window".into(),
                width,
                height,
                primary: false,
            });
        }
        Ok(sources)
    }

    struct CapturedFrame {
        width: u32,
        height: u32,
        rgba: Vec<u8>,
    }

    struct FrameHandlerFlags {
        sender: SyncSender<CapturedFrame>,
        stop_after_first: bool,
        video_source: Option<NativeVideoSource>,
        output_size: Option<(u32, u32)>,
        started: Option<Arc<AtomicBool>>,
        start_time: Instant,
    }

    struct FrameHandler {
        flags: FrameHandlerFlags,
    }

    impl GraphicsCaptureApiHandler for FrameHandler {
        type Flags = FrameHandlerFlags;
        type Error = Box<dyn Error + Send + Sync>;

        fn new(context: Context<Self::Flags>) -> Result<Self, Self::Error> {
            Ok(Self {
                flags: context.flags,
            })
        }

        fn on_frame_arrived(
            &mut self,
            frame: &mut Frame,
            capture_control: InternalCaptureControl,
        ) -> Result<(), Self::Error> {
            let width = frame.width();
            let height = frame.height();
            if width == 0 || height == 0 {
                return Ok(());
            }
            let mut buffer = frame.buffer()?;
            let rgba = buffer.as_nopadding_buffer(&mut Vec::new()).to_vec();

            if let (Some(video_source), Some((output_width, output_height))) =
                (&self.flags.video_source, self.flags.output_size)
            {
                let Some(image) = RgbaImage::from_raw(width, height, rgba) else {
                    return Ok(());
                };
                let image = if image.width() == output_width && image.height() == output_height {
                    image
                } else {
                    image::imageops::resize(
                        &image,
                        output_width,
                        output_height,
                        FilterType::Triangle,
                    )
                };
                let mut i420 = I420Buffer::new(output_width, output_height);
                let (stride_y, stride_u, stride_v) = i420.strides();
                let (plane_y, plane_u, plane_v) = i420.data_mut();
                imgproc::colorcvt::rgba_to_i420(
                    image.as_raw(),
                    output_width * 4,
                    plane_y,
                    stride_y,
                    plane_u,
                    stride_u,
                    plane_v,
                    stride_v,
                    output_width,
                    output_height,
                    false,
                );
                video_source.capture_frame(&VideoFrame {
                    rotation: VideoRotation::VideoRotation0,
                    timestamp_us: self.flags.start_time.elapsed().as_micros() as i64,
                    frame_metadata: None,
                    buffer: i420,
                });
                if let Some(started) = &self.flags.started {
                    started.store(true, Ordering::Release);
                }
            } else {
                let _ = self.flags.sender.try_send(CapturedFrame {
                    width,
                    height,
                    rgba,
                });
            }

            if self.flags.stop_after_first {
                capture_control.stop();
            }
            Ok(())
        }

        fn on_closed(&mut self) -> Result<(), Self::Error> {
            Ok(())
        }
    }

    fn capture_settings<T: TryInto<GraphicsCaptureItemType>>(
        item: T,
        flags: FrameHandlerFlags,
        fps: u32,
    ) -> Settings<FrameHandlerFlags, T> {
        Settings::new(
            item,
            CursorCaptureSettings::WithCursor,
            DrawBorderSettings::Default,
            SecondaryWindowSettings::Default,
            MinimumUpdateIntervalSettings::Custom(Duration::from_millis(1000 / fps as u64)),
            DirtyRegionSettings::Default,
            ColorFormat::Rgba8,
            flags,
        )
    }

    #[tauri::command]
    pub async fn preview_native_screen_source(source_id: String) -> Result<String, String> {
        tauri::async_runtime::spawn_blocking(move || {
            let target = resolve_target(&source_id)?;
            let item = target.capture_item()?;
            let (sender, receiver) = mpsc::sync_channel(1);
            let settings = capture_settings(
                item,
                FrameHandlerFlags {
                    sender,
                    stop_after_first: true,
                    video_source: None,
                    output_size: None,
                    started: None,
                    start_time: Instant::now(),
                },
                5,
            );
            let capture = FrameHandler::start_free_threaded(settings)
                .map_err(|_| "Não foi possível pré-visualizar esta fonte.".to_string())?;
            let captured = receiver
                .recv_timeout(Duration::from_secs(8))
                .map_err(|_| "A fonte não enviou uma imagem de prévia.".to_string());
            let _ = capture.stop();
            let captured = captured?;
            let image = RgbaImage::from_raw(captured.width, captured.height, captured.rgba)
                .ok_or_else(|| "Não foi possível processar a prévia.".to_string())?;
            let thumbnail = image::imageops::thumbnail(&image, 480, 270);
            let mut output = Cursor::new(Vec::new());
            DynamicImage::ImageRgba8(thumbnail)
                .write_to(&mut output, ImageFormat::Png)
                .map_err(|_| "Não foi possível gerar a prévia.".to_string())?;
            Ok(format!(
                "data:image/png;base64,{}",
                STANDARD.encode(output.into_inner())
            ))
        })
        .await
        .map_err(|_| "Não foi possível gerar a prévia.".to_string())?
    }

    #[tauri::command]
    pub async fn start_native_screen_share(
        app: AppHandle,
        state: State<'_, NativeShareState>,
        source_id: String,
        quality: String,
        url: String,
        token: String,
    ) -> Result<(), String> {
        let source_id = source_id.trim().to_string();
        if !(url.starts_with("wss://") || url.starts_with("ws://")) || token.len() > 16_384 {
            return Err("A conexão segura com a chamada está inválida.".into());
        }
        let stop = Arc::new(AtomicBool::new(false));
        let state_inner = state.inner().clone();
        {
            let mut current = state_inner
                .0
                .lock()
                .map_err(|_| "Não foi possível iniciar o compartilhamento.".to_string())?;
            if current.is_some() {
                return Err("Já existe uma tela sendo compartilhada.".into());
            }
            *current = Some(stop.clone());
        }

        let worker_stop = stop.clone();
        let worker_state = state_inner.clone();
        let worker_app = app.clone();
        let (ready_tx, ready_rx) = mpsc::sync_channel(1);
        let startup_tx = ready_tx.clone();
        let thread = thread::Builder::new()
            .name("hub-native-screen-share".into())
            .spawn(move || {
                let result = tokio::runtime::Builder::new_multi_thread()
                    .enable_all()
                    .build()
                    .map_err(|e| e.to_string())
                    .and_then(|runtime| {
                        runtime.block_on(run_native_share(
                            url,
                            token,
                            source_id,
                            quality,
                            worker_stop.clone(),
                            ready_tx,
                        ))
                    });
                if let Err(error) = &result {
                    let _ = startup_tx.send(Err(error.clone()));
                }
                if let Ok(mut current) = worker_state.0.lock() {
                    if current
                        .as_ref()
                        .is_some_and(|value| Arc::ptr_eq(value, &worker_stop))
                    {
                        *current = None;
                    }
                }
                let message = if worker_stop.load(Ordering::Acquire) {
                    String::new()
                } else {
                    result.err().unwrap_or_default()
                };
                let _ = worker_app.emit("hub-native-share-ended", message);
            });
        if thread.is_err() {
            stop.store(true, Ordering::Release);
            clear_state_if_same(&state_inner, &stop);
            return Err("Não foi possível abrir o serviço de captura nativa.".into());
        }

        let startup = tauri::async_runtime::spawn_blocking(move || {
            ready_rx.recv_timeout(Duration::from_secs(20))
        })
        .await
        .map_err(|_| "A captura nativa não respondeu.".to_string());
        let startup = match startup {
            Ok(startup) => startup,
            Err(error) => {
                stop.store(true, Ordering::Release);
                clear_state_if_same(&state_inner, &stop);
                return Err(error);
            }
        };
        match startup {
            Ok(Ok(())) => Ok(()),
            Ok(Err(error)) => {
                stop.store(true, Ordering::Release);
                clear_state_if_same(&state_inner, &stop);
                Err(error)
            }
            Err(_) => {
                stop.store(true, Ordering::Release);
                clear_state_if_same(&state_inner, &stop);
                Err("A captura nativa não iniciou. Verifique a permissão do Windows.".into())
            }
        }
    }

    fn clear_state_if_same(state: &NativeShareState, stop: &Arc<AtomicBool>) {
        if let Ok(mut current) = state.0.lock() {
            if current
                .as_ref()
                .is_some_and(|value| Arc::ptr_eq(value, stop))
            {
                *current = None;
            }
        }
    }

    async fn run_native_share(
        url: String,
        token: String,
        source_id: String,
        quality: String,
        stop: Arc<AtomicBool>,
        ready: SyncSender<Result<(), String>>,
    ) -> Result<(), String> {
        let target = resolve_target(&source_id)?;
        let item = target.capture_item()?;
        let (source_width, source_height) = target.dimensions()?;
        let (max_width, max_height, fps, max_bitrate) = match quality.as_str() {
            "smooth" => (1920u32, 1080u32, 60u32, 8_000_000u64),
            "sharp" => (2560u32, 1440u32, 60u32, 12_000_000u64),
            _ => (1920u32, 1080u32, 30u32, 5_000_000u64),
        };
        let scale = (max_width as f64 / source_width.max(2) as f64)
            .min(max_height as f64 / source_height.max(2) as f64)
            .min(1.0);
        let output_width = (((source_width as f64 * scale).round() as u32).max(2)) & !1;
        let output_height = (((source_height as f64 * scale).round() as u32).max(2)) & !1;

        let (room, mut room_events) = Room::connect(
            &url,
            &token,
            RoomOptions {
                auto_subscribe: false,
                ..Default::default()
            },
        )
        .await
        .map_err(|_| "Não foi possível conectar o compartilhamento à chamada.".to_string())?;
        let video_source = NativeVideoSource::new(
            VideoResolution {
                width: output_width,
                height: output_height,
            },
            true,
        );
        let track = LocalVideoTrack::create_video_track(
            "Hub screen",
            RtcVideoSource::Native(video_source.clone()),
        );
        let publish = room
            .local_participant()
            .publish_track(
                LocalTrack::Video(track),
                TrackPublishOptions {
                    source: TrackSource::Screenshare,
                    video_encoding: Some(VideoEncoding {
                        max_bitrate,
                        max_framerate: fps as f64,
                    }),
                    ..Default::default()
                },
            )
            .await;
        if publish.is_err() {
            let _ = room.close().await;
            return Err("Não foi possível publicar a tela na chamada.".into());
        }

        let started = Arc::new(AtomicBool::new(false));
        let (sender, _receiver) = mpsc::sync_channel(1);
        let settings = capture_settings(
            item,
            FrameHandlerFlags {
                sender,
                stop_after_first: false,
                video_source: Some(video_source),
                output_size: Some((output_width, output_height)),
                started: Some(started.clone()),
                start_time: Instant::now(),
            },
            fps,
        );
        let capture = match FrameHandler::start_free_threaded(settings) {
            Ok(capture) => capture,
            Err(_) => {
                let _ = room.close().await;
                return Err("O Windows não conseguiu iniciar a captura desta fonte.".into());
            }
        };

        let deadline = Instant::now() + Duration::from_secs(12);
        while !started.load(Ordering::Acquire) && Instant::now() < deadline {
            if stop.load(Ordering::Acquire) {
                let _ = capture.stop();
                let _ = room.close().await;
                return Ok(());
            }
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        if !started.load(Ordering::Acquire) {
            let _ = capture.stop();
            let _ = room.close().await;
            return Err("O Windows não enviou quadros desta tela. Escolha outra fonte.".into());
        }
        let _ = ready.send(Ok(()));

        loop {
            if stop.load(Ordering::Acquire) || capture.is_finished() {
                break;
            }
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_millis(250)) => {},
                event = room_events.recv() => {
                    match event {
                        Some(RoomEvent::Disconnected { .. }) | None => break,
                        Some(_) => {}
                    }
                }
            }
        }
        let _ = capture.stop();
        let _ = room.close().await;
        Ok(())
    }
}

#[cfg(not(target_os = "windows"))]
mod windows {
    use super::{NativeScreenSource, NativeShareState};
    use tauri::{AppHandle, State};

    #[tauri::command]
    pub fn list_native_screen_sources() -> Result<Vec<NativeScreenSource>, String> {
        Err("A captura nativa está disponível no Hub para Windows.".into())
    }

    #[tauri::command]
    pub async fn preview_native_screen_source(_source_id: String) -> Result<String, String> {
        Err("A captura nativa está disponível no Hub para Windows.".into())
    }

    #[tauri::command]
    pub async fn start_native_screen_share(
        _app: AppHandle,
        _state: State<'_, NativeShareState>,
        _source_id: String,
        _quality: String,
        _url: String,
        _token: String,
    ) -> Result<(), String> {
        Err("A captura nativa está disponível no Hub para Windows.".into())
    }
}

pub use windows::{
    list_native_screen_sources, preview_native_screen_source, start_native_screen_share,
};

#[tauri::command]
pub fn stop_native_screen_share(state: State<'_, NativeShareState>) -> Result<(), String> {
    let stop = state
        .0
        .lock()
        .map_err(|_| "Não foi possível parar o compartilhamento.".to_string())?
        .take();
    if let Some(stop) = stop {
        stop.store(true, Ordering::Release);
    }
    Ok(())
}
