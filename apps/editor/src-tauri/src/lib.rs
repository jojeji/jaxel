mod io;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::ipc::InvokeError;
use tauri::Manager;

#[derive(serde::Serialize)]
struct FileContent {
    content: String,
    encoding: String,
}

/// File paths passed on the command line (e.g. `jaxel some.xml`, or a future "open with"
/// file association) at startup. Held here rather than emitted as an event immediately,
/// because the frontend's event listener may not be attached yet when the app starts —
/// the frontend pulls these once via `take_pending_open_paths` after it has mounted.
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
        })
        .map_err(InvokeError::from)
}

#[tauri::command]
fn write_text_file(path: String, content: String, encoding: String) -> Result<(), InvokeError> {
    io::write_text_file(&PathBuf::from(path), &content, &encoding).map_err(InvokeError::from)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_paths: Vec<String> = std::env::args()
        .skip(1)
        .filter(|arg| PathBuf::from(arg).is_file())
        .collect();

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            take_pending_open_paths
        ])
        .setup(move |app| {
            app.manage(PendingOpenPaths(Mutex::new(startup_paths)));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Jaxel");
}
