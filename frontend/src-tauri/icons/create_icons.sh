#!/bin/bash

set -euo pipefail

SOURCE_IMAGE="tera-logo.png"
ICONSET_DIR="tera.iconset"
# Optional generated larger square source for better-looking icons in dock
LARGE_SOURCE_IMAGE="tera-logo-large.png"
TARGET_SQUARE=1024
SCALE_PERCENT=90

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "\n⚠️  Place the TERA logo PNG inside src-tauri/icons as '$SOURCE_IMAGE' before running this script." >&2
    exit 1
fi

echo "Generating platform icons from $SOURCE_IMAGE ..."

rm -rf "$ICONSET_DIR" icon.icns icon.ico
mkdir -p "$ICONSET_DIR"

# If ImageMagick's convert is available, create a square source with the
# logo scaled up to occupy more of the canvas so the resulting icons look
# larger in the dock. Falls back to the original source if convert missing.
if command -v convert >/dev/null 2>&1; then
    echo "ImageMagick found — creating enlarged square source ($LARGE_SOURCE_IMAGE)"
    # Resize logo to fit inside TARGET_SQUARE * SCALE_PERCENT/100 on the longer side
    max_size=$(( TARGET_SQUARE * SCALE_PERCENT / 100 ))
    convert "$SOURCE_IMAGE" -resize "${max_size}x${max_size}" "$LARGE_SOURCE_IMAGE"
    # Create transparent square canvas and composite centered
    convert -size ${TARGET_SQUARE}x${TARGET_SQUARE} xc:none "$LARGE_SOURCE_IMAGE" -gravity center -composite "$LARGE_SOURCE_IMAGE"
    # Use the generated large source for icon generation
    SRC_FOR_ICONS="$LARGE_SOURCE_IMAGE"
else
    echo "ImageMagick not found — using original source. Install ImageMagick for better results."
    SRC_FOR_ICONS="$SOURCE_IMAGE"
fi

# macOS iconset sizes
sizes=(16 32 64 128 256 512)

for size in "${sizes[@]}"; do
    double=$((size * 2))
    sips -z "$size" "$size" "$SRC_FOR_ICONS" --out "$ICONSET_DIR/icon_${size}x${size}.png" >/dev/null
    sips -z "$double" "$double" "$SRC_FOR_ICONS" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" >/dev/null
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
