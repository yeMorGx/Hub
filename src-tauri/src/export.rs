use serde::Serialize;

const MAX_EXPORT_BYTES: usize = 32 * 1024 * 1024;

fn validate_export(filename: &str, bytes: &[u8]) -> Result<&'static str, String> {
    if filename.len() > 150
        || !filename.starts_with("zulu-")
        || !filename
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"-_.".contains(&b))
        || bytes.is_empty()
        || bytes.len() > MAX_EXPORT_BYTES
    {
        return Err("Arquivo de exportação inválido.".into());
    }
    if filename.ends_with(".pdf") && bytes.starts_with(b"%PDF-") {
        Ok("pdf")
    } else if filename.ends_with(".csv") && std::str::from_utf8(bytes).is_ok() {
        Ok("csv")
    } else {
        Err("Formato de exportação inválido.".into())
    }
}

#[derive(Serialize)]
pub struct ExportResult {
    saved: bool,
}

#[tauri::command]
pub async fn save_report_export(
    window: tauri::WebviewWindow,
    filename: String,
    bytes: Vec<u8>,
) -> Result<ExportResult, String> {
    let url = window.url().map_err(|_| "Janela indisponível.")?;
    if window.label() != "main"
        || url.scheme() != "https"
        || url.host_str() != Some("hub-one-azure.vercel.app")
    {
        return Err("Janela não reconhecida.".into());
    }
    let extension = validate_export(&filename, &bytes)?;
    #[cfg(target_os = "windows")]
    {
        tauri::async_runtime::spawn_blocking(move || {
            // The page never supplies a path. The OS dialog confirms destination/overwrite.
            let path = rfd::FileDialog::new()
                .set_title("Salvar relatório")
                .set_file_name(&filename)
                .add_filter(if extension == "pdf" { "PDF" } else { "CSV" }, &[extension])
                .save_file();
            let Some(path) = path else {
                return Ok(ExportResult { saved: false });
            };
            std::fs::write(path, bytes).map_err(|_| {
                "Não foi possível salvar. Confira a pasta e tente novamente.".to_string()
            })?;
            Ok(ExportResult { saved: true })
        })
        .await
        .map_err(|_| "Não foi possível abrir a janela de salvar.".to_string())?
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = extension;
        Err("Exportação nativa disponível no Windows.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_valid_named_pdf_and_csv_exports() {
        assert_eq!(
            validate_export("zulu-horas-2026-10.pdf", b"%PDF-1.4"),
            Ok("pdf")
        );
        assert_eq!(
            validate_export("zulu-horas.csv", b"Pessoa;Horas\r\n"),
            Ok("csv")
        );
        for name in [
            "../zulu-horas.pdf",
            "C:\\zulu-horas.pdf",
            "zulu-app.exe",
            "horas.pdf",
        ] {
            assert!(validate_export(name, b"%PDF-1.4").is_err());
        }
        assert!(validate_export("zulu-horas.pdf", b"not a PDF").is_err());
        assert!(validate_export("zulu-horas.csv", &[255]).is_err());
        assert!(validate_export("zulu-horas.csv", &[]).is_err());
        assert!(validate_export("zulu-horas.csv", &vec![0; MAX_EXPORT_BYTES + 1]).is_err());
    }
}
