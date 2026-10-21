use base64::{engine::general_purpose::STANDARD, Engine};
use minisign_verify::{PublicKey, Signature};
use std::{env, fs};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() != 3 {
        return Err("Usage: hub-updater-verifier <tauri.conf.json> <installer>".into());
    }
    let config: serde_json::Value = serde_json::from_slice(&fs::read(&args[1])?)?;
    let version = config["version"].as_str().ok_or("Missing app version")?;
    let key = config["plugins"]["updater"]["pubkey"]
        .as_str()
        .ok_or("Missing updater key")?;
    let key = String::from_utf8(STANDARD.decode(key)?)?;
    let key = PublicKey::decode(&key)?;
    let signature = fs::read_to_string(format!("{}.sig", args[2]))?;
    let signature = String::from_utf8(STANDARD.decode(signature.trim())?)?;
    let signature = Signature::decode(&signature)?;
    let bytes = fs::read(&args[2])?;
    key.verify(&bytes, &signature, false)?;
    let signed_version = signature
        .trusted_comment()
        .split('\t')
        .find_map(|part| part.strip_prefix("version:"));
    if signed_version != Some(version) {
        return Err("Updater signature is not bound to this app version".into());
    }
    let mut tampered = bytes;
    if let Some(first) = tampered.first_mut() {
        *first ^= 1;
    } else {
        return Err("Empty installer".into());
    }
    if key.verify(&tampered, &signature, false).is_ok() {
        return Err("Tampered package was accepted".into());
    }
    println!(
        "PASS: signature matches embedded public key; version bound; tampered package rejected."
    );
    Ok(())
}
