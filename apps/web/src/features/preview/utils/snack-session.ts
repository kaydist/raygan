import { Snack, SnackFiles, SDKVersion } from "snack-sdk";

import type { SnackSessionConfig, SnackDependencies } from "../types";

const DEFAULT_SDK_VERSION: SDKVersion = "54.0.0";

const DEFAULT_APP_CODE = `import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.text}>Waiting for code...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  text: { marginTop: 16, fontSize: 16, color: '#64748b' },
});`;

const DEFAULT_FILES: SnackFiles = {
  "App.tsx": {
    type: "CODE",
    contents: DEFAULT_APP_CODE,
  },
};

const DEFAULT_DEPENDENCIES: SnackDependencies = {
  "expo-status-bar": { version: "*" },
};

export function createSnackSession(config: SnackSessionConfig = {}): Snack {
  const {
    name = "Raygan Preview",
    description = "AI-generated mobile app preview",
    sdkVersion = DEFAULT_SDK_VERSION,
    files = DEFAULT_FILES,
    dependencies = DEFAULT_DEPENDENCIES,
    webPreviewRef,
  } = config;

  return new Snack({
    name,
    description,
    sdkVersion: sdkVersion as SDKVersion,
    files,
    dependencies,
    codeChangesDelay: 500,
    online: true,
    webPreviewRef,
  });
}

export function getSnackWebPreviewURL(snack: Snack, platform: string = "web"): string | null {
  const state = snack.getState();

  const isLocalhost = typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (isLocalhost && state.webPreviewURL) {
    return state.webPreviewURL;
  }

  const channel = state.channel;
  if (channel) {
    return `https://snack.expo.dev/embedded?channel=${channel}&platform=${platform}&preview=true&theme=dark`;
  }

  return null;
}

export function getSnackQRCodeURL(snack: Snack): string | null {
  const state = snack.getState();
  return state.url || null;
}

export function formatSnackError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

export { DEFAULT_SDK_VERSION, DEFAULT_FILES, DEFAULT_DEPENDENCIES };
