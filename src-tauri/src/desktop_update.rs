use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgress {
    phase: &'static str,
    downloaded: u64,
    total: Option<u64>,
}

#[derive(Serialize)]
pub struct AvailableUpdate {
    version: String,
}

#[tauri::command]
pub fn desktop_updater_supported() -> bool {
    cfg!(all(target_os = "windows", target_arch = "x86_64"))
}

#[cfg(target_os = "windows")]
fn updater(app: &tauri::AppHandle) -> Result<tauri_plugin_updater::Updater, String> {
    use tauri_plugin_updater::UpdaterExt;
    app.updater_builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|_| "Não foi possível iniciar o atualizador.".to_string())
}

#[cfg(target_os = "windows")]
fn official_package(update: &tauri_plugin_updater::Update) -> bool {
    let version = &update.version;
    update.download_url.as_str()
        == format!("https://github.com/yeMorGx/Hub/releases/download/desktop-v{version}/Hub_{version}_x64-setup.exe")
}

#[tauri::command]
pub async fn check_desktop_update(
    app: tauri::AppHandle,
) -> Result<Option<AvailableUpdate>, String> {
    #[cfg(target_os = "windows")]
    {
        if !desktop_updater_supported() {
            return Ok(None);
        }
        let update = updater(&app)?
            .check()
            .await
            .map_err(|_| "Não foi possível verificar atualizações.".to_string())?;
        match update {
            Some(update) if official_package(&update) => Ok(Some(AvailableUpdate {
                version: update.version,
            })),
            Some(_) => Err("Pacote de atualização não reconhecido.".into()),
            None => Ok(None),
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Ok(None)
    }
}

// The remote page receives only these narrow commands, never the updater plugin's
// arbitrary endpoint, public-key, process or filesystem permissions.
#[tauri::command]
pub async fn install_desktop_update(app: tauri::AppHandle, version: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::sync::atomic::{AtomicBool, Ordering};
        use tauri::Emitter;
        static INSTALLING: AtomicBool = AtomicBool::new(false);
        if !desktop_updater_supported() {
            return Err("Arquitetura não compatível.".into());
        }
        if INSTALLING.swap(true, Ordering::SeqCst) {
            return Err("Uma atualização já está em andamento.".into());
        }
        struct InstallGuard;
        impl Drop for InstallGuard {
            fn drop(&mut self) {
                INSTALLING.store(false, Ordering::SeqCst);
            }
        }
        let _guard = InstallGuard;
        let update = updater(&app)?
            .check()
            .await
            .map_err(|_| "Não foi possível verificar a atualização. Tente novamente.".to_string())?
            .ok_or("A atualização não está mais disponível.")?;
        if update.version != version || !official_package(&update) {
            return Err(
                "A versão disponível mudou. Feche e abra o Hub para verificar novamente.".into(),
            );
        }
        let mut downloaded = 0_u64;
        // download() verifies the package signature before returning any bytes.
        let bytes = update
            .download(
                |chunk, total| {
                    downloaded += chunk as u64;
                    let _ = app.emit(
                        "hub:desktop-update",
                        UpdateProgress {
                            phase: "downloading",
                            downloaded,
                            total,
                        },
                    );
                },
                || {},
            )
            .await
            .map_err(|_| {
                "Não foi possível baixar ou validar o pacote. Nada foi instalado; tente novamente."
                    .to_string()
            })?;
        let _ = app.emit(
            "hub:desktop-update",
            UpdateProgress {
                phase: "installing",
                downloaded: bytes.len() as u64,
                total: Some(bytes.len() as u64),
            },
        );
        // On Windows the official plugin starts NSIS in passive mode with /R,
        // cleans up and exits this process. NSIS installs and reopens the app.
        update
            .install(bytes)
            .map_err(|_| "Não foi possível iniciar a instalação. Tente novamente.".to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, version);
        Err("Atualização automática disponível somente no Windows x64.".into())
    }
}
