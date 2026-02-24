import type { ASTNode, ComponentType } from "@raygan/shared";
import { BaseFrameworkAdapter } from "./base-adapter";
import type {
  SerializerConfig,
  SerializerOutput,
  SerializerContext,
  ComponentImport,
  DependencyTracker,
  ImportManager,
} from "../types";
import { toKebabCase } from "../types";

const REACT_NATIVE_COMPONENTS = new Set([
  "ActivityIndicator",
  "Button",
  "DrawerLayoutAndroid",
  "FlatList",
  "Image",
  "ImageBackground",
  "InputAccessoryView",
  "KeyboardAvoidingView",
  "Modal",
  "Pressable",
  "RefreshControl",
  "SafeAreaView",
  "ScrollView",
  "SectionList",
  "StatusBar",
  "Switch",
  "Text",
  "TextInput",
  "TouchableHighlight",
  "TouchableNativeFeedback",
  "TouchableOpacity",
  "TouchableWithoutFeedback",
  "View",
  "VirtualizedList",
  "Animated",
  "Dimensions",
  "Keyboard",
  "LayoutAnimation",
  "Linking",
  "PanResponder",
  "PixelRatio",
  "Platform",
  "StyleSheet",
  "Vibration",
]);

const EXPO_COMPONENTS: Record<string, string> = {
  Video: "expo-av",
  Audio: "expo-av",
  AVPlaybackStatus: "expo-av",
  BlurView: "expo-blur",
  Camera: "expo-camera",
  CameraView: "expo-camera",
  Clipboard: "expo-clipboard",
  Constants: "expo-constants",
  Contacts: "expo-contacts",
  DocumentPicker: "expo-document-picker",
  FileSystem: "expo-file-system",
  Font: "expo-font",
  Haptics: "expo-haptics",
  ExpoImage: "expo-image",
  ImagePicker: "expo-image-picker",
  LinearGradient: "expo-linear-gradient",
  ExpoLinking: "expo-linking",
  LocalAuthentication: "expo-local-authentication",
  Location: "expo-location",
  MailComposer: "expo-mail-composer",
  MediaLibrary: "expo-media-library",
  Notifications: "expo-notifications",
  Print: "expo-print",
  ScreenOrientation: "expo-screen-orientation",
  SecureStore: "expo-secure-store",
  Accelerometer: "expo-sensors",
  Barometer: "expo-sensors",
  DeviceMotion: "expo-sensors",
  Gyroscope: "expo-sensors",
  Magnetometer: "expo-sensors",
  Pedometer: "expo-sensors",
  Sharing: "expo-sharing",
  SMS: "expo-sms",
  Speech: "expo-speech",
  SplashScreen: "expo-splash-screen",
  ExpoStatusBar: "expo-status-bar",
  StoreReview: "expo-store-review",
  TaskManager: "expo-task-manager",
  Updates: "expo-updates",
  Icon: "expo-vector-icons",
  AntDesign: "@expo/vector-icons",
  Entypo: "@expo/vector-icons",
  EvilIcons: "@expo/vector-icons",
  Feather: "@expo/vector-icons",
  FontAwesome: "@expo/vector-icons",
  FontAwesome5: "@expo/vector-icons",
  FontAwesome6: "@expo/vector-icons",
  Fontisto: "@expo/vector-icons",
  Foundation: "@expo/vector-icons",
  Ionicons: "@expo/vector-icons",
  MaterialCommunityIcons: "@expo/vector-icons",
  MaterialIcons: "@expo/vector-icons",
  Octicons: "@expo/vector-icons",
  SimpleLineIcons: "@expo/vector-icons",
  Zocial: "@expo/vector-icons",
  VideoThumbnails: "expo-video-thumbnails",
  WebBrowser: "expo-web-browser",
  MapView: "react-native-maps",
  Marker: "react-native-maps",
  Callout: "react-native-maps",
  Polygon: "react-native-maps",
  Polyline: "react-native-maps",
  Circle: "react-native-maps",
  Overlay: "react-native-maps",
  Heatmap: "react-native-maps",
  Geojson: "react-native-maps",
  Svg: "react-native-svg",
  SvgCircle: "react-native-svg",
  SvgEllipse: "react-native-svg",
  SvgG: "react-native-svg",
  SvgText: "react-native-svg",
  SvgTSpan: "react-native-svg",
  SvgTextPath: "react-native-svg",
  SvgPath: "react-native-svg",
  SvgPolygon: "react-native-svg",
  SvgPolyline: "react-native-svg",
  SvgLine: "react-native-svg",
  SvgRect: "react-native-svg",
  SvgUse: "react-native-svg",
  SvgImage: "react-native-svg",
  SvgSymbol: "react-native-svg",
  SvgDefs: "react-native-svg",
  SvgLinearGradient: "react-native-svg",
  SvgRadialGradient: "react-native-svg",
  SvgStop: "react-native-svg",
  SvgClipPath: "react-native-svg",
  SvgPattern: "react-native-svg",
  SvgMask: "react-native-svg",
  WebView: "react-native-webview",
  GestureHandlerRootView: "react-native-gesture-handler",
  GestureDetector: "react-native-gesture-handler",
  Gesture: "react-native-gesture-handler",
  TapGestureHandler: "react-native-gesture-handler",
  PanGestureHandler: "react-native-gesture-handler",
  LongPressGestureHandler: "react-native-gesture-handler",
  RotationGestureHandler: "react-native-gesture-handler",
  FlingGestureHandler: "react-native-gesture-handler",
  PinchGestureHandler: "react-native-gesture-handler",
  ForceTouchGestureHandler: "react-native-gesture-handler",
  NativeViewGestureHandler: "react-native-gesture-handler",
  Animated: "react-native-reanimated",
  SafeAreaProvider: "react-native-safe-area-context",
  SafeAreaView: "react-native-safe-area-context",
  Slider: "@react-native-community/slider",
  DateTimePicker: "@react-native-community/datetimepicker",
  Picker: "@react-native-picker/picker",
  AsyncStorage: "@react-native-async-storage/async-storage",
  LottieView: "lottie-react-native",
  Screen: "react-native-screens",
  ScreenContainer: "react-native-screens",
  ScreenStack: "react-native-screens",
  BottomSheet: "@gorhom/bottom-sheet",
  BottomSheetModal: "@gorhom/bottom-sheet",
  BottomSheetModalProvider: "@gorhom/bottom-sheet",
  BottomSheetScrollView: "@gorhom/bottom-sheet",
  BottomSheetFlatList: "@gorhom/bottom-sheet",
  BottomSheetSectionList: "@gorhom/bottom-sheet",
  BottomSheetView: "@gorhom/bottom-sheet",
  Calendar: "react-native-calendars",
  CalendarList: "react-native-calendars",
  Agenda: "react-native-calendars",
  MotiView: "moti",
  MotiText: "moti",
  MotiImage: "moti",
  MotiScrollView: "moti",
  MotiSafeAreaView: "moti",
  AnimatePresence: "moti",
  StyledComponent: "nativewind",
};

