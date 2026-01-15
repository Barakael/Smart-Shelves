#!/bin/bash
set -e

# If a PHP binary path is provided as the first argument, use it; otherwise try to find php
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Prefer bundled PHP runtime next to resources (../php/bin/php)
BUNDLED_PHP="$SCRIPT_DIR/../php/bin/php"
PHP_BIN="$1"
if [ -x "$BUNDLED_PHP" ]; then
    PHP_BIN="$BUNDLED_PHP"
fi
if [ -z "$PHP_BIN" ]; then
    if command -v php >/dev/null 2>&1; then
        PHP_BIN=$(command -v php)
    elif [ -x "/usr/bin/php" ]; then
        PHP_BIN="/usr/bin/php"
    elif [ -x "/usr/local/bin/php" ]; then
        PHP_BIN="/usr/local/bin/php"
    elif [ -x "/opt/homebrew/bin/php" ]; then
        PHP_BIN="/opt/homebrew/bin/php"
    else
        echo "❌ PHP binary not found for database init. Provide path as argument, place runtime in resources/php/bin/php, or install PHP." >&2
        exit 2
    fi
fi

echo "Using PHP for DB init: $PHP_BIN"
echo "🚀 Initializing Smart Shelves Database..."

# Ensure database directory exists
mkdir -p database

# Check if database exists and is initialized
DB_FILE="database/database.sqlite"
INIT_MARKER="database/.initialized"

if [ ! -f "$DB_FILE" ] || [ ! -f "$INIT_MARKER" ]; then
        echo "📦 Creating fresh database..."
    
        # Remove old database if corrupted
        rm -f "$DB_FILE"
    
        # Create new database
        touch "$DB_FILE"
        chmod 664 "$DB_FILE"
    
        echo "🔧 Running migrations..."
        "$PHP_BIN" artisan migrate:fresh --force
    
        echo "🌱 Seeding database..."
        "$PHP_BIN" artisan db:seed --force
    
        # Mark as initialized
        touch "$INIT_MARKER"
        echo "✅ Database initialized successfully!"
else
        echo "✅ Database already initialized"
fi

echo "🎉 Ready to serve!"
