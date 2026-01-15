// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct PhpServer(Mutex<Option<Child>>);

use std::{thread, time};
use std::net::TcpStream;
use tauri::api::dialog;

fn start_php_server(resource_path: &std::path::Path) -> Result<Child, String> {
    let php_server_path = resource_path.join("resources").join("php-server");
    println!("📂 PHP server path: {:?}", php_server_path);

    #[cfg(target_os = "windows")]
    let startup_script = php_server_path.join("start-server.bat");
    #[cfg(not(target_os = "windows"))]
    let startup_script = php_server_path.join("start-server.sh");
    println!("🚀 Starting PHP server from: {:?}", startup_script);

    let mut last_err = None;
    for attempt in 1..=5 {
        #[cfg(target_os = "windows")]
        let child_result = Command::new("cmd")
            .args(&["/C", startup_script.to_str().unwrap()])
            .current_dir(&php_server_path)
            .spawn();
        #[cfg(not(target_os = "windows"))]
        let child_result = Command::new("bash")
            .arg(&startup_script)
            .current_dir(&php_server_path)
            .spawn();

        match child_result {
            Ok(mut child) => {
                // Wait for port 8765 to be open
                let mut ready = false;
                for _ in 0..10 {
                    if TcpStream::connect("127.0.0.1:8765").is_ok() {
                        ready = true;
                        break;
                    }
                    thread::sleep(time::Duration::from_millis(300));
                }
                if ready {
                    println!("✅ PHP server started with PID: {}", child.id());
                    return Ok(child);
                } else {
                    println!("❌ PHP server process started but port 8765 not open (attempt {attempt})");
                    let _ = child.kill();
                }
            }
            Err(e) => {
                println!("❌ Failed to start PHP server (attempt {attempt}): {e}");
                last_err = Some(e.to_string());
            }
        }
        thread::sleep(time::Duration::from_secs(1));
    }
    Err(last_err.unwrap_or_else(|| "Unknown error".to_string()))
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let resource_path = app.path_resolver()
                .resource_dir()
                .expect("❌ Failed to get resource directory");
            
            println!("📦 Resource directory: {:?}", resource_path);
            
            // Start PHP server with auto-initialization
            match start_php_server(&resource_path) {
                Ok(child) => {
                    println!("✅ PHP backend server started successfully");
                    println!("📊 Server will auto-initialize database on first launch");
                    println!("🌐 API available at: http://127.0.0.1:8765");
                    app.manage(PhpServer(Mutex::new(Some(child))));
                }
                Err(e) => {
                    eprintln!("❌ Failed to start PHP server after multiple attempts: {}", e);
                    dialog::blocking::message(Some(&app.get_window("main").unwrap()), "Backend Startup Error", &format!("The backend server failed to start after several attempts.\n\nError: {}\n\nPlease ensure PHP is installed and port 8765 is free, then restart the app.", e));
                    app.manage(PhpServer(Mutex::new(None)));
                }
            }
            
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::Destroyed = event.event() {
                // Window is closing, cleanup handled in main exit handler
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
                            #[cfg(target_os = "windows")]
                            {
                                let _ = Command::new("taskkill")
                                    .args(&["/PID", &child.id().to_string(), "/F", "/T"])
                                    .spawn();
                            }
                            let _ = child.kill();
                            let _ = child.wait();
                            println!("✅ PHP server stopped");
                        }
                    }
                }
            }
        });
}