export class ExpoAdapter extends BaseFrameworkAdapter {
  readonly framework = "expo" as const;

  isBuiltInComponent(componentType: ComponentType): boolean {
    return REACT_NATIVE_COMPONENTS.has(componentType) || componentType in EXPO_COMPONENTS;
  }

  getComponentImport(componentType: ComponentType): ComponentImport | null {
    if (REACT_NATIVE_COMPONENTS.has(componentType)) {
      return { source: "react-native", named: true };
    }
    if (componentType in EXPO_COMPONENTS) {
      return { source: EXPO_COMPONENTS[componentType]!, named: true };
    }
    return null;
  }

  getScreenPath(name: string, config: SerializerConfig): string {
    const ext = config.useTypeScript ? "tsx" : "jsx";
    return config.expoRouter
      ? `src/app/${toKebabCase(name)}.${ext}`
      : `src/screens/${name}.${ext}`;
  }

  getComponentPath(name: string, config: SerializerConfig): string {
    const ext = config.useTypeScript ? "tsx" : "jsx";
    return `src/components/${name}.${ext}`;
  }

  serializeScreen(
    node: ASTNode,
    output: SerializerOutput,
    context: SerializerContext
  ): void {
    const { config } = context;
    const imports = context.imports;
    const styles = context.styles;

    imports.addReact();

    const componentJsx = this.serializeComponent(node, context, 1);
    const stylesCode = styles.generate(config.indent);
    const path = this.getScreenPath(node.name, config);
    const code = this.generateScreenFile(node.name, componentJsx, imports.generate(), stylesCode, config);
    output.set(path, code);

    for (const child of node.children) {
      if (child.type === "custom_component") {
        this.serializeCustomComponent(child, output, context);
      }
    }
  }

