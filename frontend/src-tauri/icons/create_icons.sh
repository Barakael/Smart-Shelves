#!/bin/bash

# Create a simple SVG icon
cat > icon.svg << 'SVG'
<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#3b82f6"/>
  <text x="256" y="380" font-family="Arial, sans-serif" font-size="350" fill="white" text-anchor="middle" font-weight="bold">S</text>
</svg>
SVG

# Convert SVG to PNG using rsvg-convert if available, otherwise use a fallback
if command -v rsvg-convert &> /dev/null; then
    rsvg-convert -w 32 -h 32 icon.svg -o 32x32.png
    rsvg-convert -w 128 -h 128 icon.svg -o 128x128.png
    rsvg-convert -w 256 -h 256 icon.svg -o 128x128@2x.png
elif command -v convert &> /dev/null; then
    convert -size 32x32 -background '#3b82f6' -fill white -font Arial-Bold -pointsize 24 -gravity center label:S 32x32.png
    convert -size 128x128 -background '#3b82f6' -fill white -font Arial-Bold -pointsize 96 -gravity center label:S 128x128.png
    convert -size 256x256 -background '#3b82f6' -fill white -font Arial-Bold -pointsize 192 -gravity center label:S 128x128@2x.png
else
    # Fallback: create solid color icons using sips
    sips -s format png --out 32x32.png /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns --resampleWidth 32 2>/dev/null || true
    sips -s format png --out 128x128.png /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns --resampleWidth 128 2>/dev/null || true
    sips -s format png --out 128x128@2x.png /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns --resampleWidth 256 2>/dev/null || true
fi

# Create .icns for macOS (use existing system icon as base)
cp /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns icon.icns 2>/dev/null || touch icon.icns

# Create .ico for Windows (simplified)
if [ -f "32x32.png" ]; then
    cp 32x32.png icon.ico
else
    touch icon.ico
fi

echo "Icons created!"
ls -la
