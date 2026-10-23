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
    use image::{DynamicImage, ImageFormat, RgbaImage};
    use livekit::{
        options::{DegradationPreference, TrackPublishOptions, VideoEncoding},
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

    impl TryInto<GraphicsCaptureItemType> for Target {
        type Error = String;

        fn try_into(self) -> Result<GraphicsCaptureItemType, Self::Error> {
            match self {
                Self::Window(window) => window
                    .try_into()
                    .map_err(|_| "A janela selecionada não está mais disponível.".to_string()),
                Self::Monitor(monitor) => monitor
                    .try_into()
                    .map_err(|_| "A tela selecionada não está mais disponível.".to_string()),
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

    pub(super) fn list_native_screen_sources_impl() -> Result<Vec<NativeScreenSource>, String> {
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
            let captured_at = Instant::now();
            let mut buffer = frame.buffer()?;

            if let (Some(video_source), Some((output_width, output_height))) =
                (&self.flags.video_source, self.flags.output_size)
            {
                let stride = buffer.row_pitch();
                let i420 = rgba_video_frame(
                    buffer.as_raw_buffer(),
                    stride,
                    width,
                    height,
                    output_width,
                    output_height,
                );
                video_source.capture_frame(&VideoFrame {
                    rotation: VideoRotation::VideoRotation0,
                    timestamp_us: captured_at
                        .duration_since(self.flags.start_time)
                        .as_micros() as i64,
                    frame_metadata: None,
                    buffer: i420,
                });
                if let Some(started) = &self.flags.started {
                    started.store(true, Ordering::Release);
                }
            } else {
                // Only thumbnails need an owned, tightly packed RGBA image.
                let rgba = buffer.as_nopadding_buffer(&mut Vec::new()).to_vec();
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

    fn rgba_video_frame(
        rgba: &[u8],
        stride: u32,
        width: u32,
        height: u32,
        output_width: u32,
        output_height: u32,
    ) -> I420Buffer {
        let mut i420 = I420Buffer::new(width, height);
        let (stride_y, stride_u, stride_v) = i420.strides();
        let (plane_y, plane_u, plane_v) = i420.data_mut();
        // WGC Rgba8 is R,G,B,A in memory. libyuv names formats by register
        // order: ABGR means R,G,B,A on little-endian Windows. RGBAToI420
        // would treat alpha as red, tinting even a black image red.
        imgproc::colorcvt::abgr_to_i420(
            rgba, stride, plane_y, stride_y, plane_u, stride_u, plane_v, stride_v, width, height,
            false,
        );
        if width == output_width && height == output_height {
            i420
        } else {
            // WebRTC/libyuv scales the smaller YUV planes with native SIMD;
            // avoid a full RGBA copy and CPU image::resize on every frame.
            i420.scale(output_width as i32, output_height as i32)
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
            MinimumUpdateIntervalSettings::Custom(Duration::from_nanos(1_000_000_000 / fps as u64)),
            DirtyRegionSettings::Default,
            ColorFormat::Rgba8,
            flags,
        )
    }

    pub(super) async fn preview_native_screen_source_impl(
        source_id: String,
    ) -> Result<String, String> {
        tauri::async_runtime::spawn_blocking(move || {
            let target = resolve_target(&source_id)?;
            let (sender, receiver) = mpsc::sync_channel(1);
            let settings = capture_settings(
                target,
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

    pub(super) async fn start_native_screen_share_impl(
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

    fn screen_share_profile(quality: &str) -> (u32, u32, u32, TrackPublishOptions) {
        let (width, height, fps, bitrate, degradation) = match quality {
            "smooth" => (
                1920,
                1080,
                60,
                12_000_000,
                DegradationPreference::MaintainFramerate,
            ),
            "sharp" => (
                2560,
                1440,
                60,
                20_000_000,
                DegradationPreference::MaintainResolution,
            ),
            _ => (1920, 1080, 30, 6_000_000, DegradationPreference::Balanced),
        };
        (
            width,
            height,
            fps,
            TrackPublishOptions {
                source: TrackSource::Screenshare,
                // The SDK's default second screen layer runs at only 3 FPS.
                // One stream avoids selecting it and avoids a second encoder.
                simulcast: false,
                video_encoding: Some(VideoEncoding {
                    max_bitrate: bitrate,
                    max_framerate: fps as f64,
                }),
                degradation_preference: Some(degradation),
                ..Default::default()
            },
        )
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
        let (source_width, source_height) = target.dimensions()?;
        let (max_width, max_height, fps, publish_options) = screen_share_profile(&quality);
        let scale = (max_width as f64 / source_width.max(2) as f64)
            .min(max_height as f64 / source_height.max(2) as f64)
            .min(1.0);
        let output_width = (((source_width as f64 * scale).round() as u32).max(2)) & !1;
        let output_height = (((source_height as f64 * scale).round() as u32).max(2)) & !1;

        let mut options = RoomOptions::default();
        options.auto_subscribe = false;
        let (room, mut room_events) = Room::connect(&url, &token, options)
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
            .publish_track(LocalTrack::Video(track), publish_options)
            .await;
        if publish.is_err() {
            let _ = room.close().await;
            return Err("Não foi possível publicar a tela na chamada.".into());
        }

        let started = Arc::new(AtomicBool::new(false));
        let (sender, _receiver) = mpsc::sync_channel(1);
        let settings = capture_settings(
            target,
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
            if capture.is_finished() {
                let _ = capture.stop();
                let _ = room.close().await;
                return Err("O Windows não conseguiu iniciar a captura desta fonte.".into());
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
    #[cfg(test)]
    mod tests {
        use super::{rgba_video_frame, screen_share_profile};
        use livekit::options::{compute_video_encodings, DegradationPreference};
        use livekit::webrtc::video_frame::VideoBuffer;

        #[test]
        fn screen_profiles_publish_one_stream_at_the_selected_frame_rate() {
            for (name, width, height, fps, bitrate, degradation) in [
                (
                    "balanced",
                    1920,
                    1080,
                    30,
                    6_000_000,
                    DegradationPreference::Balanced,
                ),
                (
                    "smooth",
                    1920,
                    1080,
                    60,
                    12_000_000,
                    DegradationPreference::MaintainFramerate,
                ),
                (
                    "sharp",
                    2560,
                    1440,
                    60,
                    20_000_000,
                    DegradationPreference::MaintainResolution,
                ),
            ] {
                let (w, h, rate, options) = screen_share_profile(name);
                assert_eq!((w, h, rate), (width, height, fps));
                assert!(!options.simulcast);
                assert_eq!(options.degradation_preference, Some(degradation));
                // Exercise the SDK's actual RTP layer calculation, not just flags.
                let encodings = compute_video_encodings(w, h, &options);
                assert_eq!(encodings.len(), 1);
                assert_eq!(encodings[0].max_framerate, Some(fps as f64));
                assert_eq!(encodings[0].max_bitrate, Some(bitrate));
            }
        }

        #[test]
        fn rgba_colors_do_not_use_alpha_as_red() {
            // BT.601 limited-range reference values, tolerance for rounding.
            for (pixel, expected) in [
                ([0, 0, 0, 255], [16, 128, 128]),
                ([255, 255, 255, 255], [235, 128, 128]),
                ([255, 0, 0, 255], [82, 90, 240]),
                ([0, 255, 0, 255], [144, 54, 34]),
                ([0, 0, 255, 255], [41, 240, 110]),
            ] {
                let rgba = pixel.repeat(4);
                let frame = rgba_video_frame(&rgba, 8, 2, 2, 2, 2);
                let (y, u, v) = frame.data();
                for (plane, value) in [(y, expected[0]), (u, expected[1]), (v, expected[2])] {
                    assert!(plane.iter().all(|sample| sample.abs_diff(value) <= 1));
                }
            }
        }

        #[test]
        fn padded_rows_and_yuv_downscale_preserve_color() {
            // 3x3 white, with conspicuous padding at the end of every row.
            let mut rgba = Vec::new();
            for _ in 0..3 {
                rgba.extend([255, 255, 255, 255].repeat(3));
                rgba.extend([255, 0, 0, 255]);
            }
            let frame = rgba_video_frame(&rgba, 16, 3, 3, 2, 2);
            assert_eq!((frame.width(), frame.height()), (2, 2));
            let (y, u, v) = frame.data();
            assert!(y.iter().all(|sample| sample.abs_diff(235) <= 1));
            assert!(u.iter().chain(v).all(|sample| sample.abs_diff(128) <= 1));
        }

        #[test]
        fn alpha_does_not_change_transmitted_rgb() {
            let opaque = [0, 0, 255, 255].repeat(4);
            let transparent = [0, 0, 255, 0].repeat(4);
            let a = rgba_video_frame(&opaque, 8, 2, 2, 2, 2);
            let b = rgba_video_frame(&transparent, 8, 2, 2, 2, 2);
            assert_eq!(a.data(), b.data());
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod windows {
    use super::{NativeScreenSource, NativeShareState};
    use tauri::{AppHandle, State};

    pub(super) fn list_native_screen_sources_impl() -> Result<Vec<NativeScreenSource>, String> {
        Err("A captura nativa está disponível no Hub para Windows.".into())
    }

    pub(super) async fn preview_native_screen_source_impl(
        _source_id: String,
    ) -> Result<String, String> {
        Err("A captura nativa está disponível no Hub para Windows.".into())
    }

    pub(super) async fn start_native_screen_share_impl(
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

#[tauri::command]
pub fn list_native_screen_sources() -> Result<Vec<NativeScreenSource>, String> {
    windows::list_native_screen_sources_impl()
}

#[tauri::command]
pub async fn preview_native_screen_source(source_id: String) -> Result<String, String> {
    windows::preview_native_screen_source_impl(source_id).await
}

#[tauri::command]
pub async fn start_native_screen_share(
    app: tauri::AppHandle,
    state: State<'_, NativeShareState>,
    source_id: String,
    quality: String,
    url: String,
    token: String,
) -> Result<(), String> {
    windows::start_native_screen_share_impl(app, state, source_id, quality, url, token).await
}

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
