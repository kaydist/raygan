export interface TemplateFile {
  path: string;
  content: string;
  language?: string;
}

export function getExpoBaseTemplate(projectName: string, projectSlug: string): TemplateFile[] {
  return [
    {
      path: "app.json",
      content: JSON.stringify({
        expo: {
          name: projectName,
          slug: projectSlug,
          version: "1.0.0",
          orientation: "portrait",
          icon: "./assets/icon.png",
          scheme: projectSlug,
          userInterfaceStyle: "light",
          newArchEnabled: true,
          splash: {
            image: "./assets/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff",
          },
          ios: {
            supportsTablet: true,
            bundleIdentifier: `com.${projectSlug.replace(/-/g, "")}`,
          },
          android: {
            adaptiveIcon: {
              foregroundImage: "./assets/adaptive-icon.png",
              backgroundColor: "#ffffff",
            },
            package: `com.${projectSlug.replace(/-/g, "")}`,
          },
          web: {
            bundler: "metro",
            output: "static",
            favicon: "./assets/favicon.png",
          },
          plugins: ["expo-router"],
        },
      }, null, 2),
      language: "json",
    },
    {
      path: "package.json",
      content: JSON.stringify({
        name: projectSlug,
        version: "1.0.0",
        main: "expo-router/entry",
        scripts: {
          start: "expo start",
          android: "expo start --android",
          ios: "expo start --ios",
          web: "expo start --web",
        },
        dependencies: {
          "expo": "~52.0.0",
          "expo-constants": "~17.0.0",
          "expo-linking": "~7.0.0",
          "expo-router": "~4.0.0",
          "expo-status-bar": "~2.0.0",
          "react": "18.3.1",
          "react-native": "0.76.3",
          "react-native-safe-area-context": "4.12.0",
          "react-native-screens": "~4.1.0",
        },
        devDependencies: {
          "@babel/core": "^7.25.0",
          "@types/react": "~18.3.0",
          "typescript": "^5.3.0",
        },
        private: true,
      }, null, 2),
      language: "json",
    },
    {
      path: "tsconfig.json",
      content: JSON.stringify({
        extends: "expo/tsconfig.base",
        compilerOptions: {
          strict: true,
        },
        include: ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
        exclude: ["node_modules"],
      }, null, 2),
      language: "json",
    },
    {
      path: "app/_layout.tsx",
      content: `import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack />;
}
`,
      language: "typescript",
    },
    {
      path: "app/index.tsx",
      content: `import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${projectName}</Text>
      <Text style={styles.subtitle}>Start building your app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
  },
});
`,
      language: "typescript",
    },
  ];
}
