#!/bin/bash
# Build script to bundle PHP backend for Tauri desktop app

set -e

echo "🔧 Building standalone desktop application..."

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BUNDLE_DIR="$FRONTEND_DIR/src-tauri/resources"
PHP_BUNDLE="$BUNDLE_DIR/php-server"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Backend dir: $BACKEND_DIR"
echo "📁 Frontend dir: $FRONTEND_DIR"

# Clean and create bundle directory
rm -rf "$BUNDLE_DIR"
mkdir -p "$PHP_BUNDLE"

# Copy backend files
echo "📦 Copying backend files..."
rsync -av --progress \
  --exclude='node_modules' \
  --exclude='vendor' \
  --exclude='storage/logs/*' \
  --exclude='storage/framework/cache/*' \
  --exclude='storage/framework/sessions/*' \
  --exclude='storage/framework/views/*' \
  --exclude='.git' \
  --exclude='.env' \
  "$BACKEND_DIR/" "$PHP_BUNDLE/"

# Create necessary storage directories
echo "📁 Creating storage directories..."
mkdir -p "$PHP_BUNDLE/storage/framework/cache"
mkdir -p "$PHP_BUNDLE/storage/framework/sessions"
mkdir -p "$PHP_BUNDLE/storage/framework/views"
mkdir -p "$PHP_BUNDLE/storage/logs"
chmod -R 775 "$PHP_BUNDLE/storage"
chmod -R 775 "$PHP_BUNDLE/bootstrap/cache"

# Copy or create .env file for desktop
echo "⚙️  Creating desktop .env configuration..."
cat > "$PHP_BUNDLE/.env" << 'EOL'
APP_NAME="Smart Shelves"
APP_ENV=desktop
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_DEBUG=false
APP_URL=http://localhost:8765

LOG_CHANNEL=single
LOG_LEVEL=error

DB_CONNECTION=sqlite
DB_DATABASE=database.sqlite

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DRIVER=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120
EOL

# Copy database
echo "💾 Copying database..."
cp "$BACKEND_DIR/database/database.sqlite" "$PHP_BUNDLE/database/" || touch "$PHP_BUNDLE/database/database.sqlite"

# Copy vendor from backend (simpler and more reliable)
echo "📦 Copying PHP dependencies from backend..."
if [ -d "$BACKEND_DIR/vendor" ]; then
    cp -r "$BACKEND_DIR/vendor" "$PHP_BUNDLE/"
    echo "   ✓ Vendor directory copied"
else
    echo "❌ Error: No vendor directory found in backend."
    exit 1
fi

# Generate app key if needed
cd "$PHP_BUNDLE"
if grep -q "YOUR_APP_KEY_HERE" .env; then
    echo "🔐 Setting application key..."
    # Copy key from original backend
    if [ -f "$BACKEND_DIR/.env" ]; then
        APP_KEY=$(grep "^APP_KEY=" "$BACKEND_DIR/.env" | cut -d '=' -f2-)
        if [ ! -z "$APP_KEY" ] && [ "$APP_KEY" != "base64:YOUR_APP_KEY_HERE" ]; then
            sed -i.bak "s|APP_KEY=base64:YOUR_APP_KEY_HERE|APP_KEY=$APP_KEY|" .env
            rm -f .env.bak
            echo "   ✓ APP_KEY copied from backend/.env"
        else
            echo "   ⚠️  No valid APP_KEY found in backend/.env"
        fi
    fi
fi

# Test that PHP can load
echo "⚡ Verifying PHP setup..."
php -r "require __DIR__.'/vendor/autoload.php'; echo '   ✓ Autoloader works\n';" || {
    echo "❌ Error: PHP autoloader failed"
    exit 1
}

cd "$PROJECT_ROOT"

# Create startup script for macOS/Linux
echo "📝 Creating startup script (Unix)..."
cat > "$PHP_BUNDLE/start-server.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")"
php artisan serve --host=127.0.0.1 --port=8765 --no-reload
EOL
chmod +x "$PHP_BUNDLE/start-server.sh"

# Create startup script for Windows
echo "📝 Creating startup script (Windows)..."
cat > "$PHP_BUNDLE/start-server.bat" << 'EOL'
@echo off
cd /d "%~dp0"
php artisan serve --host=127.0.0.1 --port=8765 --no-reload
EOL

echo "✅ Backend bundling complete!"
echo ""
echo "Next steps:"
echo "1. Build frontend: cd frontend && npm run build"
echo "2. Build Tauri app: cd frontend && npm run tauri build"
