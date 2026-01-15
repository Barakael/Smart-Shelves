#!/bin/bash

set -euo pipefail

SOURCE_IMAGE="tera-logo.png"
ICONSET_DIR="tera.iconset"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "\n⚠️  Place the TERA logo PNG inside src-tauri/icons as '$SOURCE_IMAGE' before running this script." >&2
    exit 1
fi

echo "Generating platform icons from $SOURCE_IMAGE ..."

rm -rf "$ICONSET_DIR" icon.icns icon.ico
mkdir -p "$ICONSET_DIR"

# macOS iconset sizes
sizes=(16 32 64 128 256 512)

for size in "${sizes[@]}"; do
    double=$((size * 2))
    sips -z "$size" "$size" "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_${size}x${size}.png" >/dev/null
    sips -z "$double" "$double" "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" >/dev/null
done

iconutil -c icns "$ICONSET_DIR" -o icon.icns >/dev/null

# Base PNGs referenced by tauri.conf.json
cp "$ICONSET_DIR/icon_32x32.png" 32x32.png
cp "$ICONSET_DIR/icon_128x128.png" 128x128.png
cp "$ICONSET_DIR/icon_256x256.png" 128x128@2x.png

# Windows ICO (prefer ImageMagick if available)
if command -v convert >/dev/null 2>&1; then
    convert \
        "$ICONSET_DIR/icon_32x32.png" \
        "$ICONSET_DIR/icon_64x64.png" \
        "$ICONSET_DIR/icon_128x128.png" \
        "$ICONSET_DIR/icon_256x256.png" \
        icon.ico
else
    cp "$ICONSET_DIR/icon_256x256.png" icon.ico
fi

echo "✅ Icons updated. Files available in src-tauri/icons/"
