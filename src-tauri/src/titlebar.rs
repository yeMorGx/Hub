use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TitlebarAction {
    State,
    Enable,
    Restore,
    Minimize,
    ToggleMaximize,
    Close,
    Drag,
}

#[derive(Serialize)]
pub struct TitlebarState {
    supported: bool,
    maximized: bool,
}

// A fixed set of window controls, scoped to this webview's own main window.
#[tauri::command]
pub fn desktop_titlebar(
    window: tauri::WebviewWindow,
    action: TitlebarAction,
) -> Result<TitlebarState, String> {
    if window.label() != "main" {
        return Err("Janela não reconhecida.".into());
    }
    #[cfg(target_os = "windows")]
    {
        let result = match action {
            TitlebarAction::State => Ok(()),
            TitlebarAction::Enable => window.set_decorations(false),
            TitlebarAction::Restore => window.set_decorations(true),
            TitlebarAction::Minimize => window.minimize(),
            TitlebarAction::ToggleMaximize => {
                if window.is_maximized().unwrap_or(false) {
                    window.unmaximize()
                } else {
                    window.maximize()
                }
            }
            TitlebarAction::Close => window.close(),
            TitlebarAction::Drag => window.start_dragging(),
        };
        result.map_err(|_| "Não foi possível controlar a janela.".to_string())?;
        Ok(TitlebarState {
            supported: true,
            maximized: window.is_maximized().unwrap_or(false),
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = action;
        Ok(TitlebarState {
            supported: false,
            maximized: false,
        })
    }
}
