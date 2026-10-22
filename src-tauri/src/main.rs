#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
mod desktop_update;
mod native_screen_share;
mod runtime;
mod titlebar;

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn open_desktop_update(version: String) -> Result<(), String> {
    // Only official, stable Windows installers; never accept a caller-supplied URL.
    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() != 3
        || parts
            .iter()
            .any(|p| p.is_empty() || p.len() > 6 || !p.bytes().all(|b| b.is_ascii_digit()))
    {
        return Err("Versão inválida.".into());
    }
    #[cfg(target_os = "windows")]
    {
        let url = format!(
            "https://github.com/yeMorGx/Hub/releases/download/desktop-v{0}/Hub_{0}_x64-setup.exe",
            version
        );
        std::process::Command::new("explorer.exe")
            .arg(url)
            .spawn()
            .map_err(|_| "Não foi possível abrir o navegador.".to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    Err("Atualização disponível somente no Windows.".into())
}

fn main() {
    let builder = tauri::Builder::default();
    #[cfg(target_os = "windows")]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("ZULU")
                .args(["--background"])
                .build(),
        );
    builder
        .manage(native_screen_share::NativeShareState::default())
        .manage(runtime::DesktopRuntime::default())
        .invoke_handler(tauri::generate_handler![
            open_desktop_update,
            runtime::desktop_runtime,
            runtime::desktop_timer_sync,
            runtime::desktop_timer_feedback,
            runtime::desktop_mini,
            titlebar::desktop_titlebar,
            desktop_update::desktop_updater_supported,
            desktop_update::check_desktop_update,
            desktop_update::install_desktop_update,
            native_screen_share::list_native_screen_sources,
            native_screen_share::preview_native_screen_source,
            native_screen_share::start_native_screen_share,
            native_screen_share::stop_native_screen_share
        ])
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if !args.iter().any(|arg| arg == "--background") {
                show_main_window(app);
            }
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        show_main_window(app);
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("hub-toggle-timer", ());
                        }
                    }
                })
                .build(),
        )
        .on_page_load(|webview, payload| {
            #[cfg(target_os = "windows")]
            runtime::smoke_webview_diagnostic(&format!(
                "page-load window={} event={:?} url={}",
                webview.label(),
                payload.event(),
                payload.url()
            ));
            // A failed/offline navigation must still have standard OS controls.
            #[cfg(target_os = "windows")]
            if payload.event() == tauri::webview::PageLoadEvent::Started
                && webview.label() == "main"
            {
                let _ = webview.window().set_decorations(true);
                runtime::clear_timer(webview.app_handle());
                if payload.url().host_str() == Some("hub-one-azure.vercel.app")
                    && payload
                        .url()
                        .query_pairs()
                        .any(|(key, value)| key == "desktop_notification" && value == "1")
                {
                    show_main_window(webview.app_handle());
                }
            }
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "mini-timer"
                    || (window.label() == "main"
                        && window
                            .state::<runtime::DesktopRuntime>()
                            .background
                            .load(std::sync::atomic::Ordering::SeqCst))
                {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            if let Err(error) = runtime::setup(app.handle()) {
                eprintln!("Bandeja indisponível: {error}");
            }
            let background = std::env::args().any(|arg| arg == "--background")
                && app
                    .state::<runtime::DesktopRuntime>()
                    .background
                    .load(std::sync::atomic::Ordering::SeqCst);
            if !background {
                show_main_window(app.handle());
            }
            // A conflicting shortcut must not prevent the app from opening.
            if app
                .global_shortcut()
                .register("CommandOrControl+Shift+H")
                .is_err()
            {
                eprintln!("Atalho Ctrl/Cmd+Shift+H indisponível nesta sessão.");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Não foi possível iniciar o Hub desktop.");
}
