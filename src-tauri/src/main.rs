#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
mod native_screen_share;
mod desktop_update;

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
    if parts.len() != 3 || parts.iter().any(|p| p.is_empty() || p.len() > 6 || !p.bytes().all(|b| b.is_ascii_digit())) {
        return Err("Versão inválida.".into());
    }
    #[cfg(target_os = "windows")]
    {
        let url = format!("https://github.com/yeMorGx/Hub/releases/download/desktop-v{0}/Hub_{0}_x64-setup.exe", version);
        std::process::Command::new("explorer.exe").arg(url).spawn()
            .map_err(|_| "Não foi possível abrir o navegador.".to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    Err("Atualização disponível somente no Windows.".into())
}

fn main() {
    let builder = tauri::Builder::default();
    #[cfg(target_os = "windows")]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    builder
        .manage(native_screen_share::NativeShareState::default())
        .invoke_handler(tauri::generate_handler![
            open_desktop_update,
            desktop_update::desktop_updater_supported,
            desktop_update::check_desktop_update,
            desktop_update::install_desktop_update,
            native_screen_share::list_native_screen_sources,
            native_screen_share::preview_native_screen_source,
            native_screen_share::start_native_screen_share,
            native_screen_share::stop_native_screen_share
        ])
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
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
        .setup(|app| {
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
