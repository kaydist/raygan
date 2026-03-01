export interface FewShotExample {
  userMessage: string;
  assistantResponse: string;
  tags: string[];
}

export const SIMPLE_APP_EXAMPLE: FewShotExample = {
  tags: ["app", "simple", "starter"],
  userMessage: "Create a simple counter app",
  assistantResponse: `I'll create a simple counter app with increment/decrement functionality and a clean design.

## Tasks
- [ ] Set up design tokens
- [ ] Create counter screen

### Set up design tokens

\`\`\`ts filename="utils/tokens.ts"
export const colors = {
  background: "#f5f5f5",
  text: "#1a1a1a",
  textSecondary: "#333",
  white: "#fff",
  danger: "#ef4444",
  success: "#22c55e",
} as const;

export const spacing = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;
\`\`\`

- [x] Set up design tokens

### Create counter screen

\`\`\`tsx filename="app/index.tsx"
import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors, spacing } from "../utils/tokens";

export default function HomeScreen() {
  const [count, setCount] = useState(0);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Counter</Text>
      <Text style={styles.count}>{count}</Text>
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.decrementButton]}
          onPress={() => setCount(c => c - 1)}
          accessibilityLabel="Decrement counter"
        >
          <Text style={styles.buttonText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.incrementButton]}
          onPress={() => setCount(c => c + 1)}
          accessibilityLabel="Increment counter"
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 20,
  },
  count: {
    fontSize: 72,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 40,
  },
  buttons: {
    flexDirection: "row",
    gap: 20,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  decrementButton: {
    backgroundColor: colors.danger,
  },
  incrementButton: {
    backgroundColor: colors.success,
  },
  buttonText: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.white,
  },
});
\`\`\`

- [x] Create counter screen`,
};

export const TODO_APP_EXAMPLE: FewShotExample = {
  tags: ["app", "todo", "list", "crud"],
  userMessage: "Create a todo app",
  assistantResponse: `I'll create a complete todo app with add, complete, and delete functionality using a clean architecture.

## Tasks
- [ ] Set up types and design tokens
- [ ] Create TodoItem component
- [ ] Build main App screen

### Set up types and design tokens

\`\`\`ts filename="types/todo.ts"
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}
\`\`\`

\`\`\`ts filename="utils/tokens.ts"
export const colors = {
  background: "#fff",
  surface: "#f9fafb",
  inputBg: "#f3f4f6",
  primary: "#3b82f6",
  primaryMuted: "#93c5fd",
  text: "#1a1a1a",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  border: "#d1d5db",
  danger: "#ef4444",
  white: "#fff",
} as const;
\`\`\`

- [x] Set up types and design tokens

### Create TodoItem component

\`\`\`tsx filename="components/TodoItem.tsx"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../utils/tokens";
import type { Todo } from "../types/todo";

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <View style={styles.todoItem}>
      <TouchableOpacity
        style={styles.todoContent}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: todo.completed }}
      >
        <View style={[styles.checkbox, todo.completed && styles.checkboxChecked]}>
          {todo.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.todoText, todo.completed && styles.todoTextCompleted]}>
          {todo.text}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.deleteButton} accessibilityLabel="Delete todo">
        <Text style={styles.deleteText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  todoItem: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8 },
  todoContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: "700" },
  todoText: { flex: 1, fontSize: 16, color: colors.text },
  todoTextCompleted: { textDecorationLine: "line-through", color: colors.textMuted },
  deleteButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  deleteText: { fontSize: 24, color: colors.danger, fontWeight: "300" },
});
\`\`\`

- [x] Create TodoItem component

### Build main App screen

\`\`\`tsx filename="app/index.tsx"
import { useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { TodoItem } from "../components/TodoItem";
import { colors } from "../utils/tokens";
import type { Todo } from "../types/todo";

export default function HomeScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");

  const addTodo = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setTodos(prev => [{ id: Date.now().toString(), text: trimmed, completed: false }, ...prev]);
    setInput("");
  }, [input]);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const renderTodo = useCallback(
    ({ item }: { item: Todo }) => (
      <TodoItem todo={item} onToggle={() => toggleTodo(item.id)} onDelete={() => deleteTodo(item.id)} />
    ),
    [toggleTodo, deleteTodo]
  );

  const completedCount = todos.filter(t => t.completed).length;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
          <Text style={styles.title}>My Todos</Text>
          {todos.length > 0 && <Text style={styles.stats}>{completedCount} of {todos.length} completed</Text>}
          <View style={styles.inputRow}>
            <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Add a new todo..." placeholderTextColor={colors.textMuted} onSubmitEditing={addTodo} returnKeyType="done" />
            <TouchableOpacity style={[styles.addButton, !input.trim() && styles.addButtonDisabled]} onPress={addTodo} disabled={!input.trim()} accessibilityLabel="Add todo">
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {todos.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No todos yet</Text>
              <Text style={styles.emptySubtext}>Add one above to get started</Text>
            </View>
          ) : (
            <FlatList data={todos} renderItem={renderTodo} keyExtractor={item => item.id} style={styles.list} showsVerticalScrollIndicator={false} />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text, marginBottom: 4 },
  stats: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
  inputRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  input: { flex: 1, height: 48, backgroundColor: colors.inputBg, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: colors.text },
  addButton: { height: 48, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addButtonDisabled: { backgroundColor: colors.primaryMuted },
  addButtonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  list: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 18, fontWeight: "600", color: colors.textSecondary },
  emptySubtext: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
});
\`\`\`

- [x] Build main App screen`,
};

