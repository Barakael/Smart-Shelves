#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Attempt to locate PHP in common locations so the app will work when started from Finder
find_php() {
	if command -v php >/dev/null 2>&1; then
		command -v php
	elif [ -x "/usr/bin/php" ]; then
		echo "/usr/bin/php"
	elif [ -x "/usr/local/bin/php" ]; then
		echo "/usr/local/bin/php"
	elif [ -x "/opt/homebrew/bin/php" ]; then
		echo "/opt/homebrew/bin/php"
	else
		echo ""
	fi
}

# Prefer bundled PHP runtime next to resources (../php/bin/php)
BUNDLED_PHP="$SCRIPT_DIR/../php/bin/php"
if [ -x "$BUNDLED_PHP" ]; then
	PHP_BIN="$BUNDLED_PHP"
else
	PHP_BIN=$(find_php)
fi

if [ -z "$PHP_BIN" ]; then
	echo "❌ PHP binary not found. Please install PHP or include a runtime at resources/php/bin/php." >&2
	exit 2
fi

echo "Using PHP: $PHP_BIN"

# Initialize database on first launch (pass the chosen PHP binary)
"$SCRIPT_DIR/init-database.sh" "$PHP_BIN"

# Start the server with explicit paths
"$PHP_BIN" -S 127.0.0.1:8765 -t "$SCRIPT_DIR/public" "$SCRIPT_DIR/public/index.php"
