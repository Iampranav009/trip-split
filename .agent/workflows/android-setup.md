---
description: Complete Android App Setup & Build Guide
---

# Android App Setup Workflow

## Prerequisites
- Node.js installed ✅
- Android Studio installed (download from https://developer.android.com/studio)
- Java Development Kit (JDK) 11 or higher

## Step 1: Fix Build Issues (if any)
If `npm run build` fails, run:
```bash
npm install --force
```

## Step 2: Build the Web App
// turbo
```bash
npm run build
```
This creates the `dist/` folder with optimized production files.

## Step 3: Add Android Platform
// turbo
```bash
npx cap add android
```
This generates the complete Android Studio project in the `android/` folder.

## Step 4: Sync Web Files to Android
// turbo
```bash
npx cap sync android
```
This copies your built files and updates the native project.

## Step 5: Open in Android Studio
```bash
npx cap open android
```
This launches Android Studio with your project.

## Step 6: In Android Studio

1. **Wait for Gradle Sync** (first time takes 5-10 minutes)
2. **Create/Start Emulator:**
   - Tools → Device Manager
   - Create new device (Pixel 5 recommended)
   - Click Play ▶️ to start emulator
3. **Run App:**
   - Click green ▶️ Run button
   - Select your emulator/device
   - App will install and launch!

## Step 7: Build APK (Optional)
In Android Studio:
- Build → Build Bundle(s) / APK(s) → Build APK(s)
- APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

## Project Structure After Setup:
```
trip-split-1/
├── src/              # React source code
├── dist/             # Built web files (created by npm run build)
├── android/          # Android Studio project (created by cap add android)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   └── java/com/pranav/tripsplit/
│   │   └── build.gradle
│   ├── gradle/
│   └── build.gradle
├── node_modules/
├── capacitor.config.json
└── package.json
```

## Making Changes to Your App:

### For Code/UI Changes:
1. Edit your React files (App.tsx, components, etc.)
2. Run `npm run build` to rebuild
3. Run `npx cap sync android` to update Android project
4. Refresh in Android Studio or rebuild

### For Native Android Changes:
1. Edit files in `android/` folder directly in Android Studio
2. No sync needed - changes are immediate

## Common Commands:

```bash
# Rebuild and sync
npm run build && npx cap sync android

# Open Android Studio
npx cap open android

# Clean build (if issues)
cd android && ./gradlew clean && cd ..
npx cap sync android
```

## Troubleshooting:

### "dist folder not found"
→ Run `npm run build` first

### Gradle sync fails
→ Check internet connection, wait for downloads to complete

### App shows white screen
→ Check `dist/` folder exists and has files
→ Run `npx cap sync android`

### Changes not showing
→ Run `npm run build && npx cap sync android`
→ Rebuild app in Android Studio

## App Details:
- **Package ID**: com.pranav.tripsplit
- **App Name**: Trip Splitter  
- **Min SDK**: API 22 (Android 5.0+)
- **Target SDK**: API 34 (Android 14)

## Your App Features (All Working!):
✅ Beautiful glassmorphism UI
✅ Firebase Authentication
✅ Real-time trip sync
✅ Invoice PDF generation
✅ QR code sharing
✅ Smooth animations
✅ Responsive design

Everything will work perfectly in Android! 🎉
