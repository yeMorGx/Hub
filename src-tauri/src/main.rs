#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{Emitter,Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt,ShortcutState};
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(|app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.emit("hub-toggle-timer", ());
                }
            }
        }).build())
        .setup(|app| {
            app.global_shortcut().register("CommandOrControl+Shift+H")?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Não foi possível iniciar o Hub desktop.");
}