  serializeNavigator(
    node: ASTNode,
    output: SerializerOutput,
    context: SerializerContext
  ): void {
    const { config } = context;
    const imports = context.imports;

    imports.addReact();

    const ext = config.useTypeScript ? "tsx" : "jsx";
    let path: string;
    let code: string;

    if (config.expoRouter) {
      path = `src/app/_layout.${ext}`;
      code = this.generateExpoRouterLayout(node, imports, config);
    } else {
      path = `src/navigation/${node.name}.${ext}`;
      code = this.generateReactNavigationNavigator(node, imports, config);
    }

    output.set(path, code);

    for (const child of node.children) {
      if (child.type === "screen") {
        this.serializeScreen(child, output, context);
      } else if (child.type === "navigator") {
        this.serializeNavigator(child, output, context);
      } else if (child.type === "custom_component") {
        this.serializeCustomComponent(child, output, context);
      }
    }
  }

  serializeCustomComponent(
    node: ASTNode,
    output: SerializerOutput,
    context: SerializerContext
  ): void {
    const { config } = context;
    const imports = context.imports;
    const styles = context.styles;

    imports.addReact();

    const componentJsx = this.serializeChildren(node.children, context, 1);
    const stylesCode = styles.generate(config.indent);
    const path = this.getComponentPath(node.name, config);
    const code = this.generateComponentFile(node.name, componentJsx, imports.generate(), stylesCode, config);
    output.set(path, code);
  }

  generateScaffolding(
    output: SerializerOutput,
    config: SerializerConfig,
    dependencies: DependencyTracker
  ): void {
    output.set("package.json", this.generatePackageJson(config, dependencies));
    output.set("app.json", this.generateAppJson(config));
    output.set("babel.config.js", this.generateBabelConfig());
    output.set("tsconfig.json", this.generateTsConfig());
    output.set(".gitignore", this.generateGitignore());
    output.set("assets/.gitkeep", "");

    if (config.expoRouter) {
      const ext = config.useTypeScript ? "tsx" : "jsx";
      if (!output.has(`src/app/_layout.${ext}`)) {
        output.set(`src/app/_layout.${ext}`, this.generateDefaultLayout());
      }
    } else {
      output.set("App.tsx", this.generateAppEntry());
    }
  }

  private serializeComponent(
    node: ASTNode,
    context: SerializerContext,
    depth: number
  ): string {
    const { config } = context;
    const imports = context.imports;
    const styles = context.styles;

    if (node.type === "screen") {
      return this.serializeChildren(node.children, context, depth);
    }

    if (node.type === "custom_component") {
      imports.addCustomComponent(node.name);
      return this.generateJsxElement(node.name, node.props, [], config.indent, depth);
    }

    const componentType = node.component_type ?? "View";
    this.addComponentImport(componentType, imports);

    const styleName = styles.addStyle(node.name, node.style);
    const propsWithStyle = styleName
      ? { ...node.props, style: `{styles.${styleName}}` }
      : node.props;

    const childrenJsx = this.serializeChildren(node.children, context, depth + 1);

    return this.generateJsxElement(
      componentType,
      propsWithStyle,
      childrenJsx ? [childrenJsx] : [],
      config.indent,
      depth
    );
  }

  private serializeChildren(
    children: ASTNode[],
    context: SerializerContext,
    depth: number
  ): string {
    if (!children || children.length === 0) return "";

    return children
      .map((child) => this.serializeComponent(child, context, depth))
      .join("\n");
  }

  private addComponentImport(componentType: ComponentType, imports: ImportManager): void {
    if (REACT_NATIVE_COMPONENTS.has(componentType)) {
      imports.addReactNative(componentType);
    } else if (componentType in EXPO_COMPONENTS) {
      imports.add(EXPO_COMPONENTS[componentType]!, [componentType]);
    } else {
      imports.addCustomComponent(componentType);
    }
  }

  private generateExpoRouterLayout(
    node: ASTNode,
    imports: ImportManager,
    config: SerializerConfig
  ): string {
    const navigatorType = node.navigator_type ?? "stack";
    const Navigator = navigatorType === "tabs" ? "Tabs" : "Stack";
    imports.add("expo-router", [Navigator]);

    const screens = node.children
      .filter((child) => child.type === "screen")
      .map((screen) => {
        const screenName = toKebabCase(screen.name);
        const title = screen.props.title as string ?? screen.name;
        return `${config.indent}${config.indent}<${Navigator}.Screen name="${screenName}" options={{ title: "${title}" }} />`;
      })
      .join("\n");

    const importsCode = imports.generate();

    return `${importsCode}

export default function Layout() {
  return (
${config.indent}<${Navigator}>
${screens}
${config.indent}</${Navigator}>
  );
}
`;
  }

