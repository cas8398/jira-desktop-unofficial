#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{AppHandle, Manager, WebviewWindowBuilder, WindowEvent};
use tauri_utils::config::WebviewUrl;

#[tauri::command]
fn open_website_window(app: AppHandle, url: String) {
    let display_title = url.replace("https://", "").replace("http://", "");

    // Hide the main window
    if let Some(main_window) = app.get_window("main") {
        main_window.hide().unwrap();
    }

    // Open the new window
    let new_window = WebviewWindowBuilder::new(
        &app,
        "website-window",
        WebviewUrl::External(url.parse().unwrap()),
    )
    .title(&display_title)
    .inner_size(1000.0_f64, 700.0_f64)
    .build()
    .expect("failed to build new window");

    // Listen for the new window's close event
    let app_handle = app.clone();
    new_window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { .. } = event {
            if let Some(main_window) = app_handle.get_window("main") {
                main_window.show().unwrap();
            }
        }
    });
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
