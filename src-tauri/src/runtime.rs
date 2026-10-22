use serde::{Deserialize, Serialize};
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::{Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{Emitter, Manager};

#[derive(Clone, Copy, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TimerPhase {
    #[default]
    Idle,
    Running,
    Lunch,
}
#[derive(Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerInput {
    phase: TimerPhase,
    elapsed_seconds: u64,
    can_control: bool,
    busy: bool,
}
struct TimerCache {
    input: TimerInput,
    received: Instant,
}
impl Default for TimerCache {
    fn default() -> Self {
        Self {
            input: TimerInput::default(),
            received: Instant::now(),
        }
    }
}
#[derive(Default)]
pub struct DesktopRuntime {
    error: Mutex<Option<String>>,
    timer: Mutex<TimerCache>,
    pub background: AtomicBool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerView {
    error: Option<String>,
    phase: TimerPhase,
    elapsed_seconds: u64,
    can_control: bool,
    busy: bool,
    sampled_at: u64,
}
#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuntimeAction {
    State,
    SetAutostart,
    ShowMini,
    HideMini,
    Quit,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeView {
    supported: bool,
    background: bool,
    autostart: bool,
    mini_visible: bool,
}
#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum MiniAction {
    State,
    Pause,
    Resume,
    Stop,
    Hide,
    OpenMain,
    Drag,
}

pub fn smoke_webview_diagnostic(message: &str) {
    #[cfg(target_os = "windows")]
    if std::env::var_os("ZULU_DESKTOP_SMOKE").is_some() {
        use std::io::Write;
        let temp = std::env::var_os("RUNNER_TEMP")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(std::env::temp_dir);
        let path = temp.join("zulu-desktop-smoke-webview.log");
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
        {
            let _ = writeln!(file, "{message}");
        }
    }
}

