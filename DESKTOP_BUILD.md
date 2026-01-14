# Building Smart Shelves Desktop Application

This guide explains how to build a standalone desktop application that includes the backend server and database.

## Overview

The desktop application bundles:
- **Frontend**: React + Vite application
- **Backend**: PHP Laravel server
- **Database**: SQLite database
- **Auto-start**: Embedded server starts automatically when app launches

## Prerequisites

### Required Software

1. **Node.js & npm** (v18+)
   ```bash
   node --version
   npm --version
   ```

2. **Rust & Cargo** (for Tauri)
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Verify installation
   rustc --version
   cargo --version
   ```

3. **PHP** (v8.1+)
   ```bash
   php --version
   ```

4. **Composer** (PHP package manager)
   ```bash
   composer --version
   ```

### Platform-Specific Requirements

#### macOS
```bash
xcode-select --install
```

#### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

#### Windows
- Install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Install [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

## Build Process

### 1. Prepare the Backend

```bash
# Navigate to backend directory
cd backend

# Install PHP dependencies
composer install --no-dev --optimize-autoloader

# Ensure database exists and run migrations
touch database/database.sqlite
php artisan migrate --force

# Generate application key
php artisan key:generate

# Cache configuration for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

cd ..
```

### 2. Build the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Build the frontend
npm run build

cd ..
```

### 3. Bundle Backend Resources

The bundling script packages the PHP backend for desktop distribution:

```bash
# Make the script executable
chmod +x scripts/bundle-backend.sh

# Run the bundling script
./scripts/bundle-backend.sh
```

This creates `frontend/src-tauri/resources/php-server/` containing:
- PHP application files
- Vendor dependencies
- SQLite database
- Environment configuration
- Startup scripts

### 4. Build Desktop Application

```bash
cd frontend

# Development build (faster, includes dev tools)
npm run tauri dev

# Production build (optimized, distributable)
npm run tauri build
```

## Output Files

After building, find your distributable files:

### macOS
```
frontend/src-tauri/target/release/bundle/dmg/Smart Shelves_1.0.0_x64.dmg
frontend/src-tauri/target/release/bundle/macos/Smart Shelves.app
```

### Windows
```
frontend/src-tauri/target/release/bundle/msi/Smart Shelves_1.0.0_x64.msi
frontend/src-tauri/target/release/Smart Shelves.exe
```

### Linux
```
frontend/src-tauri/target/release/bundle/deb/smart-shelves_1.0.0_amd64.deb
frontend/src-tauri/target/release/bundle/appimage/smart-shelves_1.0.0_amd64.AppImage
```

## How It Works

### Application Startup

1. **Desktop app launches** → Tauri window opens
2. **Rust backend starts** → Launches embedded PHP server on port 8765
3. **Frontend connects** → Detects desktop mode, uses `localhost:8765`
4. **User interacts** → All API calls go to embedded backend

### Application Shutdown

1. **User closes app** → Tauri cleanup triggers
2. **PHP server stops** → Rust kills the PHP process
3. **Database saved** → SQLite writes flushed to disk

### Environment Detection

Frontend automatically detects if running in desktop mode:

```typescript
// In desktop app: returns true
import { isDesktop } from './config/environment';

if (isDesktop()) {
  // Uses localhost:8765 (embedded server)
} else {
  // Uses VITE_API_URL (web deployment)
}
```

## Configuration

### Backend Port

Default: `8765`

To change, edit:
- `scripts/bundle-backend.sh` → startup scripts
- `frontend/src-tauri/tauri.conf.json` → HTTP scope
- `frontend/src/config/environment.ts` → API URL

### Database Location

The SQLite database is bundled with the app at:
```
<app-resources>/php-server/database/database.sqlite
```

Data persists between app restarts at this location.

### Environment Variables

Desktop `.env` is auto-generated during bundling with production settings.

To customize, edit `scripts/bundle-backend.sh` section that creates `.env`.

## Troubleshooting

### Backend doesn't start

**Check logs:**
```bash
# macOS/Linux
tail -f ~/Library/Logs/Smart\ Shelves/php-server.log

# Windows
type %APPDATA%\Smart Shelves\logs\php-server.log
```

**Manual test:**
```bash
cd frontend/src-tauri/resources/php-server
./start-server.sh  # macOS/Linux
start-server.bat   # Windows
```

### Database permission errors

Ensure storage directories are writable:
```bash
chmod -R 775 frontend/src-tauri/resources/php-server/storage
chmod -R 775 frontend/src-tauri/resources/php-server/bootstrap/cache
```

### Frontend can't connect

1. Check PHP server is running on port 8765
2. Verify Tauri HTTP scope includes `localhost:8765`
3. Check browser console for connection errors

### Build fails

**Clear caches:**
```bash
# Frontend
cd frontend
rm -rf node_modules dist
npm install

# Tauri
cd src-tauri
cargo clean
cd ../..

# Backend
cd backend
rm -rf vendor bootstrap/cache/*.php
composer install
```

## Development vs Production

### Development Mode
```bash
cd frontend
npm run tauri dev
```
- Hot reload enabled
- Debug console available
- Faster rebuilds
- Uses dev server on port 1420

### Production Mode
```bash
cd frontend
npm run tauri build
```
- Optimized bundles
- No console logs
- Smaller file size
- Single executable/installer

## Distribution

### Code Signing (macOS)

```bash
# Sign the app
codesign --force --deep --sign "Developer ID Application: Your Name" \
  frontend/src-tauri/target/release/bundle/macos/Smart\ Shelves.app

# Notarize with Apple
xcrun notarytool submit Smart\ Shelves_1.0.0_x64.dmg \
  --apple-id your@email.com \
  --team-id TEAMID \
  --password app-specific-password
```

### Auto-Updates

To enable auto-updates, configure in `tauri.conf.json`:
```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://your-update-server.com/{{target}}/{{current_version}}"
      ]
    }
  }
}
```

## Quick Build Commands

```bash
# Full production build from project root
./scripts/bundle-backend.sh && \
  cd frontend && \
  npm run build && \
  npm run tauri build

# Development testing
cd frontend && npm run tauri dev

# Rebuild after backend changes
./scripts/bundle-backend.sh && \
  cd frontend && \
  npm run tauri build
```

## File Sizes

Approximate sizes (may vary by platform):

- **macOS DMG**: ~80-120 MB
- **Windows MSI**: ~70-100 MB  
- **Linux AppImage**: ~85-110 MB

The bundle includes the entire PHP runtime, so it's fully standalone.

## Support

For issues or questions:
1. Check this documentation
2. Review Tauri logs
3. Test PHP server manually
4. Verify environment detection

## Next Steps

After building successfully:

1. ✅ Test on target platform
2. ✅ Verify all features work offline
3. ✅ Test database persistence
4. ✅ Sign application (production)
5. ✅ Create installer/DMG
6. ✅ Distribute to users
