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

#[tauri::command]
fn read_text_file(path: String) -> Result<FileContent, InvokeError> {
    io::read_text_file(&PathBuf::from(path))
        .map(|decoded| FileContent {
            content: decoded.content,
            encoding: decoded.encoding,
            mtime_ms: decoded.stat.mtime_ms,
            size: decoded.stat.size,
        })
        .map_err(InvokeError::from)
}

#[tauri::command]
fn write_text_file(path: String, content: String, encoding: String) -> Result<FileStatResult, InvokeError> {
    io::write_text_file(&PathBuf::from(path), &content, &encoding)
        .map(FileStatResult::from)
        .map_err(InvokeError::from)
}

#[tauri::command]
fn stat_file(path: String) -> Result<FileStatResult, InvokeError> {
    io::stat_file(&PathBuf::from(path))
        .map(FileStatResult::from)
        .map_err(InvokeError::from)
}

/// Base64-Decode-Ansicht (docs/entscheidungen.md 2026-07-18): writes decoded binary content
/// to a temp file and hands it to the OS default application (PDF viewer, image viewer, …).
/// The frontend sends base64 (not raw bytes) because invoke serializes arguments as JSON.
/// Returns the temp file path for the status line.
#[tauri::command]
fn open_decoded_file(data_base64: String, extension: String) -> Result<String, InvokeError> {
    use base64::Engine;

    let compact: String = data_base64.chars().filter(|c| !c.is_whitespace()).collect();
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(compact)
        .map_err(|e| InvokeError::from(format!("Ungültiges Base64: {e}")))?;

    // Extension comes from our own magic-byte sniffing, but sanitize anyway.
    let safe_ext: String = extension.chars().filter(|c| c.is_ascii_alphanumeric()).take(5).collect();
    let safe_ext = if safe_ext.is_empty() { "bin".to_string() } else { safe_ext };
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let path = std::env::temp_dir().join(format!("jaxel-decoded-{stamp}.{safe_ext}"));

    std::fs::write(&path, bytes).map_err(|e| InvokeError::from(format!("Temp-Datei fehlgeschlagen: {e}")))?;
    open::that_detached(&path).map_err(|e| InvokeError::from(format!("Öffnen fehlgeschlagen: {e}")))?;
    Ok(path.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            stat_file,
            take_pending_open_paths,
            open_decoded_file
        ])
        .setup(move |app| {
            app.manage(PendingOpenPaths(Mutex::new(startup_paths)));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Jaxel");
}
