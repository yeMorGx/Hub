#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
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
