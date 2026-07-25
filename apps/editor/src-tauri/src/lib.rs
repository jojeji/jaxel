mod io;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::ipc::InvokeError;
use tauri::{Emitter, Manager};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct FileContent {
    content: String,
    encoding: String,
    mtime_ms: u64,
    size: u64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct FileStatResult {
    mtime_ms: u64,
    size: u64,
}

impl From<io::FileStat> for FileStatResult {
    fn from(stat: io::FileStat) -> Self {
        FileStatResult {
            mtime_ms: stat.mtime_ms,
            size: stat.size,
        }
    }
}

/// File paths waiting to be opened by the frontend: passed on the command line at startup
/// (`jaxel some.xml`, "Öffnen mit" file association), or queued by the single-instance
/// callback when a second launch forwards its arguments. Held here rather than emitted as
/// an event immediately, because the frontend's event listener may not be attached yet when
/// the app starts — the frontend pulls via `take_pending_open_paths` (once after mount, and
/// again whenever the `jaxel://pending-open-paths` event pings it).
struct PendingOpenPaths(Mutex<Vec<String>>);

#[tauri::command]
fn take_pending_open_paths(state: tauri::State<PendingOpenPaths>) -> Vec<String> {
    std::mem::take(&mut *state.0.lock().unwrap_or_else(std::sync::PoisonError::into_inner))
}

/// Logs `error` (with `command`/`path` for context) and converts it into an `InvokeError` for
/// the frontend — shared by the three plain file-I/O commands, which all just pass an `io::*`
/// error straight through after logging it.
fn log_io_error(command: &str, path: &str, error: String) -> InvokeError {
    log::error!("{command} fehlgeschlagen ({path}): {error}");
    InvokeError::from(error)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<FileContent, InvokeError> {
    io::read_text_file(&PathBuf::from(&path))
        .map(|decoded| FileContent {
            content: decoded.content,
            encoding: decoded.encoding,
            mtime_ms: decoded.stat.mtime_ms,
            size: decoded.stat.size,
        })
        .map_err(|error| log_io_error("read_text_file", &path, error))
}

#[tauri::command]
fn write_text_file(path: String, content: String, encoding: String) -> Result<FileStatResult, InvokeError> {
    io::write_text_file(&PathBuf::from(&path), &content, &encoding)
        .map(FileStatResult::from)
        .map_err(|error| log_io_error("write_text_file", &path, error))
}

#[tauri::command]
fn stat_file(path: String) -> Result<FileStatResult, InvokeError> {
    io::stat_file(&PathBuf::from(&path))
        .map(FileStatResult::from)
        .map_err(|error| log_io_error("stat_file", &path, error))
}

/// Base64-Decode-Ansicht (docs/entscheidungen.md 2026-07-18): writes decoded binary content
/// to a temp file and hands it to the OS default application (PDF viewer, image viewer, …).
/// The frontend sends base64 (not raw bytes) because invoke serializes arguments as JSON.
/// Returns the temp file path for the status line.
#[tauri::command]
fn open_decoded_file(data_base64: String, extension: String) -> Result<String, InvokeError> {
    use base64::Engine;

    let compact: String = data_base64.chars().filter(|c| !c.is_whitespace()).collect();
    let bytes = base64::engine::general_purpose::STANDARD.decode(compact).map_err(|e| {
        log::error!("open_decoded_file: ungültiges Base64: {e}");
        InvokeError::from(format!("Ungültiges Base64: {e}"))
    })?;

    // Extension comes from our own magic-byte sniffing, but sanitize anyway.
    let safe_ext: String = extension.chars().filter(|c| c.is_ascii_alphanumeric()).take(5).collect();
    let safe_ext = if safe_ext.is_empty() { "bin".to_string() } else { safe_ext };
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let path = std::env::temp_dir().join(format!("jaxel-decoded-{stamp}.{safe_ext}"));

    std::fs::write(&path, bytes).map_err(|e| {
        log::error!("open_decoded_file: Temp-Datei fehlgeschlagen ({}): {e}", path.display());
        InvokeError::from(format!("Temp-Datei fehlgeschlagen: {e}"))
    })?;
    open::that_detached(&path).map_err(|e| {
        log::error!("open_decoded_file: Öffnen fehlgeschlagen ({}): {e}", path.display());
        InvokeError::from(format!("Öffnen fehlgeschlagen: {e}"))
    })?;
    Ok(path.to_string_lossy().into_owned())
}

/// "Logdatei öffnen" im Über-Dialog: opens the log file written by tauri-plugin-log's
/// LogDir target (default file name = app name) in the OS default application; falls back
/// to opening the log directory if the file does not exist yet.
#[tauri::command]
fn open_log(app: tauri::AppHandle) -> Result<String, InvokeError> {
    let dir = app.path().app_log_dir().map_err(|e| {
        log::error!("open_log: Log-Verzeichnis unbekannt: {e}");
        InvokeError::from(format!("Log-Verzeichnis unbekannt: {e}"))
    })?;
    let file = dir.join(format!("{}.log", app.package_info().name));
    let target = if file.is_file() { file } else { dir };
    open::that_detached(&target).map_err(|e| {
        log::error!("open_log: Öffnen fehlgeschlagen ({}): {e}", target.display());
        InvokeError::from(format!("Öffnen fehlgeschlagen: {e}"))
    })?;
    Ok(target.to_string_lossy().into_owned())
}

/// Einzige Logging-Brücke des Frontends (AP15) — Level auf eine kleine Menge beschränkt,
/// unbekannte Level fallen auf `error` zurück.
#[tauri::command]
fn log_frontend(level: String, message: String) {
    match level.as_str() {
        "info" => log::info!("{message}"),
        "warn" => log::warn!("{message}"),
        _ => log::error!("{message}"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Vor dem Tauri-Builder registriert, damit auch frühe Panics erfasst werden (Einträge vor
    // Plugin-Init landen ggf. nur auf Stdout — akzeptiert, siehe .scratch/ap15-crash-logging/spec.md).
    let previous_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        log::error!("Panic: {info}\n{}", std::backtrace::Backtrace::force_capture());
        previous_hook(info);
    }));

    let startup_paths: Vec<String> = std::env::args()
        .skip(1)
        .filter(|arg| PathBuf::from(arg).is_file())
        .collect();

    tauri::Builder::default()
        // single-instance as the FIRST plugin (per its docs): a second launch must be caught
        // before anything else initializes in the doomed second process. Its file arguments
        // are queued for the running instance ("Öffnen mit" while Jaxel is already open) and
        // the frontend is pinged to pull them; relative paths are resolved against the SECOND
        // instance's cwd, which is generally not our own.
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let mut paths: Vec<String> = args
                .iter()
                .skip(1)
                .map(|arg| {
                    let path = PathBuf::from(arg);
                    if path.is_absolute() { path } else { PathBuf::from(&cwd).join(path) }
                })
                .filter(|path| path.is_file())
                .map(|path| path.to_string_lossy().into_owned())
                .collect();
            if !paths.is_empty() {
                log::info!("Zweite Instanz: {} Pfad(e) weitergereicht: {paths:?}", paths.len());
                let state = app.state::<PendingOpenPaths>();
                state
                    .0
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .append(&mut paths);
                let _ = app.emit("jaxel://pending-open-paths", ());
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(
            // Default-Targets (Stdout + LogDir) und Default-Rotation (KeepOne) passen bereits;
            // nur Maximalgröße (Default 40 KB) und Level (Default Trace) werden angehoben bzw.
            // eingeschränkt. rotation_strategy explizit gesetzt, um die Größenbegrenzung (Story
            // 10) nicht stillschweigend von einem Library-Default abhängig zu machen.
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .max_file_size(5_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            stat_file,
            take_pending_open_paths,
            open_decoded_file,
            open_log,
            log_frontend
        ])
        .setup(move |app| {
            app.manage(PendingOpenPaths(Mutex::new(startup_paths)));
            log::info!(
                "Jaxel {} gestartet ({} {})",
                app.package_info().version,
                std::env::consts::OS,
                std::env::consts::ARCH
            );
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Jaxel");
}
