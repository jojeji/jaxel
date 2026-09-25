mod io;

use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::ipc::InvokeError;
use tauri::{Emitter, Manager, UserAttentionType};

/// The published portable ZIP contains `jaxel-portable.exe`. Its directory is
/// also the WebView data directory in portable mode.
fn portable_data_directory(executable: &Path) -> Option<PathBuf> {
    let parent = executable.parent()?;
    let file_name = executable.file_name()?.to_str()?.to_ascii_lowercase();
    file_name
        .ends_with("-portable.exe")
        .then(|| parent.to_path_buf())
}

fn portable_directory_is_writable(directory: &Path) -> bool {
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    let probe = directory.join(format!(".jaxel-write-test-{}-{stamp}", std::process::id()));
    let result = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&probe)
        .and_then(|mut file| file.write_all(b"jaxel"));
    let writable = result.is_ok();
    let _ = std::fs::remove_file(probe);
    writable
}

#[derive(Clone)]
struct PortableStorage {
    data_directory: Option<PathBuf>,
    warning_path: Option<String>,
}

fn resolve_portable_storage() -> PortableStorage {
    let detected_directory = std::env::current_exe()
        .ok()
        .and_then(|path| portable_data_directory(&path));
    match detected_directory {
        Some(directory) if portable_directory_is_writable(&directory) => PortableStorage {
            data_directory: Some(directory),
            warning_path: None,
        },
        Some(directory) => PortableStorage {
            data_directory: None,
            warning_path: Some(directory.to_string_lossy().into_owned()),
        },
        None => PortableStorage {
            data_directory: None,
            warning_path: None,
        },
    }
}

#[tauri::command]
fn portable_storage_warning(storage: tauri::State<PortableStorage>) -> Option<String> {
    storage.warning_path.clone()
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct FileContent {
    content: String,
    encoding: String,
    bom: bool,
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

/// Makes the main window visible and asks the window manager to activate it. If the immediate
/// focus request is not reflected synchronously, request a non-intrusive attention hint instead
/// of using Always-on-top (which would change the user's window preference).
fn bring_main_window_to_front(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        if !window.is_focused().unwrap_or(false) {
            let _ = window.request_user_attention(Some(UserAttentionType::Informational));
        }
    }
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
            bom: decoded.bom,
            mtime_ms: decoded.stat.mtime_ms,
            size: decoded.stat.size,
        })
        .map_err(|error| log_io_error("read_text_file", &path, error))
}

#[tauri::command]
fn write_text_file(
    path: String,
    content: String,
    encoding: String,
    bom: Option<bool>,
) -> Result<FileStatResult, InvokeError> {
    io::write_text_file(&PathBuf::from(&path), &content, &encoding, bom.unwrap_or(false))
        .map(FileStatResult::from)
        .map_err(|error| log_io_error("write_text_file", &path, error))
}

#[tauri::command]
fn stat_file(path: String) -> Result<FileStatResult, InvokeError> {
    io::stat_file(&PathBuf::from(&path))
        .map(FileStatResult::from)
        .map_err(|error| log_io_error("stat_file", &path, error))
}

// User-facing errors of the commands below are reported as "<i18n key>|<detail>" rather than a
// finished (German) sentence: the frontend translates the key (errors.ts, hostErrorMessage), so
// the message appears in the user's language (CLAUDE.md invariant #7).
#[tauri::command]
fn open_parent_folder(path: String) -> Result<String, InvokeError> {
    let file = PathBuf::from(&path);
    let parent = file.parent().ok_or_else(|| InvokeError::from("error.noParentFolder|"))?;
    #[cfg(target_os = "windows")]
    let result = std::process::Command::new("explorer").arg(format!("/select,{}", file.display())).spawn().map(|_| ());
    #[cfg(target_os = "macos")]
    let result = std::process::Command::new("open").args(["-R", &path]).spawn().map(|_| ());
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let result = open::that_detached(parent);
    result.map_err(|error| {
        log::error!("open_parent_folder fehlgeschlagen ({}): {error}", parent.display());
        InvokeError::from(format!("error.openFolderFailed|{error}"))
    })?;
    Ok(parent.to_string_lossy().into_owned())
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
        InvokeError::from(format!("error.invalidBase64|{e}"))
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
        InvokeError::from(format!("error.tempFileFailed|{e}"))
    })?;
    open::that_detached(&path).map_err(|e| {
        log::error!("open_decoded_file: Öffnen fehlgeschlagen ({}): {e}", path.display());
        InvokeError::from(format!("error.openFailed|{e}"))
    })?;
    Ok(path.to_string_lossy().into_owned())
}

