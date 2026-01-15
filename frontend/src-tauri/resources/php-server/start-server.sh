#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Initialize database on first launch
bash init-database.sh

# Start the server with explicit paths
php -S 127.0.0.1:8765 -t "$SCRIPT_DIR/public" "$SCRIPT_DIR/public/index.php"
