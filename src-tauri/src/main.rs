#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{AppHandle, Manager, WindowEvent};
use tauri_utils::config::WebviewUrl;

#[tauri::command]
async fn open_website_window(app: AppHandle, url: String) -> Result<(), String> {
    use uuid::Uuid;

    let display_title = url.replace("https://", "").replace("http://", "");
    let window_id = format!("website-window-{}", Uuid::new_v4());

    // Hide the main window
    if let Some(main_window) = app.get_window("main") {
        main_window.hide().unwrap_or(());
    }

    // Build the new window
    let new_window = tauri::WebviewWindowBuilder::new(
        &app,
        &window_id,
        WebviewUrl::External(url.parse().unwrap()),
    )
    .title(&display_title)
    .inner_size(1000.0, 700.0)
    .resizable(true)
    .decorations(true)
    .build()
    .map_err(|e| format!("Window creation failed: {}", e))?;

    // Clone app handle for use in the event handler
    let app_handle = app.clone();

    // Attach event listener to restore main window when this new one is closed
    new_window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { .. } = event {
            if let Some(main_window) = app_handle.get_window("main") {
                main_window.show().unwrap_or(());
            }
        }
    });

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_website_window])
        .setup(|app| {
            let main_window = app.get_window("main").unwrap();
            main_window.set_title("Jira Desktop Unofficial")?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}