  private generateReactNavigationNavigator(
    node: ASTNode,
    imports: ImportManager,
    config: SerializerConfig
  ): string {
    const navigatorType = node.navigator_type ?? "stack";

    let createFn: string;
    let navigatorImport: string;

    switch (navigatorType) {
      case "tabs":
        createFn = "createBottomTabNavigator";
        navigatorImport = "@react-navigation/bottom-tabs";
        break;
      case "drawer":
        createFn = "createDrawerNavigator";
        navigatorImport = "@react-navigation/drawer";
        break;
      default:
        createFn = "createNativeStackNavigator";
        navigatorImport = "@react-navigation/native-stack";
    }

    imports.add(navigatorImport, [createFn]);

    const screens = node.children.filter((child) => child.type === "screen");

    for (const screen of screens) {
      imports.addDefault(`../screens/${screen.name}`, screen.name);
    }

    const screenElements = screens
      .map((screen) => {
        const title = screen.props.title as string ?? screen.name;
        return `${config.indent}${config.indent}<Stack.Screen name="${screen.name}" component={${screen.name}} options={{ title: "${title}" }} />`;
      })
      .join("\n");

    const importsCode = imports.generate();

    return `${importsCode}

const Stack = ${createFn}();

export default function ${node.name}() {
  return (
${config.indent}<Stack.Navigator>
${screenElements}
${config.indent}</Stack.Navigator>
  );
}
`;
  }

  private generatePackageJson(
    config: SerializerConfig,
    dependencies: DependencyTracker
  ): string {
    const packages = dependencies.getPackages();

    const deps: Record<string, string> = {
      "expo": "*",
      "expo-status-bar": "*",
      "react": "*",
      "react-native": "*",
    };

    if (config.expoRouter) {
      deps["expo-router"] = "*";
      deps["expo-linking"] = "*";
      deps["expo-constants"] = "*";
      deps["react-native-screens"] = "*";
      deps["react-native-safe-area-context"] = "*";
    }

    for (const pkg of packages) {
      if (!(pkg in deps)) {
        deps[pkg] = "*";
      }
    }

    const devDeps: Record<string, string> = {
      "@babel/core": "*",
    };

    if (config.useTypeScript) {
      devDeps["@types/react"] = "*";
      devDeps["typescript"] = "*";
    }

    const sortedDeps = Object.fromEntries(
      Object.entries(deps).sort(([a], [b]) => a.localeCompare(b))
    );
    const sortedDevDeps = Object.fromEntries(
      Object.entries(devDeps).sort(([a], [b]) => a.localeCompare(b))
    );

    const packageJson = {
      name: config.projectSlug,
      version: config.projectVersion,
      main: config.expoRouter ? "expo-router/entry" : "node_modules/expo/AppEntry.js",
      scripts: {
        start: "expo start",
        android: "expo start --android",
        ios: "expo start --ios",
        web: "expo start --web",
      },
      dependencies: sortedDeps,
      devDependencies: sortedDevDeps,
      private: true,
    };

    return JSON.stringify(packageJson, null, 2);
  }

  private generateAppJson(config: SerializerConfig): string {
    const appJson = {
      expo: {
        name: config.projectName,
        slug: config.projectSlug,
        version: config.projectVersion,
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        newArchEnabled: true,
        splash: {
          image: "./assets/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
        ios: {
          supportsTablet: true,
          bundleIdentifier: `com.${config.projectSlug.replace(/-/g, "")}`,
        },
        android: {
          adaptiveIcon: {
            foregroundImage: "./assets/adaptive-icon.png",
            backgroundColor: "#ffffff",
          },
          package: `com.${config.projectSlug.replace(/-/g, "")}`,
        },
        web: {
          bundler: "metro",
          output: "static",
          favicon: "./assets/favicon.png",
        },
        plugins: ["expo-router"],
        experiments: {
          typedRoutes: config.useTypeScript,
        },
        scheme: config.projectSlug,
      },
    };

    return JSON.stringify(appJson, null, 2);
  }

  private generateBabelConfig(): string {
    return `module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
`;
  }

  private generateTsConfig(): string {
    const tsConfig = {
      extends: "expo/tsconfig.base",
      compilerOptions: {
        strict: true,
        paths: {
          "@/*": ["./src/*"],
        },
      },
      include: ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
    };

    return JSON.stringify(tsConfig, null, 2);
  }

  private generateGitignore(): string {
    return `# Dependencies
node_modules/

# Expo
.expo/
dist/
web-build/

# Native builds
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# Debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# Local env files
.env*.local
.env

# TypeScript
*.tsbuildinfo
`;
  }

  private generateDefaultLayout(): string {
    return `import React from "react";
import { Stack } from "expo-router";

export default function Layout() {
  return <Stack />;
}
`;
  }

  private generateAppEntry(): string {
    return `import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
`;
  }
}
