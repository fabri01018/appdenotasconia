# Electron Desktop App Setup Guide

This guide outlines the steps to transform this Expo React Native project into an Electron desktop application.

## Prerequisites

- Node.js and npm/yarn installed.
- Existing Expo project setup (already present).

## Step 1: Install Electron Dependencies

Install the necessary packages for Electron and building the application.

```bash
npm install --save-dev electron electron-builder concurrently wait-on cross-env
```

- `electron`: The Electron framework.
- `electron-builder`: For packaging the app (creating .exe, .dmg, etc.).
- `concurrently`: To run the Expo Web server and Electron simultaneously during development.
- `wait-on`: To wait for the web server to be ready before launching Electron.
- `cross-env`: To set environment variables across different OSs.

## Step 2: Create Electron Entry Point

Create a new directory named `electron` in the root of your project, and inside it create a file named `main.js`.

**File Structure:**
```
/
├── electron/
│   └── main.js
├── package.json
└── ...
```

**Content of `electron/main.js`:**

```javascript
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true, // Caution: Enable only if needed, otherwise use preload scripts
      contextIsolation: false, // Caution: See above
      webSecurity: false, // Optional: Useful for local development CORS issues
    },
  });

  if (isDev) {
    // In development, load the Expo Web server URL
    mainWindow.loadURL('http://localhost:8081');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the exported static files
    // Adjust the path if your export output directory is different (e.g. dist)
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

## Step 3: Update `package.json`

You need to add scripts to run and build the Electron app, and configure the build settings.

1.  **Update `scripts` section:**

    Add the following scripts to your `package.json`:

    ```json
    "scripts": {
      ...
      "electron:dev": "concurrently \"cross-env NODE_ENV=development npx expo start --web --port 8081\" \"wait-on http://localhost:8081 && electron electron/main.js\"",
      "electron:build": "npx expo export -p web && electron-builder"
    }
    ```

2.  **Add `build` configuration:**

    Add a new top-level `build` key to `package.json` for `electron-builder` configuration:

    ```json
    "build": {
      "appId": "com.fabri1820.productionai",
      "productName": "ProductionAI",
      "directories": {
        "output": "dist_electron"
      },
      "files": [
        "dist/**/*",
        "electron/main.js",
        "package.json"
      ],
      "extends": null,
      "mac": {
        "category": "public.app-category.productivity"
      },
      "win": {
        "target": "nsis"
      },
      "linux": {
        "target": "AppImage"
      }
    }
    ```

    *Note: The `files` section is crucial. It tells electron-builder to include the `dist` folder (created by `expo export`) and your `electron/main.js`.*

3.  **Add `main` entry point:**

    Electron looks for the `main` script in `package.json`. However, changing the existing `"main": "expo-router/entry"` might affect React Native tools.
    
    **Option A (Recommended for this setup):** Point the electron command directly to the file in scripts (already done in Step 3.1: `electron electron/main.js`).
    
    **Option B:** If you want to run just `electron .`, add `"electron-main": "electron/main.js"` and update the start script to look for it, or modify `main` carefully. The script approach in 3.1 is safer.

## Step 4: Check `app.json` Web Configuration

Ensure your `app.json` is configured for static web export.

```json
"web": {
  "output": "static",
  "favicon": "./assets/images/favicon.png"
}
```
*This is likely already set up.*

## Step 5: Running the App

**Development:**
```bash
npm run electron:dev
```
This will start the Expo Metro bundler for web and open the Electron window loading localhost.

**Production Build:**
```bash
npm run electron:build
```
This will:
1.  Run `expo export -p web` to generate the static website in `dist/`.
2.  Run `electron-builder` to package the contents of `dist/` and `electron/main.js` into a desktop executable (in `dist_electron/`).

## Notes & Troubleshooting

-   **Navigation:** Expo Router works well on web, but ensure your routes handle history correctly. Electron behaves like a standard browser window.
-   **Native Modules:** Libraries that depend on native iOS/Android code (like `react-native-live-audio-stream`) will **not** work in Electron unless they have a web implementation or you replace them with Node.js equivalents.
    -   *Good news:* `lib/audio-recorder.js` in this project already has logic to handle Web/Native differences, so basic recording should work via browser APIs.
-   **Storage:** `expo-sqlite` on web uses a different underlying storage mechanism. Data persisted in the Electron app will be stored in the application's Chromium profile (IndexedDB/WebSQL), not a local `.db` file on disk unless you specifically implement a Node.js SQLite adapter for Electron.
-   **CORS:** If you encounter CORS issues with external APIs (like Supabase or Deepgram) in Electron, you might need to disable web security in `electron/main.js` (set `webSecurity: false` in `webPreferences`) or configure your backend to allow requests from `file://` or `localhost`.

