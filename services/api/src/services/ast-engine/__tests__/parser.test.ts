import { describe, it, expect } from "vitest";
import { parseSourceCode, parseMultipleFiles } from "../parser";

describe("parseSourceCode", () => {
  describe("basic parsing", () => {
    it("should parse a simple React Native component", () => {
      const source = `
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(0);
      expect(result.screens).toHaveLength(1);
      expect(result.screens[0]?.name).toBe("HomeScreen");
      expect(result.screens[0]?.type).toBe("screen");
    });

    it("should parse a named export component", () => {
      const source = `
import React from "react";
import { View, Text } from "react-native";

export function Button() {
  return (
    <View>
      <Text>Click me</Text>
    </View>
  );
}
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(0);
      expect(result.components).toHaveLength(1);
      expect(result.components[0]?.name).toBe("Button");
      expect(result.components[0]?.type).toBe("custom_component");
    });

    it("should parse arrow function component", () => {
      const source = `
import React from "react";
import { View, Text } from "react-native";

export const Card = () => {
  return (
    <View>
      <Text>Card content</Text>
    </View>
  );
};
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(0);
      expect(result.components).toHaveLength(1);
      expect(result.components[0]?.name).toBe("Card");
    });

    it("should return error for empty source", () => {
      const result = parseSourceCode("");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe("EMPTY_SOURCE");
      expect(result.ast).toBeNull();
    });

    it("should return error for invalid syntax", () => {
      const source = `
import React from "react;
export function Broken() {
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.code).toBe("PARSE_ERROR");
    });
  });

  describe("style extraction", () => {
    it("should extract styles from StyleSheet.create", () => {
      const source = `
import React from "react";
import { View, StyleSheet } from "react-native";

export default function ProfileScreen() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    margin: 8,
    width: 100,
    height: 50,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    borderWidth: 1,
    opacity: 0.9,
  },
});
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(0);
      expect(result.screens).toHaveLength(1);

      const screen = result.screens[0]!;
      expect(screen.children).toHaveLength(1);

      const view = screen.children[0]!;
      expect(view.style.layout?.flex).toBe(1);
      expect(view.style.layout?.flexDirection).toBe("row");
      expect(view.style.layout?.justifyContent).toBe("center");
      expect(view.style.layout?.alignItems).toBe("center");
      expect(view.style.spacing?.padding).toBe(16);
      expect(view.style.spacing?.margin).toBe(8);
      expect(view.style.sizing?.width).toBe(100);
      expect(view.style.sizing?.height).toBe(50);
      expect(view.style.colors?.backgroundColor).toBe("#f0f0f0");
      expect(view.style.borders?.borderRadius).toBe(8);
      expect(view.style.borders?.borderWidth).toBe(1);
      expect(view.style.effects?.opacity).toBe(0.9);
    });

    it("should handle typography styles", () => {
      const source = `
import React from "react";
import { Text, StyleSheet } from "react-native";

export default function TitleScreen() {
  return <Text style={styles.title}>Hello</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "bold",
    fontStyle: "italic",
    lineHeight: 32,
    textAlign: "center",
    color: "#333",
  },
});
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(0);
      const screen = result.screens[0]!;
      const text = screen.children[0]!;

      expect(text.style.typography?.fontSize).toBe(24);
      expect(text.style.typography?.fontWeight).toBe("bold");
      expect(text.style.typography?.fontStyle).toBe("italic");
      expect(text.style.typography?.lineHeight).toBe(32);
      expect(text.style.typography?.textAlign).toBe("center");
      expect(text.style.colors?.color).toBe("#333");
    });
  });

  describe("props extraction", () => {
    it("should extract string props", () => {
      const source = `
import React from "react";
import { View, Text, TextInput } from "react-native";

export default function FormScreen() {
  return (
    <View>
      <TextInput placeholder="Enter name" keyboardType="email-address" />
    </View>
  );
}
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(0);
      const screen = result.screens[0]!;
      const view = screen.children[0]!;
      const input = view.children[0]!;

      expect(input.props.placeholder).toBe("Enter name");
      expect(input.props.keyboardType).toBe("email-address");
    });

    it("should extract boolean props", () => {
      const source = `
import React from "react";
import { View, TextInput } from "react-native";

export default function InputScreen() {
  return (
    <View>
      <TextInput secureTextEntry autoFocus={false} />
    </View>
  );
}
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(0);
      const input = result.screens[0]!.children[0]!.children[0]!;

      expect(input.props.secureTextEntry).toBe(true);
      expect(input.props.autoFocus).toBe(false);
    });

    it("should extract numeric props", () => {
      const source = `
import React from "react";
import { View, TextInput } from "react-native";

export default function InputScreen() {
  return (
    <View>
      <TextInput maxLength={100} numberOfLines={3} />
    </View>
  );
}
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(0);
      const input = result.screens[0]!.children[0]!.children[0]!;

      expect(input.props.maxLength).toBe(100);
      expect(input.props.numberOfLines).toBe(3);
    });

    it("should extract text content as children prop", () => {
      const source = `
import React from "react";
import { View, Text } from "react-native";

export default function HelloScreen() {
  return (
    <View>
      <Text>Hello World</Text>
    </View>
  );
}
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(0);
      const text = result.screens[0]!.children[0]!.children[0]!;

      expect(text.props.children).toBe("Hello World");
    });
  });

  describe("component type detection", () => {
    it("should detect Screen suffix as screen type", () => {
      const source = `
import React from "react";
import { View } from "react-native";

export default function SettingsScreen() {
  return <View />;
}
      `;

      const result = parseSourceCode(source);

      expect(result.screens).toHaveLength(1);
      expect(result.screens[0]?.type).toBe("screen");
    });

    it("should detect Page suffix as screen type", () => {
      const source = `
import React from "react";
import { View } from "react-native";

export default function HomePage() {
  return <View />;
}
      `;

      const result = parseSourceCode(source);

      expect(result.screens).toHaveLength(1);
      expect(result.screens[0]?.type).toBe("screen");
    });

    it("should detect expo-router import as screen", () => {
      const source = `
import React from "react";
import { View } from "react-native";
import { Link } from "expo-router";

export default function Index() {
  return <View />;
}
      `;

      const result = parseSourceCode(source);

      expect(result.screens).toHaveLength(1);
    });

    it("should detect regular component as custom_component", () => {
      const source = `
import React from "react";
import { View } from "react-native";

export function Avatar() {
  return <View />;
}
      `;

      const result = parseSourceCode(source);

      expect(result.components).toHaveLength(1);
      expect(result.components[0]?.type).toBe("custom_component");
    });
  });

  describe("nested components", () => {
    it("should parse nested JSX elements", () => {
      const source = `
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function CardScreen() {
  return (
    <View>
      <TouchableOpacity>
        <View>
          <Text>Title</Text>
          <Text>Subtitle</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(0);
      const screen = result.screens[0]!;

      expect(screen.children).toHaveLength(1);
      const outerView = screen.children[0]!;
      expect(outerView.component_type).toBe("View");

      const touchable = outerView.children[0]!;
      expect(touchable.component_type).toBe("TouchableOpacity");

      const innerView = touchable.children[0]!;
      expect(innerView.component_type).toBe("View");

      expect(innerView.children).toHaveLength(2);
      expect(innerView.children[0]?.component_type).toBe("Text");
      expect(innerView.children[1]?.component_type).toBe("Text");
    });
  });

  describe("multiple exports", () => {
    it("should handle multiple exported components", () => {
      const source = `
import React from "react";
import { View, Text } from "react-native";

export function Header() {
  return <View><Text>Header</Text></View>;
}

export function Footer() {
  return <View><Text>Footer</Text></View>;
}
      `;

      const result = parseSourceCode(source);

      expect(result.errors).toHaveLength(0);
      expect(result.components).toHaveLength(2);
      expect(result.components.map(c => c.name)).toContain("Header");
      expect(result.components.map(c => c.name)).toContain("Footer");
    });
  });

  describe("AST root creation", () => {
    it("should create root AST node with children", () => {
      const source = `
import React from "react";
import { View } from "react-native";

export default function MainScreen() {
  return <View />;
}
      `;

      const result = parseSourceCode(source);

      expect(result.ast).not.toBeNull();
      expect(result.ast?.type).toBe("root");
      expect(result.ast?.name).toBe("root");
      expect(result.ast?.children).toHaveLength(1);
    });

    it("should include metadata", () => {
      const source = `
import React from "react";
import { View } from "react-native";

export default function TestScreen() {
  return <View />;
}
      `;

      const result = parseSourceCode(source);

      const screen = result.screens[0]!;
      expect(screen.meta.source).toBe("code");
      expect(screen.meta.created_at).toBeDefined();
      expect(screen.meta.version).toBe(1);
    });
  });
});

describe("parseMultipleFiles", () => {
  it("should parse multiple files and combine into single AST", () => {
    const files = new Map<string, string>();

    files.set("screens/HomeScreen.tsx", `
import React from "react";
import { View, Text } from "react-native";

export default function HomeScreen() {
  return <View><Text>Home</Text></View>;
}
    `);

    files.set("components/Button.tsx", `
import React from "react";
import { TouchableOpacity, Text } from "react-native";

export function Button() {
  return <TouchableOpacity><Text>Click</Text></TouchableOpacity>;
}
    `);

    const result = parseMultipleFiles(files);

    expect(result.errors).toHaveLength(0);
    expect(result.screens).toHaveLength(1);
    expect(result.components).toHaveLength(1);
    expect(result.ast?.children).toHaveLength(2);
  });

  it("should collect errors from all files", () => {
    const files = new Map<string, string>();

    files.set("valid.tsx", `
import React from "react";
import { View } from "react-native";
export function Valid() { return <View />; }
    `);

    files.set("invalid.tsx", `
import React from "react
    `);

    const result = parseMultipleFiles(files);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.message.includes("[invalid.tsx]"))).toBe(true);
  });
});
