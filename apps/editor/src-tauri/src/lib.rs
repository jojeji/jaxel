mod io;

use std::path::PathBuf;
use tauri::ipc::InvokeError;

#[derive(serde::Serialize)]
struct FileContent {
    content: String,
    encoding: String,
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
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .invoke_handler(tauri::generate_handler![read_text_file, write_text_file])
        .run(tauri::generate_context!())
        .expect("error while running Jaxel");
}
