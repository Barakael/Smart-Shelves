#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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
    php artisan migrate:fresh --force
    
    echo "🌱 Seeding database..."
    php artisan db:seed --force
    
    # Mark as initialized
    touch "$INIT_MARKER"
    echo "✅ Database initialized successfully!"
else
    echo "✅ Database already initialized"
fi

echo "🎉 Ready to serve!"
