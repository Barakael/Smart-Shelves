// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{Manager, State};

struct PhpServer(Mutex<Option<Child>>);

fn start_php_server(resource_path: &std::path::Path) -> Result<Child, std::io::Error> {
    let php_server_path = resource_path.join("php-server");
    
    #[cfg(target_os = "windows")]
    let startup_script = php_server_path.join("start-server.bat");
    
    #[cfg(not(target_os = "windows"))]
    let startup_script = php_server_path.join("start-server.sh");
    
    println!("Starting PHP server from: {:?}", startup_script);
    
    #[cfg(target_os = "windows")]
    let child = Command::new("cmd")
        .args(&["/C", startup_script.to_str().unwrap()])
        .spawn()?;
    
    #[cfg(not(target_os = "windows"))]
    let child = Command::new("sh")
        .arg(&startup_script)
        .spawn()?;
    
    println!("PHP server started with PID: {}", child.id());
    Ok(child)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let resource_path = app.path_resolver()
                .resource_dir()
                .expect("failed to get resource dir");
            
            // Start PHP server
            match start_php_server(&resource_path) {
                Ok(child) => {
                    println!("✅ PHP backend server started successfully");
                    app.manage(PhpServer(Mutex::new(Some(child))));
                }
                Err(e) => {
                    eprintln!("❌ Failed to start PHP server: {}", e);
                    // Continue anyway - user might be running server manually
                    app.manage(PhpServer(Mutex::new(None)));
                }
            }
            
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::Destroyed = event.event() {
                // Window is closing, we'll handle cleanup in the main exit handler
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                // Cleanup: Kill PHP server process
                if let Some(php_server_state) = app_handle.try_state::<PhpServer>() {
                    if let Ok(mut server) = php_server_state.0.lock() {
                        if let Some(mut child) = server.take() {
                            println!("🛑 Stopping PHP server...");
                            let _ = child.kill();
                            let _ = child.wait();
                            println!("✅ PHP server stopped");
                        }
                    }
                }
            }
        });
}

