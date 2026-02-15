import { Snack, SnackFiles, SDKVersion } from "snack-sdk";

import type { SnackSessionConfig, SnackDependencies } from "../types";

const DEFAULT_SDK_VERSION: SDKVersion = "52.0.0";

const DEFAULT_APP_CODE = `import { Text, View, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to your app!</Text>
      <Text style={styles.subtitle}>Start building with AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
`;

const DEFAULT_FILES: SnackFiles = {
  "App.js": {
    type: "CODE",
    contents: DEFAULT_APP_CODE,
  },
};

const DEFAULT_DEPENDENCIES: SnackDependencies = {
  "expo-status-bar": { version: "*" },
};

export function createSnackSession(config: SnackSessionConfig = {}): Snack {
  const {
    name = "Staq Preview",
    description = "AI-generated mobile app preview",
    sdkVersion = DEFAULT_SDK_VERSION,
    files = DEFAULT_FILES,
    dependencies = DEFAULT_DEPENDENCIES,
  } = config;

  return new Snack({
    name,
    description,
    sdkVersion: sdkVersion as SDKVersion,
    files,
    dependencies,
    codeChangesDelay: 500,
  });
}

export function getSnackWebPreviewURL(snack: Snack): string | null {
  const state = snack.getState();
  if (!state.url) return null;

  const snackId = state.url.split("/").pop();
  if (!snackId) return null;

  return `https://snack.expo.dev/embedded/${snackId}?preview=true&platform=web&theme=dark`;
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
