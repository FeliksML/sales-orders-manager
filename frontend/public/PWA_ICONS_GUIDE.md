# PWA Icons Generation Guide

## Required Icons

Your app needs the following icons in the `public/` directory:

1. **pwa-192x192.png** - 192x192px icon
2. **pwa-512x512.png** - 512x512px icon (also used as maskable icon)
3. **apple-touch-icon.png** - 180x180px for iOS
4. **favicon.ico** - 32x32px favicon

## Quick Generation Options

### Option 1: Use PWA Asset Generator (Recommended)
```bash
npx @vite-pwa/assets-generator --preset minimal public/logo.svg
```

### Option 2: Use Online Tool
Visit: https://www.pwabuilder.com/imageGenerator
- Upload your logo
- Download generated icons
- Place in `public/` folder

### Option 3: Manual Creation
Use any image editor (Figma, Photoshop, GIMP):
- Create square images with your logo
- Export as PNG at required sizes
- Ensure icons have transparent or solid background
- For maskable icons, keep important content in safe zone (80% of canvas)

## Temporary Icons
For development, you can use placeholder colored squares:
- Create simple colored PNG files at required sizes
- Replace with branded icons before production deployment