export const CALCULATOR_EXAMPLE: FewShotExample = {
  tags: ["app", "calculator", "math"],
  userMessage: "Build a calculator app",
  assistantResponse: `I'll create a functional calculator app with a clean design.

\`\`\`tsx filename="app/index.tsx"
import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const BUTTON_SIZE = (width - 60) / 4;

type Operator = "+" | "-" | "×" | "÷" | null;

function CalcButton({
  label,
  onPress,
  variant = "number",
}: {
  label: string;
  onPress: () => void;
  variant?: "number" | "operator" | "function" | "equals";
}) {
  return (
    <TouchableOpacity
      style={[styles.button, styles[\`button_\${variant}\`]]}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Text style={[styles.buttonText, styles[\`text_\${variant}\`]]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  const inputPercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const performOperation = (nextOperator: Operator) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const result = calculate(previousValue, inputValue, operator);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (a: number, b: number, op: Operator): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleEquals = () => {
    if (operator && previousValue !== null) {
      const inputValue = parseFloat(display);
      const result = calculate(previousValue, inputValue, operator);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  };

  const formatDisplay = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0";
    if (value.includes(".") && value.endsWith("0") && !value.endsWith(".0")) {
      return value;
    }
    if (Math.abs(num) >= 1e9) {
      return num.toExponential(4);
    }
    return num.toLocaleString("en-US", { maximumFractionDigits: 8 });
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.display}>
          <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
            {formatDisplay(display)}
          </Text>
        </View>
        <View style={styles.buttons}>
          <View style={styles.row}>
            <CalcButton label="AC" onPress={clear} variant="function" />
            <CalcButton label="±" onPress={toggleSign} variant="function" />
            <CalcButton label="%" onPress={inputPercent} variant="function" />
            <CalcButton label="÷" onPress={() => performOperation("÷")} variant="operator" />
          </View>
          <View style={styles.row}>
            <CalcButton label="7" onPress={() => inputDigit("7")} />
            <CalcButton label="8" onPress={() => inputDigit("8")} />
            <CalcButton label="9" onPress={() => inputDigit("9")} />
            <CalcButton label="×" onPress={() => performOperation("×")} variant="operator" />
          </View>
          <View style={styles.row}>
            <CalcButton label="4" onPress={() => inputDigit("4")} />
            <CalcButton label="5" onPress={() => inputDigit("5")} />
            <CalcButton label="6" onPress={() => inputDigit("6")} />
            <CalcButton label="-" onPress={() => performOperation("-")} variant="operator" />
          </View>
          <View style={styles.row}>
            <CalcButton label="1" onPress={() => inputDigit("1")} />
            <CalcButton label="2" onPress={() => inputDigit("2")} />
            <CalcButton label="3" onPress={() => inputDigit("3")} />
            <CalcButton label="+" onPress={() => performOperation("+")} variant="operator" />
          </View>
          <View style={styles.row}>
            <CalcButton label="0" onPress={() => inputDigit("0")} />
            <CalcButton label="." onPress={inputDecimal} />
            <CalcButton label="=" onPress={handleEquals} variant="equals" />
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  display: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: 20,
  },
  displayText: {
    color: "#fff",
    fontSize: 64,
    fontWeight: "300",
  },
  buttons: {
    padding: 10,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  button_number: {
    backgroundColor: "#333",
  },
  button_operator: {
    backgroundColor: "#ff9f0a",
  },
  button_function: {
    backgroundColor: "#a5a5a5",
  },
  button_equals: {
    backgroundColor: "#ff9f0a",
    width: BUTTON_SIZE * 2 + 10,
  },
  buttonText: {
    fontSize: 32,
    fontWeight: "500",
  },
  text_number: {
    color: "#fff",
  },
  text_operator: {
    color: "#fff",
  },
  text_function: {
    color: "#000",
  },
  text_equals: {
    color: "#fff",
  },
});
\`\`\`

This calculator includes:
- Basic arithmetic operations (+, -, ×, ÷)
- Percent and sign toggle functions
- Decimal support
- Large number formatting
- iOS calculator-inspired design`,
};

