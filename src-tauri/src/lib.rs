use std::{fs, path::Path};

use tauri::{
    menu::MenuBuilder,
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri::webview::Color;

const TRAY_ICON: tauri::image::Image<'_> = tauri::include_image!("./icons/32x32.png");

fn has_app_state(path: &Path) -> bool {
    fs::read_to_string(path)
        .ok()
        .and_then(|content| serde_json::from_str::<serde_json::Value>(&content).ok())
        .and_then(|json| json.get("appState").cloned())
        .is_some()
}

#[tauri::command]
fn migrate_legacy_store(app: AppHandle) -> Result<bool, String> {
    let current_app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data directory: {error}"))?;

    let new_store_path = current_app_data_dir.join("perch-tasks.json");

    if has_app_state(&new_store_path) {
        return Ok(false);
    }

    let roaming_data_dir = current_app_data_dir
        .parent()
        .ok_or_else(|| "failed to resolve roaming app data directory".to_string())?;

    let legacy_store_path = roaming_data_dir
        .join("com.stickytodo.app")
        .join("sticky-todo.json");

    if !legacy_store_path.is_file() || !has_app_state(&legacy_store_path) {
        return Ok(false);
    }

    fs::create_dir_all(&current_app_data_dir)
        .map_err(|error| format!("failed to create app data directory: {error}"))?;

    fs::copy(&legacy_store_path, &new_store_path)
        .map_err(|error| format!("failed to migrate legacy store: {error}"))?;

    Ok(true)
}

fn toggle_main_window<R: tauri::Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        match window.is_visible() {
            Ok(true) => {
                let _ = window.hide();
            }
            Ok(false) => {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            Err(error) => {
                eprintln!("[tray] failed to query window visibility: {error}");
            }
        }
    }
}

fn setup_tray<R: tauri::Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .text("show-hide", "Show / Hide")
        .text("quit", "Exit")
        .build()?;

    TrayIconBuilder::with_id("main-tray")
        .icon(TRAY_ICON.to_owned())
        .tooltip("Perch Tasks")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show-hide" => toggle_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { .. } = event {
                toggle_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![migrate_legacy_store])
        .setup(|app| {
            setup_tray(app.handle())?;

            // Force WebView2 + window background to fully transparent.
            match app.get_webview_window("main") {
                Some(window) => {
                    let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
                }
                None => {
                    eprintln!("[setup] WARNING: 'main' webview window not found!");
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
