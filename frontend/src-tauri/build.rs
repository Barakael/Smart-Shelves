use std::env;
use std::path::Path;
use std::process::Command;
use std::os::unix::fs::PermissionsExt;

fn try_download_php() {
    // If PHP_RUNTIME_URL is set, download and extract into resources/php
    if let Ok(url) = env::var("PHP_RUNTIME_URL") {
        println!("cargo:warning=PHP_RUNTIME_URL provided, attempting to download runtime from: {}", url);
        let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
        let resources_dir = Path::new(&manifest_dir).join("resources").join("php");
        if resources_dir.exists() {
            println!("cargo:warning=resources/php already exists, skipping download");
            return;
        }
        let tmp_tar = Path::new(&manifest_dir).join("php_runtime.tar.gz");

        // Use curl to download
        let status = Command::new("/usr/bin/env")
            .arg("curl")
            .arg("-L")
            .arg(&url)
            .arg("-o")
            .arg(tmp_tar.to_str().unwrap())
            .status();

        match status {
            Ok(s) if s.success() => {
                println!("cargo:warning=Downloaded PHP runtime to {:?}", tmp_tar);
                std::fs::create_dir_all(&resources_dir).expect("could not create resources/php dir");
                // Extract using tar
                let tar_status = Command::new("/usr/bin/env")
                    .arg("tar")
                    .arg("-xzf")
                    .arg(tmp_tar.to_str().unwrap())
                    .arg("-C")
                    .arg(resources_dir.to_str().unwrap())
                    .arg("--strip-components=1")
                    .status();
                match tar_status {
                    Ok(t) if t.success() => {
                        println!("cargo:warning=Extracted PHP runtime into resources/php");
                        // Ensure the PHP binary is executable after extraction
                        let php_bin = resources_dir.join("bin").join("php");
                        if php_bin.exists() {
                            let _ = std::fs::set_permissions(&php_bin, std::fs::Permissions::from_mode(0o755));
                            println!("cargo:warning=Set executable permission on {:?}", php_bin);
                        }

                        // Also ensure bundled server scripts are executable if present
                        let server_dir = Path::new(&manifest_dir).join("resources").join("php-server");
                        if server_dir.exists() {
                            if let Ok(entries) = std::fs::read_dir(&server_dir) {
                                for entry in entries.flatten() {
                                    let p = entry.path();
                                    if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                                        if name.ends_with(".sh") {
                                            let _ = std::fs::set_permissions(&p, std::fs::Permissions::from_mode(0o755));
                                            println!("cargo:warning=Set executable permission on {:?}", p);
                                        }
                                    }
                                }
                            }
                        }

                        let _ = std::fs::remove_file(tmp_tar);
                    }
                    Ok(_) | Err(_) => {
                        println!("cargo:warning=Failed to extract PHP runtime - please extract manually into resources/php");
                    }
                }
            }
            Ok(_) | Err(_) => {
                println!("cargo:warning=Failed to download PHP runtime with curl - please provide a local resources/php folder or ensure curl is available");
            }
        }
    } else {
        println!("cargo:warning=No PHP_RUNTIME_URL set. If you want to bundle PHP, set PHP_RUNTIME_URL before building or place a runtime into resources/php/");
    }
}

fn main() {
    try_download_php();
    tauri_build::build()
}