/// "Logdatei öffnen" im Über-Dialog: opens the log file written by tauri-plugin-log's
/// LogDir target (default file name = app name) in the OS default application; falls back
/// to opening the log directory if the file does not exist yet.
#[tauri::command]
fn open_log(
    app: tauri::AppHandle,
    storage: tauri::State<PortableStorage>,
) -> Result<String, InvokeError> {
    let dir = if let Some(portable_directory) = &storage.data_directory {
        portable_directory.clone()
    } else {
        app.path().app_log_dir().map_err(|e| {
            log::error!("open_log: Log-Verzeichnis unbekannt: {e}");
            InvokeError::from(format!("error.logDirUnknown|{e}"))
        })?
    };
    // tauri-plugin-log normally uses the package name, while older portable builds and
    // existing installations may have a title-cased `Jaxel.log`. Resolve both spellings so
    // Windows portable upgrades do not silently fall back to opening the directory.
    let candidates = [
        dir.join(format!("{}.log", app.package_info().name)),
        dir.join("Jaxel.log"),
        dir.join("jaxel.log"),
    ];
    let target = candidates
        .into_iter()
        .find(|candidate| candidate.is_file())
        .or_else(|| {
            // Portable builds can carry a log written by a differently named package. If no
            // known name matched, use the only/first `.log` file in the application log folder.
            std::fs::read_dir(&dir).ok()?.filter_map(Result::ok).map(|entry| entry.path()).find(|path| {
                path.is_file()
                    && path
                        .extension()
                        .and_then(|extension| extension.to_str())
                        .is_some_and(|extension| extension.eq_ignore_ascii_case("log"))
            })
        })
        .unwrap_or(dir);
    open::that_detached(&target).map_err(|e| {
        log::error!("open_log: Öffnen fehlgeschlagen ({}): {e}", target.display());
        InvokeError::from(format!("error.openFailed|{}: {e}", target.display()))
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
    let activate_on_start = !startup_paths.is_empty();
    let portable_storage = resolve_portable_storage();
    let portable_directory = portable_storage.data_directory.clone();
    let portable_log_directory = portable_directory.clone();

    let mut log_builder = tauri_plugin_log::Builder::new()
        .level(log::LevelFilter::Info)
        .max_file_size(5_000_000)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne);
    if let Some(path) = portable_log_directory {
        log_builder = log_builder.targets([
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder {
                path,
                file_name: None,
            }),
        ]);
    }

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
            let has_valid_paths = !paths.is_empty();
            if has_valid_paths {
                log::info!("Zweite Instanz: {} Pfad(e) weitergereicht: {paths:?}", paths.len());
                let state = app.state::<PendingOpenPaths>();
                state
                    .0
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .append(&mut paths);
                let _ = app.emit("jaxel://pending-open-paths", ());
            }
            if has_valid_paths { bring_main_window_to_front(&app); }
        }))
        .plugin(
            // Default-Targets (Stdout + LogDir) und Default-Rotation (KeepOne) passen bereits;
            // nur Maximalgröße (Default 40 KB) und Level (Default Trace) werden angehoben bzw.
            // eingeschränkt. rotation_strategy explizit gesetzt, um die Größenbegrenzung (Story
            // 10) nicht stillschweigend von einem Library-Default abhängig zu machen.
            log_builder.build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            stat_file,
            open_parent_folder,
            take_pending_open_paths,
            open_decoded_file,
            open_log,
            log_frontend,
            portable_storage_warning
        ])
        .setup(move |app| {
            app.manage(portable_storage);
            app.manage(PendingOpenPaths(Mutex::new(startup_paths)));
            let window_config = app
                .config()
                .app
                .windows
                .first()
                .ok_or(tauri::Error::WindowNotFound)?;
            let mut window = tauri::WebviewWindowBuilder::from_config(app.handle(), window_config)?;
            if let Some(data_directory) = portable_directory {
                window = window.data_directory(data_directory);
            }
            window.build()?;
            log::info!(
                "Jaxel {} gestartet ({} {})",
                app.package_info().version,
                std::env::consts::OS,
                std::env::consts::ARCH
            );
            if activate_on_start { bring_main_window_to_front(app.handle()); }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Jaxel");
}

#[cfg(test)]
mod tests {
    use super::portable_data_directory;
    use std::fs;
    use std::path::{Path, PathBuf};

    #[test]
    fn detects_published_portable_executable_by_name() {
        assert_eq!(
            portable_data_directory(Path::new("tools/Jaxel_0.8.0_x64-portable.exe")),
            Some(PathBuf::from("tools")),
        );
    }

    #[test]
    fn marker_file_does_not_activate_portable_mode() {
        let root = std::env::temp_dir().join(format!(
            "jaxel-marker-test-{}",
            std::process::id(),
        ));
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("jaxel.portable"), "portable").unwrap();

        assert_eq!(
            portable_data_directory(&root.join("jaxel.exe")),
            None::<PathBuf>,
        );
        fs::remove_dir_all(root).unwrap();
    }
}