fn trusted(window: &tauri::WebviewWindow, label: &str) -> Result<(), String> {
    let url = window.url().map_err(|_| "Janela indisponível.")?;
    if window.label() != label
        || url.scheme() != "https"
        || url.host_str() != Some("hub-one-azure.vercel.app")
    {
        return Err("Janela não reconhecida.".into());
    }
    Ok(())
}
fn view(state: &DesktopRuntime) -> Result<TimerView, String> {
    let timer = state.timer.lock().map_err(|_| "Timer indisponível.")?;
    let elapsed =
        timer
            .input
            .elapsed_seconds
            .saturating_add(if timer.input.phase == TimerPhase::Running {
                timer.received.elapsed().as_secs()
            } else {
                0
            });
    Ok(TimerView {
        error: state
            .error
            .lock()
            .map_err(|_| "Timer indisponível.")?
            .clone(),
        phase: timer.input.phase,
        elapsed_seconds: elapsed,
        can_control: timer.input.can_control,
        busy: timer.input.busy,
        sampled_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
    })
}
pub fn clear_timer(app: &tauri::AppHandle) {
    let state = app.state::<DesktopRuntime>();
    if let Ok(mut timer) = state.timer.lock() {
        *timer = TimerCache::default();
    }
    if let Ok(mut error) = state.error.lock() {
        *error = None;
    }
    let _ = app.emit_to("mini-timer", "zulu:timer-changed", ());
}
#[tauri::command]
pub fn desktop_timer_sync(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<'_, DesktopRuntime>,
    timer: TimerInput,
) -> Result<(), String> {
    trusted(&window, "main")?;
    if timer.elapsed_seconds > 315_576_000 {
        return Err("Duração inválida.".into());
    }
    *state.timer.lock().map_err(|_| "Timer indisponível.")? = TimerCache {
        input: timer,
        received: Instant::now(),
    };
    let _ = app.emit_to("mini-timer", "zulu:timer-changed", ());
    Ok(())
}
#[tauri::command]
pub fn desktop_timer_feedback(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<'_, DesktopRuntime>,
    error: Option<String>,
) -> Result<(), String> {
    trusted(&window, "main")?;
    *state.error.lock().map_err(|_| "Timer indisponível.")? =
        error.map(|text| text.chars().take(180).collect());
    let _ = app.emit_to("mini-timer", "zulu:timer-changed", ());
    Ok(())
}
pub fn show_mini(app: &tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(window) = app.get_webview_window("mini-timer") {
            window
                .set_always_on_top(true)
                .map_err(|_| "Não foi possível manter o mini timer por cima.")?;
            window
                .show()
                .map_err(|_| "Não foi possível abrir o mini timer.")?;
            let _ = window.emit("zulu:timer-changed", ());
            return Ok(());
        }
        let url: tauri::Url = "https://hub-one-azure.vercel.app/desktop/timer"
            .parse()
            .map_err(|_| "Endereço inválido.")?;
        let mini_url = url.clone();
        let mini =
            tauri::WebviewWindowBuilder::new(app, "mini-timer", tauri::WebviewUrl::External(url))
                .title("ZULU — Mini timer")
                .inner_size(328.0, 80.0)
                .decorations(false)
                .background_color(tauri::window::Color(16, 17, 18, 255))
                .shadow(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .maximizable(false)
                .minimizable(false)
                .on_page_load(|window, payload| {
                    smoke_webview_diagnostic(&format!(
                        "mini-page-load window={} event={:?} url={}",
                        window.label(),
                        payload.event(),
                        payload.url()
                    ));
                })
                .on_navigation(|url| {
                    let allowed = url.scheme() == "https"
                        && url.host_str() == Some("hub-one-azure.vercel.app")
                        && url.path().trim_end_matches('/') == "/desktop/timer";
                    smoke_webview_diagnostic(&format!(
                        "mini-navigation allowed={allowed} url={url}"
                    ));
                    allowed
                })
                .build()
                .map_err(|_| "Não foi possível abrir o mini timer.")?;
        if let Ok(current_url) = mini.url() {
            smoke_webview_diagnostic(&format!("mini-url-before-show={current_url}"));
        }
        if let Ok(Some(monitor)) = mini.current_monitor() {
            let area = monitor.work_area();
            let scale = monitor.scale_factor();
            let x = f64::from(area.position.x) / scale + f64::from(area.size.width) / scale - 352.0;
            let y = f64::from(area.position.y) / scale + 24.0;
            let _ = mini.set_position(tauri::LogicalPosition::new(x, y));
        }
        mini.set_always_on_top(true)
            .map_err(|_| "Não foi possível manter o mini timer por cima.")?;
        mini.show()
            .map_err(|_| "Não foi possível abrir o mini timer.")?;
        mini.navigate(mini_url).map_err(|error| {
            smoke_webview_diagnostic(&format!("mini-navigation-error={error}"));
            "Não foi possível carregar o mini timer."
        })?;
        if let Ok(current_url) = mini.url() {
            smoke_webview_diagnostic(&format!("mini-url-after-show={current_url}"));
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Err("Mini timer disponível no Windows.".into())
    }
}
#[tauri::command]
pub fn desktop_runtime(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<'_, DesktopRuntime>,
    action: RuntimeAction,
    enabled: Option<bool>,
) -> Result<RuntimeView, String> {
    trusted(&window, "main")?;
    #[cfg(target_os = "windows")]
    {
        use tauri_plugin_autostart::ManagerExt;
        match action {
            RuntimeAction::SetAutostart => {
                let manager = app.autolaunch();
                if enabled.ok_or("Escolha se deseja iniciar com o PC.")? {
                    manager.enable()
                } else {
                    manager.disable()
                }
                .map_err(|_| "Não foi possível alterar o início automático.")?;
            }
            RuntimeAction::ShowMini => show_mini(&app)?,
            RuntimeAction::HideMini => {
                if let Some(mini) = app.get_webview_window("mini-timer") {
                    mini.hide()
                        .map_err(|_| "Não foi possível ocultar o mini timer.")?;
                }
            }
            RuntimeAction::Quit => app.exit(0),
            RuntimeAction::State => {}
        }
        Ok(RuntimeView {
            supported: true,
            background: state.background.load(Ordering::SeqCst),
            autostart: app
                .autolaunch()
                .is_enabled()
                .map_err(|_| "Não foi possível consultar o início automático.")?,
            mini_visible: app
                .get_webview_window("mini-timer")
                .is_some_and(|w| w.is_visible().unwrap_or(false)),
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, state, action, enabled);
        Ok(RuntimeView {
            supported: false,
            background: false,
            autostart: false,
            mini_visible: false,
        })
    }
}
#[tauri::command]
pub fn desktop_mini(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    state: tauri::State<'_, DesktopRuntime>,
    action: MiniAction,
) -> Result<TimerView, String> {
    trusted(&window, "mini-timer")?;
    match action {
        MiniAction::State => {}
        MiniAction::Hide => window
            .hide()
            .map_err(|_| "Não foi possível ocultar o mini timer.")?,
        MiniAction::OpenMain => super::show_main_window(&app),
        MiniAction::Drag => window
            .start_dragging()
            .map_err(|_| "Não foi possível mover o mini timer.")?,
        MiniAction::Pause | MiniAction::Resume | MiniAction::Stop => {
            let current = view(&state)?;
            if !current.can_control
                || current.busy
                || (matches!(action, MiniAction::Pause) && current.phase != TimerPhase::Running)
                || (matches!(action, MiniAction::Resume) && current.phase != TimerPhase::Lunch)
                || current.phase == TimerPhase::Idle
            {
                return Err("O timer mudou. Tente novamente.".into());
            }
            *state.error.lock().map_err(|_| "Timer indisponível.")? = None;
            app.emit_to("main", "zulu:mini-action", action)
                .map_err(|_| "Não foi possível controlar o timer.")?;
        }
    }
    view(&state)
}
pub fn setup(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "windows")]
    {
        use tauri::{
            menu::{Menu, MenuItem},
            tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
        };
        let open = MenuItem::with_id(app, "open", "Abrir ZULU", true, None::<&str>)?;
        let mini = MenuItem::with_id(app, "mini", "Mini timer", true, None::<&str>)?;
        let quit = MenuItem::with_id(app, "quit", "Sair do ZULU", true, None::<&str>)?;
        let menu = Menu::with_items(app, &[&open, &mini, &quit])?;
        let mut tray = TrayIconBuilder::with_id("zulu-runtime")
            .tooltip("ZULU")
            .menu(&menu)
            .show_menu_on_left_click(false)
            .on_menu_event(|app, event| match event.id.as_ref() {
                "open" => super::show_main_window(app),
                "mini" => {
                    let _ = show_mini(app);
                }
                "quit" => app.exit(0),
                _ => {}
            })
            .on_tray_icon_event(|tray, event| {
                if matches!(
                    event,
                    TrayIconEvent::DoubleClick {
                        button: MouseButton::Left,
                        ..
                    }
                ) {
                    super::show_main_window(tray.app_handle());
                }
            });
        if let Some(icon) = app.default_window_icon() {
            tray = tray.icon(icon.clone());
        }
        tray.build(app)?;
        app.state::<DesktopRuntime>()
            .background
            .store(true, Ordering::SeqCst);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    #[test]
    fn running_advances_while_lunch_freezes() {
        let state = DesktopRuntime::default();
        {
            let mut timer = state.timer.lock().unwrap();
            timer.input.phase = TimerPhase::Running;
            timer.input.elapsed_seconds = 120;
            timer.received = Instant::now() - Duration::from_secs(30);
        }
        assert!((150..=151).contains(&view(&state).unwrap().elapsed_seconds));
        state.timer.lock().unwrap().input.phase = TimerPhase::Lunch;
        assert_eq!(view(&state).unwrap().elapsed_seconds, 120);
        assert!(!view(&state).unwrap().can_control);
    }
}
