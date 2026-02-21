export interface TemplateFile {
  path: string;
  content: string;
  language?: string;
}

export function getExpoBaseTemplate(projectName: string, projectSlug: string): TemplateFile[] {
  return [
    {
      path: "App.tsx",
      content: `import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
`,
      language: "typescript",
    },
    {
      path: "app.json",
      content: JSON.stringify({
        expo: {
          name: projectName,
          slug: projectSlug,
          version: "1.0.0",
          orientation: "portrait",
          icon: "./assets/icon.png",
          userInterfaceStyle: "light",
          splash: {
            image: "./assets/splash.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff",
          },
          assetBundlePatterns: ["**/*"],
          ios: {
            supportsTablet: true,
          },
          android: {
            adaptiveIcon: {
              foregroundImage: "./assets/adaptive-icon.png",
              backgroundColor: "#ffffff",
            },
          },
          web: {
            favicon: "./assets/favicon.png",
          },
        },
      }, null, 2),
      language: "json",
    },
    {
      path: "package.json",
      content: JSON.stringify({
        name: projectSlug,
        version: "1.0.0",
        main: "node_modules/expo/AppEntry.js",
        scripts: {
          start: "expo start",
          android: "expo start --android",
          ios: "expo start --ios",
          web: "expo start --web",
        },
        dependencies: {
          "expo": "~50.0.0",
          "expo-status-bar": "~1.11.1",
          "react": "18.2.0",
          "react-native": "0.73.2",
          "react-native-safe-area-context": "4.8.2",
          "@react-navigation/native": "^6.1.9",
          "@react-navigation/native-stack": "^6.9.17",
          "react-native-screens": "~3.29.0",
        },
        devDependencies: {
          "@babel/core": "^7.20.0",
          "@types/react": "~18.2.45",
          "typescript": "^5.1.3",
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
          baseUrl: ".",
          paths: {
            "@/*": ["src/*"],
          },
        },
        include: ["**/*.ts", "**/*.tsx"],
        exclude: ["node_modules"],
      }, null, 2),
      language: "json",
    },
    {
      path: "babel.config.js",
      content: `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
`,
      language: "javascript",
    },
    {
      path: "src/navigation/RootNavigator.tsx",
      content: `import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';

export type RootStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6366f1',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '${projectName}' }}
      />
    </Stack.Navigator>
  );
}
`,
      language: "typescript",
    },
    {
      path: "src/screens/HomeScreen.tsx",
      content: `import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to ${projectName}</Text>
        <Text style={styles.subtitle}>Built with Staq</Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
`,
      language: "typescript",
    },
    {
      path: "src/components/index.ts",
      content: `// Export shared components here
export {};
`,
      language: "typescript",
    },
    {
      path: "src/hooks/index.ts",
      content: `// Export custom hooks here
export {};
`,
      language: "typescript",
    },
    {
      path: "src/utils/index.ts",
      content: `// Export utility functions here
export {};
`,
      language: "typescript",
    },
    {
      path: "src/types/index.ts",
      content: `// Export shared types here
export {};
`,
      language: "typescript",
    },
    {
      path: "src/constants/colors.ts",
      content: `export const colors = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  secondary: '#f59e0b',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  error: '#ef4444',
  success: '#22c55e',
};
`,
      language: "typescript",
    },
  ];
}
