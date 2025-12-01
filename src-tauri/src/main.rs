#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::{Manager, WebviewUrl};
use uuid::Uuid;

// WebKit check function for Linux - Version agnostic
#[cfg(target_os = "linux")]
fn check_webkit_available() -> bool {
    use std::process::Command;
    
    // Method 1: Use pkg-config to check ANY webkit2gtk version
    // Try generic name first, then common version patterns
    let version_patterns = ["webkit2gtk", "webkit2gtk-4", "webkit2gtk-4.0", "webkit2gtk-4.1", "webkit2gtk-5"];
    
    for pattern in &version_patterns {
        if Command::new("pkg-config")
            .args(["--exists", pattern])
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
        {
            return true;
        }
    }
    
    // Method 2: Find ANY libwebkit2gtk*.so* file
    if let Ok(output) = Command::new("sh")
        .args(["-c", "find /usr/lib /usr/lib64 -name 'libwebkit2gtk*.so*' 2>/dev/null | head -1"])
        .output()
    {
        if !output.stdout.is_empty() {
            return true;
        }
    }
    
    // Method 3: Check ldconfig cache for webkit
    if let Ok(output) = Command::new("ldconfig")
        .args(["-p"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.contains("webkit") {
            return true;
        }
    }
    
    false
}

#[cfg(not(target_os = "linux"))]
fn check_webkit_available() -> bool {
    true // Windows/macOS have built-in webviews
}

#[tauri::command]
async fn open_website_window(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let display_title = url.replace("https://", "").replace("http://", "");
    let window_id = format!("website-window-{}", Uuid::new_v4());

    // Hide the main window - using get_webview_window
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.hide();
    }

    // Parse URL (simpler approach)
    let parsed_url = url.parse().map_err(|e| format!("Invalid URL: {}", e))?;
    
    // Build the new window (Tauri 2.x API)
    let builder = tauri::WebviewWindowBuilder::new(
        &app,
        &window_id,
        WebviewUrl::External(parsed_url),
    )
    .title(&display_title)
    .inner_size(1000.0, 700.0)
    .resizable(true)
    .visible(true)
    .decorations(true);

    match builder.build() {
        Ok(new_window) => {
            let app_handle = app.clone();
            
            // Listen for window events
            new_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    if let Some(main_window) = app_handle.get_webview_window("main") {
                        let _ = main_window.show();
                    }
                }
            });
            
            Ok(())
        }
        Err(e) => Err(format!("Window creation failed: {}", e)),
    }
}

fn main() {
    // Check for WebKitGTK on Linux
    #[cfg(target_os = "linux")]
    {
        if !check_webkit_available() {
            eprintln!("ERROR: WebKitGTK not found!");
            eprintln!("This application requires WebKitGTK to display web content.");
            eprintln!("");
            eprintln!("Please install with one of these commands:");
            eprintln!("");
            eprintln!("  Ubuntu/Debian:");
            eprintln!("    sudo apt install libwebkit2gtk-4.0-37");
            eprintln!("");
            eprintln!("  Fedora/RHEL:");
            eprintln!("    sudo dnf install webkit2gtk4.0");
            eprintln!("");
            eprintln!("  Arch Linux:");
            eprintln!("    sudo pacman -S webkit2gtk");
            eprintln!("");
            eprintln!("Note: Version 4.1 or newer also works!");
            std::process::exit(1);
        } else {
            // Optional: Print debug info
            if std::env::var("DEBUG_WEBKIT").is_ok() {
                println!("✅ WebKitGTK check passed - application can proceed");
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_website_window])
        .setup(|app| {
            // Use get_webview_window instead of get_window
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.set_title("Jira Desktop Unofficial")?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}