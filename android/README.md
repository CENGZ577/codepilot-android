# CodePilot Android — Floating Assistant (Bubble + Panel)

This Android wrapper adds a native system-overlay bubble and a resizable-feeling compact assistant panel that can appear above other apps. The bubble can be dragged; tap it to open/close the panel. The panel loads the React/Vite app from packaged assets.

## Build prerequisites
- Android Studio (Ladybug or newer) with Android SDK 35
- JDK 17+
- Node.js 20+

## Build steps
1. From the `app` folder, install dependencies and build the web app:
   ```bash
   npm ci
   npm run build
   ```
2. Copy the generated web bundle into Android assets:
   ```bash
   mkdir -p android/app/src/main/assets/public
   cp -R dist/. android/app/src/main/assets/public/
   ```
3. Open the `android` folder in Android Studio, allow Gradle sync, then choose **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. Install the APK. Open CodePilot and tap **Aktifkan Floating Assistant**. Grant **Display over other apps** permission in Android settings, then return to CodePilot.
5. The blue ✦ bubble stays above other apps. Drag it to move; tap to show/hide the CodePilot panel.

## Notes
- Android requires the special “Display over other apps” permission. The app asks for it explicitly; it is not silently granted.
- The foreground service keeps the overlay alive while the user has enabled it. Stop it from Android Settings > Apps > CodePilot AI > Force stop.
- The React app's existing AI provider settings still apply. A valid provider/API key may be needed for remote LLM responses; local assistant features remain available.
- This repository contains Android source code, not a prebuilt/signed APK. Build and sign the APK in Android Studio for your device/distribution.