export const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  SIMPLE_APP_EXAMPLE,
  TODO_APP_EXAMPLE,
  CALCULATOR_EXAMPLE,
  {
    tags: ["component", "basic", "screen"],
    userMessage: "Create a login screen with email and password fields",
    assistantResponse: `I'll create a login screen with proper folder structure, design tokens, and reusable components.

\`\`\`ts filename="utils/tokens/colors.ts"
export const colors = {
  primary: {
    50: "#EEF2FF",
    100: "#E0E7FF",
    500: "#6366F1",
    600: "#4F46E5",
    700: "#4338CA",
  },
  neutral: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    400: "#9CA3AF",
    500: "#6B7280",
    700: "#374151",
    900: "#111827",
  },
  error: {
    50: "#FEE2E2",
    500: "#EF4444",
    600: "#DC2626",
  },
  white: "#FFFFFF",
} as const;
\`\`\`

\`\`\`ts filename="utils/tokens/typography.ts"
import { StyleSheet } from "react-native";

export const typography = StyleSheet.create({
  h1: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 32,
  },
  body: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  button: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
});
\`\`\`

\`\`\`ts filename="utils/tokens/spacing.ts"
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;
\`\`\`

\`\`\`ts filename="utils/tokens/index.ts"
export { colors } from "./colors";
export { typography } from "./typography";
export { spacing, radius } from "./spacing";
\`\`\`

\`\`\`tsx filename="components/atoms/Input.tsx"
import { TextInput, StyleSheet, type TextInputProps } from "react-native";
import { colors, spacing, radius } from "@/utils/tokens";

interface InputProps extends TextInputProps {
  error?: boolean;
}

export function Input({ error, style, ...props }: InputProps) {
  return (
    <TextInput
      style={[styles.input, error && styles.inputError, style]}
      placeholderTextColor={colors.neutral[400]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 52,
    backgroundColor: colors.neutral[50],
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.neutral[900],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  inputError: {
    borderColor: colors.error[500],
  },
});
\`\`\`

\`\`\`tsx filename="components/atoms/Button.tsx"
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from "react-native";
import { colors, typography, spacing, radius } from "@/utils/tokens";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ title, loading, variant = "primary", disabled, style, ...props }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, styles[variant], disabled && styles.disabled, style]}
      disabled={disabled || loading}
      accessibilityRole="button"
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.primary[500]} />
      ) : (
        <Text style={[styles.text, styles[\`\${variant}Text\`]]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  primary: {
    backgroundColor: colors.primary[500],
  },
  secondary: {
    backgroundColor: colors.neutral[100],
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...typography.button,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.neutral[900],
  },
  ghostText: {
    color: colors.primary[500],
  },
});
\`\`\`

\`\`\`tsx filename="components/molecules/FormField.tsx"
import { View, Text, StyleSheet } from "react-native";
import { Input } from "@/components/atoms/Input";
import { colors, typography, spacing } from "@/utils/tokens";
import type { TextInputProps } from "react-native";

interface FormFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function FormField({ label, error, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Input error={!!error} {...inputProps} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.neutral[700],
  },
  error: {
    ...typography.bodySmall,
    color: colors.error[600],
  },
});
\`\`\`

\`\`\`tsx filename="screens/LoginScreen.tsx"
import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/atoms/Button";
import { FormField } from "@/components/molecules/FormField";
import { colors, typography, spacing } from "@/utils/tokens";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
}

export function LoginScreen({ onLogin, onForgotPassword, onSignUp }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <FormField
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email input"
          />

          <FormField
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            accessibilityLabel="Password input"
          />

          {onForgotPassword && (
            <Button
              title="Forgot Password?"
              variant="ghost"
              onPress={onForgotPassword}
              style={styles.forgotButton}
            />
          )}

          <Button
            title="Sign In"
            loading={loading}
            onPress={handleLogin}
            accessibilityLabel="Sign in button"
          />
        </View>

        {onSignUp && (
          <View style={styles.signUpRow}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <Button title="Sign Up" variant="ghost" onPress={onSignUp} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
  },
  title: {
    ...typography.h1,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.neutral[500],
    marginBottom: spacing.xxl,
  },
  errorBanner: {
    backgroundColor: colors.error[50],
    padding: spacing.md,
    borderRadius: spacing.sm,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error[600],
  },
  form: {
    gap: spacing.lg,
  },
  forgotButton: {
    alignSelf: "flex-end",
  },
  signUpRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  signUpText: {
    ...typography.body,
    color: colors.neutral[500],
  },
});
\`\`\`

This structure follows:
- **Atomic Design**: atoms (Input, Button) → molecules (FormField) → screens
- **Design Tokens**: colors, typography, spacing in \`utils/tokens/\`
- **Barrel exports**: index.ts for clean imports`,
  },
  {
    tags: ["list", "flatlist", "data"],
    userMessage: "Create a product list with images, prices, and add to cart button",
    assistantResponse: `I'll create a product list using Atomic Design with proper design tokens.

\`\`\`tsx filename="components/atoms/ProductImage.tsx"
import { Image, StyleSheet, View } from "react-native";
import { colors, radius } from "@/utils/tokens";

interface ProductImageProps {
  uri: string;
  size?: "small" | "medium" | "large";
}

const sizes = {
  small: 80,
  medium: 120,
  large: 150,
};

export function ProductImage({ uri, size = "medium" }: ProductImageProps) {
  const dimension = sizes[size];

  return (
    <View style={[styles.container, { width: "100%", height: dimension }]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[100],
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
\`\`\`

\`\`\`tsx filename="components/atoms/Price.tsx"
import { Text, StyleSheet } from "react-native";
import { colors, typography } from "@/utils/tokens";

interface PriceProps {
  amount: number;
  currency?: string;
  size?: "small" | "medium" | "large";
}

export function Price({ amount, currency = "USD", size = "medium" }: PriceProps) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);

  return <Text style={[styles.price, styles[size]]}>{formatted}</Text>;
}

const styles = StyleSheet.create({
  price: {
    color: colors.primary[500],
    fontWeight: "700",
  },
  small: {
    fontSize: 14,
  },
  medium: {
    fontSize: 16,
  },
  large: {
    fontSize: 20,
  },
});
\`\`\`

\`\`\`tsx filename="components/molecules/ProductCard.tsx"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ProductImage } from "@/components/atoms/ProductImage";
import { Price } from "@/components/atoms/Price";
import { Button } from "@/components/atoms/Button";
import { colors, typography, spacing, radius } from "@/utils/tokens";

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onAddToCart: () => void;
}

export function ProductCard({ product, onPress, onAddToCart }: ProductCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={\`View \${product.name}\`}
    >
      <ProductImage uri={product.image} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Price amount={product.price} />
        <Button
          title="Add to Cart"
          onPress={onAddToCart}
          style={styles.addButton}
          accessibilityLabel={\`Add \${product.name} to cart\`}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    ...typography.label,
    color: colors.neutral[900],
  },
  addButton: {
    marginTop: spacing.sm,
    height: 40,
  },
});
\`\`\`

\`\`\`tsx filename="components/organisms/ProductList.tsx"
import { useCallback } from "react";
import { FlatList, View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { ProductCard, type Product } from "@/components/molecules/ProductCard";
import { colors, typography, spacing } from "@/utils/tokens";

interface ProductListProps {
  products: Product[];
  loading?: boolean;
  onAddToCart: (product: Product) => void;
  onProductPress?: (product: Product) => void;
}

export function ProductList({ products, loading, onAddToCart, onProductPress }: ProductListProps) {
  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        onPress={() => onProductPress?.(item)}
        onAddToCart={() => onAddToCart(item)}
      />
    ),
    [onAddToCart, onProductPress]
  );

  const keyExtractor = useCallback((item: Product) => item.id, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No products found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={renderProduct}
      keyExtractor={keyExtractor}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: spacing.lg,
  },
  row: {
    justifyContent: "space-between",
  },
  emptyText: {
    ...typography.body,
    color: colors.neutral[400],
  },
});
\`\`\`

Structure:
- **atoms**: ProductImage, Price, Button
- **molecules**: ProductCard (combines atoms)
- **organisms**: ProductList (manages list logic)`,
  },
  {
    tags: ["api", "hook", "supabase"],
    userMessage: "Create a hook to fetch and manage todos from Supabase",
    assistantResponse: `I'll create a custom hook with proper utility organization.

\`\`\`ts filename="utils/api/supabase.ts"
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
\`\`\`

\`\`\`ts filename="utils/api/index.ts"
export { supabase } from "./supabase";
\`\`\`

\`\`\`ts filename="types/todo.ts"
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  user_id: string;
}

export type CreateTodoInput = Pick<Todo, "title">;
export type UpdateTodoInput = Partial<Pick<Todo, "title" | "completed">>;
\`\`\`

\`\`\`ts filename="hooks/useTodos.ts"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/api";
import type { Todo, CreateTodoInput, UpdateTodoInput } from "@/types/todo";

const QUERY_KEY = ["todos"];

async function fetchTodos(): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const { data, error } = await supabase
    .from("todos")
    .insert({ title: input.title, completed: false })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo> {
  const { data, error } = await supabase
    .from("todos")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw error;
}

export function useTodos() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchTodos,
  });

  const createMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateTodoInput) => updateTodo(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    todos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: (id: string, input: UpdateTodoInput) => updateMutation.mutateAsync({ id, ...input }),
    remove: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
\`\`\`

Structure:
- **utils/api/**: API clients (Supabase, fetch wrappers)
- **types/**: TypeScript interfaces
- **hooks/**: Custom React hooks`,
  },
];

export function getExamplesForTags(tags: string[]): FewShotExample[] {
  return FEW_SHOT_EXAMPLES.filter((example) =>
    tags.some((tag) => example.tags.includes(tag))
  );
}

export function formatExamplesForPrompt(examples: FewShotExample[]): string {
  if (examples.length === 0) return "";

  let formatted = "## Examples\n\n";

  for (const example of examples) {
    formatted += `**User:** ${example.userMessage}\n\n`;
    formatted += `**Assistant:** ${example.assistantResponse}\n\n---\n\n`;
  }

  return formatted;
}
