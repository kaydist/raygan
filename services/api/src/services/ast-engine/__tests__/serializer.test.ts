import { describe, it, expect } from "vitest";
import type { ASTNode } from "@staq/shared";
import { serialize } from "../serializer";
import { createNode, createRootNode, addNode } from "../ast";

describe("AST Serializer", () => {
  const createTestAST = (): ASTNode => {
    const text = createNode({
      type: "component",
      component_type: "Text",
      name: "WelcomeText",
      props: { children: "Hello World" },
      style: {
        typography: { fontSize: 24, fontWeight: "bold" },
        colors: { color: "#333333" },
      },
    });

    const view = createNode({
      type: "component",
      component_type: "View",
      name: "Container",
      style: {
        layout: { flex: 1, justifyContent: "center", alignItems: "center" },
        colors: { backgroundColor: "#ffffff" },
      },
      children: [text],
    });

    const screen = createNode({
      type: "screen",
      name: "HomeScreen",
      children: [view],
    });

    let root = createRootNode();
    root = addNode(root, root.id, screen);

    return root;
  };

  describe("serialize", () => {
    it("should throw error if root node is not type root", () => {
      const screen = createNode({
        type: "screen",
        name: "HomeScreen",
      });

      expect(() => serialize(screen)).toThrow("AST root node must have type 'root'");
    });

    it("should generate screen files for Expo Router", () => {
      const ast = createTestAST();
      const output = serialize(ast, { expoRouter: true });

      expect(output.has("src/app/home-screen.tsx")).toBe(true);
    });

    it("should generate screen files for React Navigation", () => {
      const ast = createTestAST();
      const output = serialize(ast, { expoRouter: false });

      expect(output.has("src/screens/HomeScreen.tsx")).toBe(true);
    });

    it("should include React import", () => {
      const ast = createTestAST();
      const output = serialize(ast);

      const content = output.get("src/app/home-screen.tsx");
      expect(content).toContain('import React from "react"');
    });

    it("should include React Native component imports", () => {
      const ast = createTestAST();
      const output = serialize(ast);

      const content = output.get("src/app/home-screen.tsx");
      expect(content).toContain("View");
      expect(content).toContain("Text");
      expect(content).toContain("react-native");
    });

    it("should generate default export for screens", () => {
      const ast = createTestAST();
      const output = serialize(ast);

      const content = output.get("src/app/home-screen.tsx");
      expect(content).toContain("export default function HomeScreen()");
    });

    it("should generate StyleSheet.create", () => {
      const ast = createTestAST();
      const output = serialize(ast);

      const content = output.get("src/app/home-screen.tsx");
      expect(content).toContain("StyleSheet.create");
    });

    it("should include style properties in StyleSheet", () => {
      const ast = createTestAST();
      const output = serialize(ast);

      const content = output.get("src/app/home-screen.tsx");
      expect(content).toContain("flex: 1");
      expect(content).toContain("justifyContent");
      expect(content).toContain("fontSize: 24");
    });

    it("should use kebab-case for Expo Router file paths", () => {
      const text = createNode({
        type: "component",
        component_type: "Text",
        name: "Label",
      });

      const screen = createNode({
        type: "screen",
        name: "UserProfileSettings",
        children: [text],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root, { expoRouter: true });

      expect(output.has("src/app/user-profile-settings.tsx")).toBe(true);
    });
  });

  describe("navigator serialization", () => {
    it("should generate Expo Router layout for stack navigator", () => {
      const screen1 = createNode({
        type: "screen",
        name: "Home",
        props: { title: "Home" },
      });

      const screen2 = createNode({
        type: "screen",
        name: "Profile",
        props: { title: "Profile" },
      });

      const navigator = createNode({
        type: "navigator",
        navigator_type: "stack",
        name: "RootNavigator",
        children: [screen1, screen2],
      });

      let root = createRootNode();
      root = addNode(root, root.id, navigator);

      const output = serialize(root, { expoRouter: true });

      expect(output.has("src/app/_layout.tsx")).toBe(true);
      const content = output.get("src/app/_layout.tsx");
      expect(content).toContain("expo-router");
      expect(content).toContain("Stack");
      expect(content).toContain("Stack.Screen");
    });

    it("should generate Expo Router layout for tabs navigator", () => {
      const screen1 = createNode({
        type: "screen",
        name: "Home",
      });

      const screen2 = createNode({
        type: "screen",
        name: "Settings",
      });

      const navigator = createNode({
        type: "navigator",
        navigator_type: "tabs",
        name: "TabsNavigator",
        children: [screen1, screen2],
      });

      let root = createRootNode();
      root = addNode(root, root.id, navigator);

      const output = serialize(root, { expoRouter: true });

      const content = output.get("src/app/_layout.tsx");
      expect(content).toContain("Tabs");
    });

    it("should generate React Navigation navigator", () => {
      const screen = createNode({
        type: "screen",
        name: "Home",
      });

      const navigator = createNode({
        type: "navigator",
        navigator_type: "stack",
        name: "MainNavigator",
        children: [screen],
      });

      let root = createRootNode();
      root = addNode(root, root.id, navigator);

      const output = serialize(root, { expoRouter: false });

      expect(output.has("src/navigation/MainNavigator.tsx")).toBe(true);
      const content = output.get("src/navigation/MainNavigator.tsx");
      expect(content).toContain("createNativeStackNavigator");
      expect(content).toContain("@react-navigation/native-stack");
    });
  });

  describe("custom component serialization", () => {
    it("should generate custom component files", () => {
      const text = createNode({
        type: "component",
        component_type: "Text",
        name: "ButtonText",
      });

      const customButton = createNode({
        type: "custom_component",
        name: "CustomButton",
        children: [text],
      });

      const screen = createNode({
        type: "screen",
        name: "Home",
        children: [customButton],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);

      expect(output.has("src/components/CustomButton.tsx")).toBe(true);
      const componentContent = output.get("src/components/CustomButton.tsx");
      expect(componentContent).toContain("export function CustomButton()");
    });
  });

  describe("style handling", () => {
    it("should generate unique style names for duplicate names", () => {
      const view1 = createNode({
        type: "component",
        component_type: "View",
        name: "container",
        style: { layout: { flex: 1 } },
      });

      const view2 = createNode({
        type: "component",
        component_type: "View",
        name: "container",
        style: { layout: { flex: 2 } },
      });

      const screen = createNode({
        type: "screen",
        name: "Home",
        children: [view1, view2],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/home.tsx");

      expect(content).toContain("styles.container");
      expect(content).toMatch(/styles\.container\d/);
    });

    it("should flatten nested style objects", () => {
      const view = createNode({
        type: "component",
        component_type: "View",
        name: "Box",
        style: {
          layout: { flex: 1, flexDirection: "row" },
          spacing: { padding: 16, margin: 8 },
          colors: { backgroundColor: "#f0f0f0" },
        },
      });

      const screen = createNode({
        type: "screen",
        name: "Home",
        children: [view],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/home.tsx");

      expect(content).toContain("flex: 1");
      expect(content).toContain('flexDirection: "row"');
      expect(content).toContain("padding: 16");
      expect(content).toContain("margin: 8");
      expect(content).toContain('backgroundColor: "#f0f0f0"');
    });

    it("should not add style prop for components without styles", () => {
      const view = createNode({
        type: "component",
        component_type: "View",
        name: "EmptyView",
        style: {},
      });

      const screen = createNode({
        type: "screen",
        name: "Home",
        children: [view],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/home.tsx");

      expect(content).not.toContain("styles.emptyView");
    });
  });

  describe("unknown component handling", () => {
    it("should auto-import unknown components from components directory", () => {
      const customWidget = createNode({
        type: "component",
        component_type: "MyCustomWidget",
        name: "Widget",
      });

      const screen = createNode({
        type: "screen",
        name: "Home",
        children: [customWidget],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/home.tsx");

      expect(content).toContain('import MyCustomWidget from "../components/MyCustomWidget"');
      expect(content).toContain("<MyCustomWidget");
    });

    it("should handle multiple unknown components with separate imports", () => {
      const widget1 = createNode({
        type: "component",
        component_type: "CustomCard",
        name: "Card1",
      });

      const widget2 = createNode({
        type: "component",
        component_type: "CustomBadge",
        name: "Badge1",
      });

      const screen = createNode({
        type: "screen",
        name: "Dashboard",
        children: [widget1, widget2],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/dashboard.tsx");

      expect(content).toContain('import CustomCard from "../components/CustomCard"');
      expect(content).toContain('import CustomBadge from "../components/CustomBadge"');
    });

    it("should import expanded React Native components correctly", () => {
      const imageBackground = createNode({
        type: "component",
        component_type: "ImageBackground",
        name: "Background",
        props: { source: { uri: "https://example.com/bg.png" } },
      });

      const screen = createNode({
        type: "screen",
        name: "Splash",
        children: [imageBackground],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/splash.tsx");

      expect(content).toContain("ImageBackground");
      expect(content).toContain("react-native");
    });

    it("should import expanded Expo components correctly", () => {
      const video = createNode({
        type: "component",
        component_type: "Video",
        name: "Player",
        props: { source: { uri: "https://example.com/video.mp4" } },
      });

      const screen = createNode({
        type: "screen",
        name: "VideoPlayer",
        children: [video],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/video-player.tsx");

      expect(content).toContain("Video");
      expect(content).toContain("expo-av");
    });

    it("should import WebView from react-native-webview", () => {
      const webview = createNode({
        type: "component",
        component_type: "WebView",
        name: "Browser",
        props: { source: { uri: "https://example.com" } },
      });

      const screen = createNode({
        type: "screen",
        name: "WebBrowser",
        children: [webview],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/web-browser.tsx");

      expect(content).toContain("WebView");
      expect(content).toContain("react-native-webview");
    });
  });

  describe("project scaffolding", () => {
    it("should generate package.json with correct dependencies", () => {
      const video = createNode({
        type: "component",
        component_type: "Video",
        name: "Player",
      });

      const screen = createNode({
        type: "screen",
        name: "VideoPlayer",
        children: [video],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root, { includeScaffolding: true });

      expect(output.has("package.json")).toBe(true);
      const packageJson = JSON.parse(output.get("package.json")!);
      expect(packageJson.dependencies.expo).toBeDefined();
      expect(packageJson.dependencies["expo-av"]).toBeDefined();
      expect(packageJson.dependencies.react).toBeDefined();
    });

    it("should generate app.json with project metadata", () => {
      const screen = createNode({
        type: "screen",
        name: "Home",
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root, {
        includeScaffolding: true,
        projectName: "Test App",
        projectSlug: "test-app",
        projectVersion: "2.0.0",
      });

      expect(output.has("app.json")).toBe(true);
      const appJson = JSON.parse(output.get("app.json")!);
      expect(appJson.expo.name).toBe("Test App");
      expect(appJson.expo.slug).toBe("test-app");
      expect(appJson.expo.version).toBe("2.0.0");
    });

    it("should generate tsconfig.json for TypeScript projects", () => {
      const screen = createNode({
        type: "screen",
        name: "Home",
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root, {
        includeScaffolding: true,
        useTypeScript: true,
      });

      expect(output.has("tsconfig.json")).toBe(true);
      const tsConfig = JSON.parse(output.get("tsconfig.json")!);
      expect(tsConfig.compilerOptions.strict).toBe(true);
    });

    it("should generate babel.config.js", () => {
      const screen = createNode({
        type: "screen",
        name: "Home",
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root, { includeScaffolding: true });

      expect(output.has("babel.config.js")).toBe(true);
      expect(output.get("babel.config.js")).toContain("babel-preset-expo");
    });

    it("should generate .gitignore", () => {
      const screen = createNode({
        type: "screen",
        name: "Home",
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root, { includeScaffolding: true });

      expect(output.has(".gitignore")).toBe(true);
      expect(output.get(".gitignore")).toContain("node_modules");
      expect(output.get(".gitignore")).toContain(".expo");
    });

    it("should include expo-router dependencies when using expo-router", () => {
      const screen = createNode({
        type: "screen",
        name: "Home",
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root, {
        includeScaffolding: true,
        expoRouter: true,
      });

      const packageJson = JSON.parse(output.get("package.json")!);
      expect(packageJson.dependencies["expo-router"]).toBeDefined();
      expect(packageJson.main).toBe("expo-router/entry");
    });

    it("should not include scaffolding when includeScaffolding is false", () => {
      const screen = createNode({
        type: "screen",
        name: "Home",
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root, { includeScaffolding: false });

      expect(output.has("package.json")).toBe(false);
      expect(output.has("app.json")).toBe(false);
      expect(output.has("tsconfig.json")).toBe(false);
    });

    it("should track all used third-party packages", () => {
      const mapView = createNode({
        type: "component",
        component_type: "MapView",
        name: "Map",
      });

      const lottie = createNode({
        type: "component",
        component_type: "LottieView",
        name: "Animation",
      });

      const screen = createNode({
        type: "screen",
        name: "Home",
        children: [mapView, lottie],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root, { includeScaffolding: true });

      const packageJson = JSON.parse(output.get("package.json")!);
      expect(packageJson.dependencies["react-native-maps"]).toBeDefined();
      expect(packageJson.dependencies["lottie-react-native"]).toBeDefined();
    });
  });

  describe("props handling", () => {
    it("should serialize string props with quotes", () => {
      const text = createNode({
        type: "component",
        component_type: "Text",
        name: "Label",
        props: { testID: "my-label" },
      });

      const screen = createNode({
        type: "screen",
        name: "Home",
        children: [text],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/home.tsx");

      expect(content).toContain('testID="my-label"');
    });

    it("should serialize boolean props", () => {
      const input = createNode({
        type: "component",
        component_type: "TextInput",
        name: "Input",
        props: { secureTextEntry: true, editable: false },
      });

      const screen = createNode({
        type: "screen",
        name: "Login",
        children: [input],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/login.tsx");

      expect(content).toContain("secureTextEntry");
      expect(content).toContain("editable={false}");
    });

    it("should serialize numeric props", () => {
      const input = createNode({
        type: "component",
        component_type: "TextInput",
        name: "Input",
        props: { maxLength: 100 },
      });

      const screen = createNode({
        type: "screen",
        name: "Form",
        children: [input],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/form.tsx");

      expect(content).toContain("maxLength={100}");
    });

    it("should serialize object props as JSON", () => {
      const image = createNode({
        type: "component",
        component_type: "Image",
        name: "Avatar",
        props: { source: { uri: "https://example.com/avatar.png" } },
      });

      const screen = createNode({
        type: "screen",
        name: "Profile",
        children: [image],
      });

      let root = createRootNode();
      root = addNode(root, root.id, screen);

      const output = serialize(root);
      const content = output.get("src/app/profile.tsx");

      expect(content).toContain("source=");
      expect(content).toContain("uri");
    });
  });
});
