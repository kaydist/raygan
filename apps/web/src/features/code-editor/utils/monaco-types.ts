import type { Monaco } from "@monaco-editor/react";

const REACT_NATIVE_TYPES = `
declare module "react-native" {
  import * as React from "react";

  export interface ViewStyle {
    flex?: number;
    flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
    justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
    alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
    alignSelf?: "auto" | "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
    alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around";
    flexWrap?: "wrap" | "nowrap" | "wrap-reverse";
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number | string;
    position?: "absolute" | "relative";
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
    width?: number | string;
    height?: number | string;
    minWidth?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
    maxHeight?: number | string;
    margin?: number | string;
    marginTop?: number | string;
    marginRight?: number | string;
    marginBottom?: number | string;
    marginLeft?: number | string;
    marginHorizontal?: number | string;
    marginVertical?: number | string;
    padding?: number | string;
    paddingTop?: number | string;
    paddingRight?: number | string;
    paddingBottom?: number | string;
    paddingLeft?: number | string;
    paddingHorizontal?: number | string;
    paddingVertical?: number | string;
    gap?: number;
    rowGap?: number;
    columnGap?: number;
    borderWidth?: number;
    borderTopWidth?: number;
    borderRightWidth?: number;
    borderBottomWidth?: number;
    borderLeftWidth?: number;
    borderColor?: string;
    borderTopColor?: string;
    borderRightColor?: string;
    borderBottomColor?: string;
    borderLeftColor?: string;
    borderRadius?: number;
    borderTopLeftRadius?: number;
    borderTopRightRadius?: number;
    borderBottomLeftRadius?: number;
    borderBottomRightRadius?: number;
    borderStyle?: "solid" | "dotted" | "dashed";
    backgroundColor?: string;
    opacity?: number;
    overflow?: "visible" | "hidden" | "scroll";
    zIndex?: number;
    shadowColor?: string;
    shadowOffset?: { width: number; height: number };
    shadowOpacity?: number;
    shadowRadius?: number;
    elevation?: number;
    transform?: Array<
      | { perspective: number }
      | { rotate: string }
      | { rotateX: string }
      | { rotateY: string }
      | { rotateZ: string }
      | { scale: number }
      | { scaleX: number }
      | { scaleY: number }
      | { translateX: number }
      | { translateY: number }
      | { skewX: string }
      | { skewY: string }
    >;
  }

  export interface TextStyle extends ViewStyle {
    color?: string;
    fontSize?: number;
    fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
    fontStyle?: "normal" | "italic";
    fontFamily?: string;
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: "auto" | "left" | "right" | "center" | "justify";
    textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through";
    textDecorationStyle?: "solid" | "double" | "dotted" | "dashed";
    textDecorationColor?: string;
    textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
    textShadowColor?: string;
    textShadowOffset?: { width: number; height: number };
    textShadowRadius?: number;
  }

  export interface ImageStyle extends ViewStyle {
    resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
    tintColor?: string;
    overlayColor?: string;
  }

  export type StyleProp<T> = T | T[] | undefined | null | false;

  export interface ViewProps {
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
    onLayout?: (event: LayoutChangeEvent) => void;
    pointerEvents?: "auto" | "none" | "box-none" | "box-only";
    testID?: string;
    accessibilityLabel?: string;
    accessible?: boolean;
  }

  export interface TextProps {
    style?: StyleProp<TextStyle>;
    children?: React.ReactNode;
    numberOfLines?: number;
    ellipsizeMode?: "head" | "middle" | "tail" | "clip";
    selectable?: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
    testID?: string;
    accessibilityLabel?: string;
  }

  export interface ImageProps {
    source: { uri: string } | number;
    style?: StyleProp<ImageStyle>;
    resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
    onLoad?: () => void;
    onError?: (error: { nativeEvent: { error: string } }) => void;
    onLoadStart?: () => void;
    onLoadEnd?: () => void;
    testID?: string;
    accessibilityLabel?: string;
  }

  export interface TouchableOpacityProps extends ViewProps {
    onPress?: () => void;
    onLongPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
    activeOpacity?: number;
    disabled?: boolean;
    delayPressIn?: number;
    delayPressOut?: number;
    delayLongPress?: number;
  }

  export interface PressableProps extends ViewProps {
    onPress?: () => void;
    onLongPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
    disabled?: boolean;
    android_ripple?: { color?: string; borderless?: boolean; radius?: number };
  }

  export interface ScrollViewProps extends ViewProps {
    horizontal?: boolean;
    showsVerticalScrollIndicator?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    pagingEnabled?: boolean;
    scrollEnabled?: boolean;
    bounces?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
    onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    keyboardShouldPersistTaps?: "always" | "never" | "handled";
    keyboardDismissMode?: "none" | "on-drag" | "interactive";
    refreshControl?: React.ReactElement;
  }

  export interface TextInputProps {
    style?: StyleProp<TextStyle>;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    placeholderTextColor?: string;
    onChangeText?: (text: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onSubmitEditing?: () => void;
    keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "number-pad" | "decimal-pad";
    secureTextEntry?: boolean;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    autoCorrect?: boolean;
    autoFocus?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
    maxLength?: number;
    editable?: boolean;
    selectTextOnFocus?: boolean;
    returnKeyType?: "done" | "go" | "next" | "search" | "send";
    testID?: string;
  }

  export interface FlatListProps<T> {
    data: T[];
    renderItem: (info: { item: T; index: number }) => React.ReactElement | null;
    keyExtractor?: (item: T, index: number) => string;
    ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
    ListFooterComponent?: React.ComponentType | React.ReactElement | null;
    ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
    ItemSeparatorComponent?: React.ComponentType | null;
    horizontal?: boolean;
    numColumns?: number;
    onEndReached?: () => void;
    onEndReachedThreshold?: number;
    onRefresh?: () => void;
    refreshing?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
    style?: StyleProp<ViewStyle>;
    showsVerticalScrollIndicator?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    initialNumToRender?: number;
    maxToRenderPerBatch?: number;
    windowSize?: number;
    getItemLayout?: (data: T[] | null, index: number) => { length: number; offset: number; index: number };
  }

  export interface SectionListProps<T, S> {
    sections: Array<{ title?: string; data: T[] } & S>;
    renderItem: (info: { item: T; index: number; section: { title?: string; data: T[] } & S }) => React.ReactElement | null;
    renderSectionHeader?: (info: { section: { title?: string; data: T[] } & S }) => React.ReactElement | null;
    keyExtractor?: (item: T, index: number) => string;
    stickySectionHeadersEnabled?: boolean;
  }

  export interface ModalProps {
    visible?: boolean;
    transparent?: boolean;
    animationType?: "none" | "slide" | "fade";
    onRequestClose?: () => void;
    onShow?: () => void;
    children?: React.ReactNode;
    statusBarTranslucent?: boolean;
    presentationStyle?: "fullScreen" | "pageSheet" | "formSheet" | "overFullScreen";
  }

  export interface ActivityIndicatorProps {
    animating?: boolean;
    color?: string;
    size?: "small" | "large" | number;
    style?: StyleProp<ViewStyle>;
  }

  export interface SwitchProps {
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    disabled?: boolean;
    trackColor?: { false?: string; true?: string };
    thumbColor?: string;
    ios_backgroundColor?: string;
  }

  export interface SafeAreaViewProps extends ViewProps {}

  export interface StatusBarProps {
    barStyle?: "default" | "light-content" | "dark-content";
    hidden?: boolean;
    backgroundColor?: string;
    translucent?: boolean;
    animated?: boolean;
  }

  export interface KeyboardAvoidingViewProps extends ViewProps {
    behavior?: "height" | "position" | "padding";
    keyboardVerticalOffset?: number;
    enabled?: boolean;
  }

  export interface LayoutChangeEvent {
    nativeEvent: {
      layout: { x: number; y: number; width: number; height: number };
    };
  }

  export interface NativeSyntheticEvent<T> {
    nativeEvent: T;
  }

  export interface NativeScrollEvent {
    contentOffset: { x: number; y: number };
    contentSize: { width: number; height: number };
    layoutMeasurement: { width: number; height: number };
  }

  export const View: React.FC<ViewProps>;
  export const Text: React.FC<TextProps>;
  export const Image: React.FC<ImageProps>;
  export const TouchableOpacity: React.FC<TouchableOpacityProps>;
  export const TouchableHighlight: React.FC<TouchableOpacityProps>;
  export const TouchableWithoutFeedback: React.FC<TouchableOpacityProps>;
  export const Pressable: React.FC<PressableProps>;
  export const ScrollView: React.FC<ScrollViewProps>;
  export const TextInput: React.FC<TextInputProps>;
  export function FlatList<T>(props: FlatListProps<T>): React.ReactElement;
  export function SectionList<T, S = {}>(props: SectionListProps<T, S>): React.ReactElement;
  export const Modal: React.FC<ModalProps>;
  export const ActivityIndicator: React.FC<ActivityIndicatorProps>;
  export const Switch: React.FC<SwitchProps>;
  export const SafeAreaView: React.FC<SafeAreaViewProps>;
  export const StatusBar: React.FC<StatusBarProps>;
  export const KeyboardAvoidingView: React.FC<KeyboardAvoidingViewProps>;
  export const RefreshControl: React.FC<{ refreshing: boolean; onRefresh?: () => void; colors?: string[]; tintColor?: string }>;

  export const StyleSheet: {
    create<T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(styles: T): T;
    flatten<T>(style: StyleProp<T>): T;
    absoluteFill: ViewStyle;
    absoluteFillObject: ViewStyle;
    hairlineWidth: number;
  };

  export const Dimensions: {
    get(dim: "window" | "screen"): { width: number; height: number; scale: number; fontScale: number };
    addEventListener(type: "change", handler: (dims: { window: { width: number; height: number }; screen: { width: number; height: number } }) => void): { remove: () => void };
  };

  export const Platform: {
    OS: "ios" | "android" | "web";
    Version: number | string;
    isTV: boolean;
    select<T>(specifics: { ios?: T; android?: T; web?: T; default?: T }): T;
  };

  export const Animated: {
    View: React.FC<ViewProps & { style?: StyleProp<ViewStyle> }>;
    Text: React.FC<TextProps>;
    Image: React.FC<ImageProps>;
    ScrollView: React.FC<ScrollViewProps>;
    Value: new (value: number) => AnimatedValue;
    ValueXY: new (value?: { x: number; y: number }) => AnimatedValueXY;
    timing: (value: AnimatedValue, config: { toValue: number; duration?: number; easing?: (value: number) => number; useNativeDriver: boolean }) => AnimatedCompositeAnimation;
    spring: (value: AnimatedValue, config: { toValue: number; friction?: number; tension?: number; useNativeDriver: boolean }) => AnimatedCompositeAnimation;
    decay: (value: AnimatedValue, config: { velocity: number; deceleration?: number; useNativeDriver: boolean }) => AnimatedCompositeAnimation;
    sequence: (animations: AnimatedCompositeAnimation[]) => AnimatedCompositeAnimation;
    parallel: (animations: AnimatedCompositeAnimation[], config?: { stopTogether?: boolean }) => AnimatedCompositeAnimation;
    loop: (animation: AnimatedCompositeAnimation, config?: { iterations?: number }) => AnimatedCompositeAnimation;
    event: <T>(argMapping: Array<{ [key: string]: AnimatedValue } | null>, config?: { useNativeDriver: boolean }) => (...args: T[]) => void;
    createAnimatedComponent: <P>(component: React.ComponentType<P>) => React.ComponentType<P>;
  };

  export interface AnimatedValue {
    setValue(value: number): void;
    setOffset(offset: number): void;
    flattenOffset(): void;
    extractOffset(): void;
    addListener(callback: (state: { value: number }) => void): string;
    removeListener(id: string): void;
    removeAllListeners(): void;
    stopAnimation(callback?: (value: number) => void): void;
    resetAnimation(callback?: (value: number) => void): void;
    interpolate(config: { inputRange: number[]; outputRange: number[] | string[]; extrapolate?: "extend" | "clamp" | "identity"; extrapolateLeft?: "extend" | "clamp" | "identity"; extrapolateRight?: "extend" | "clamp" | "identity" }): AnimatedValue;
  }

  export interface AnimatedValueXY {
    x: AnimatedValue;
    y: AnimatedValue;
    setValue(value: { x: number; y: number }): void;
    setOffset(offset: { x: number; y: number }): void;
    flattenOffset(): void;
    extractOffset(): void;
    getLayout(): { left: AnimatedValue; top: AnimatedValue };
    getTranslateTransform(): [{ translateX: AnimatedValue }, { translateY: AnimatedValue }];
  }

  export interface AnimatedCompositeAnimation {
    start(callback?: (result: { finished: boolean }) => void): void;
    stop(): void;
    reset(): void;
  }

  export const Keyboard: {
    dismiss(): void;
    addListener(event: "keyboardDidShow" | "keyboardDidHide" | "keyboardWillShow" | "keyboardWillHide", callback: (e: { endCoordinates: { height: number; screenX: number; screenY: number; width: number } }) => void): { remove: () => void };
  };

  export const Linking: {
    openURL(url: string): Promise<void>;
    canOpenURL(url: string): Promise<boolean>;
    getInitialURL(): Promise<string | null>;
    addEventListener(type: "url", handler: (event: { url: string }) => void): { remove: () => void };
  };

  export const Alert: {
    alert(title: string, message?: string, buttons?: Array<{ text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }>, options?: { cancelable?: boolean; onDismiss?: () => void }): void;
  };

  export const Share: {
    share(content: { message?: string; url?: string; title?: string }, options?: { dialogTitle?: string; excludedActivityTypes?: string[]; tintColor?: string; subject?: string }): Promise<{ action: string; activityType?: string }>;
  };

  export const Clipboard: {
    getString(): Promise<string>;
    setString(content: string): void;
  };

  export const AppState: {
    currentState: "active" | "background" | "inactive";
    addEventListener(type: "change", handler: (state: "active" | "background" | "inactive") => void): { remove: () => void };
  };

  export const BackHandler: {
    addEventListener(event: "hardwareBackPress", handler: () => boolean | null | undefined): { remove: () => void };
    exitApp(): void;
  };

  export const PixelRatio: {
    get(): number;
    getFontScale(): number;
    getPixelSizeForLayoutSize(layoutSize: number): number;
    roundToNearestPixel(layoutSize: number): number;
  };

  export function useColorScheme(): "light" | "dark" | null;
  export function useWindowDimensions(): { width: number; height: number; scale: number; fontScale: number };
}
`;

const EXPO_TYPES = `
declare module "expo-router" {
  import * as React from "react";

  export function useRouter(): {
    push: (href: string | { pathname: string; params?: Record<string, string> }) => void;
    replace: (href: string | { pathname: string; params?: Record<string, string> }) => void;
    back: () => void;
    canGoBack: () => boolean;
    setParams: (params: Record<string, string>) => void;
  };

  export function useLocalSearchParams<T extends Record<string, string> = Record<string, string>>(): T;
  export function useGlobalSearchParams<T extends Record<string, string> = Record<string, string>>(): T;
  export function useSegments(): string[];
  export function usePathname(): string;

  export const Link: React.FC<{
    href: string | { pathname: string; params?: Record<string, string> };
    asChild?: boolean;
    replace?: boolean;
    push?: boolean;
    children?: React.ReactNode;
    style?: any;
    onPress?: () => void;
  }>;

  export const Stack: React.FC<{ children?: React.ReactNode }> & {
    Screen: React.FC<{
      name?: string;
      options?: {
        title?: string;
        headerShown?: boolean;
        headerTitle?: string;
        headerLeft?: () => React.ReactNode;
        headerRight?: () => React.ReactNode;
        headerStyle?: any;
        headerTitleStyle?: any;
        headerBackTitle?: string;
        headerBackVisible?: boolean;
        presentation?: "card" | "modal" | "transparentModal" | "containedModal" | "containedTransparentModal" | "fullScreenModal" | "formSheet";
        animation?: "default" | "fade" | "flip" | "simple_push" | "slide_from_bottom" | "slide_from_right" | "slide_from_left" | "none";
        gestureEnabled?: boolean;
        gestureDirection?: "horizontal" | "vertical";
        contentStyle?: any;
      };
      getId?: () => string;
      children?: React.ReactNode;
    }>;
  };

  export const Tabs: React.FC<{ children?: React.ReactNode }> & {
    Screen: React.FC<{
      name?: string;
      options?: {
        title?: string;
        tabBarLabel?: string;
        tabBarIcon?: (props: { color: string; size: number; focused: boolean }) => React.ReactNode;
        tabBarBadge?: string | number;
        tabBarStyle?: any;
        tabBarActiveTintColor?: string;
        tabBarInactiveTintColor?: string;
        headerShown?: boolean;
        href?: string | null;
      };
      children?: React.ReactNode;
    }>;
  };

  export const Slot: React.FC;
  export const Redirect: React.FC<{ href: string }>;

  export function router(): {
    push: (href: string) => void;
    replace: (href: string) => void;
    back: () => void;
  };
}

declare module "expo-status-bar" {
  import * as React from "react";
  export const StatusBar: React.FC<{
    style?: "auto" | "inverted" | "light" | "dark";
    backgroundColor?: string;
    translucent?: boolean;
    hidden?: boolean;
    animated?: boolean;
  }>;
}

declare module "expo-linear-gradient" {
  import * as React from "react";
  export const LinearGradient: React.FC<{
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
    style?: any;
    children?: React.ReactNode;
  }>;
}

declare module "expo-image" {
  import * as React from "react";
  export const Image: React.FC<{
    source: string | { uri: string } | number;
    style?: any;
    contentFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
    contentPosition?: string;
    transition?: number;
    placeholder?: string | { uri: string };
    placeholderContentFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
    cachePolicy?: "none" | "disk" | "memory" | "memory-disk";
    onLoad?: () => void;
    onError?: (error: { error: string }) => void;
    onLoadStart?: () => void;
    onLoadEnd?: () => void;
  }>;
}

declare module "expo-haptics" {
  export function impactAsync(style: "light" | "medium" | "heavy"): Promise<void>;
  export function notificationAsync(type: "success" | "warning" | "error"): Promise<void>;
  export function selectionAsync(): Promise<void>;
}

declare module "expo-constants" {
  const Constants: {
    expoConfig: {
      name: string;
      slug: string;
      version: string;
      extra?: Record<string, any>;
    } | null;
    appOwnership: "standalone" | "expo" | "guest" | null;
    executionEnvironment: "bare" | "storeClient" | "standalone";
    installationId: string;
    isDevice: boolean;
    platform: {
      ios?: { buildNumber: string; platform: string; model: string; userInterfaceIdiom: string; systemVersion: string };
      android?: { versionCode: number };
    };
    sessionId: string;
    statusBarHeight: number;
    systemFonts: string[];
  };
  export default Constants;
}

declare module "expo-secure-store" {
  export function getItemAsync(key: string, options?: { keychainService?: string; keychainAccessible?: number }): Promise<string | null>;
  export function setItemAsync(key: string, value: string, options?: { keychainService?: string; keychainAccessible?: number }): Promise<void>;
  export function deleteItemAsync(key: string, options?: { keychainService?: string }): Promise<void>;
}

declare module "expo-font" {
  export function useFonts(fonts: Record<string, number | { uri: string }>): [boolean, Error | null];
  export function loadAsync(fonts: Record<string, number | { uri: string }>): Promise<void>;
  export function isLoaded(fontFamily: string): boolean;
}

declare module "@expo/vector-icons" {
  import * as React from "react";

  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }

  export const Ionicons: React.FC<IconProps>;
  export const MaterialIcons: React.FC<IconProps>;
  export const MaterialCommunityIcons: React.FC<IconProps>;
  export const FontAwesome: React.FC<IconProps>;
  export const FontAwesome5: React.FC<IconProps>;
  export const FontAwesome6: React.FC<IconProps>;
  export const Feather: React.FC<IconProps>;
  export const AntDesign: React.FC<IconProps>;
  export const Entypo: React.FC<IconProps>;
  export const EvilIcons: React.FC<IconProps>;
  export const Foundation: React.FC<IconProps>;
  export const Octicons: React.FC<IconProps>;
  export const SimpleLineIcons: React.FC<IconProps>;
  export const Zocial: React.FC<IconProps>;
}
`;

const REACT_TYPES = `
declare module "react" {
  export type FC<P = {}> = FunctionComponent<P>;
  export interface FunctionComponent<P = {}> {
    (props: P): ReactElement | null;
    displayName?: string;
  }
  export type ReactNode = ReactElement | string | number | boolean | null | undefined | ReactNode[];
  export interface ReactElement<P = any> {
    type: string | FC<P>;
    props: P;
    key: string | number | null;
  }
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useContext<T>(context: Context<T>): T;
  export function useReducer<R extends Reducer<any, any>>(reducer: R, initialState: ReducerState<R>): [ReducerState<R>, Dispatch<ReducerAction<R>>];
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useImperativeHandle<T>(ref: Ref<T> | undefined, init: () => T, deps?: readonly any[]): void;
  export function useDebugValue<T>(value: T, format?: (value: T) => any): void;
  export function createContext<T>(defaultValue: T): Context<T>;
  export function forwardRef<T, P = {}>(render: (props: P, ref: Ref<T>) => ReactElement | null): FC<P & { ref?: Ref<T> }>;
  export function memo<P>(component: FC<P>, propsAreEqual?: (prevProps: P, nextProps: P) => boolean): FC<P>;
  export function lazy<T extends FC<any>>(factory: () => Promise<{ default: T }>): T;
  export const Fragment: FC<{ children?: ReactNode }>;
  export const Suspense: FC<{ fallback?: ReactNode; children?: ReactNode }>;
  export const StrictMode: FC<{ children?: ReactNode }>;
  export interface Context<T> {
    Provider: FC<{ value: T; children?: ReactNode }>;
    Consumer: FC<{ children: (value: T) => ReactNode }>;
  }
  export type Ref<T> = { current: T | null } | ((instance: T | null) => void) | null;
  export type Reducer<S, A> = (state: S, action: A) => S;
  export type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
  export type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;
  export type Dispatch<A> = (action: A) => void;
  export type SetStateAction<S> = S | ((prevState: S) => S);
  export type PropsWithChildren<P = {}> = P & { children?: ReactNode };
  export type CSSProperties = Record<string, string | number>;
}
`;

let typesLoaded = false;

export async function loadTypeDefinitions(monaco: Monaco): Promise<void> {
  if (typesLoaded) return;

  const tsDefaults = monaco.languages.typescript.typescriptDefaults;
  const jsDefaults = monaco.languages.typescript.javascriptDefaults;

  tsDefaults.addExtraLib(REACT_TYPES, "file:///node_modules/@types/react/index.d.ts");
  jsDefaults.addExtraLib(REACT_TYPES, "file:///node_modules/@types/react/index.d.ts");

  tsDefaults.addExtraLib(REACT_NATIVE_TYPES, "file:///node_modules/@types/react-native/index.d.ts");
  jsDefaults.addExtraLib(REACT_NATIVE_TYPES, "file:///node_modules/@types/react-native/index.d.ts");

  tsDefaults.addExtraLib(EXPO_TYPES, "file:///node_modules/expo/index.d.ts");
  jsDefaults.addExtraLib(EXPO_TYPES, "file:///node_modules/expo/index.d.ts");

  typesLoaded = true;
}

export function resetTypeDefinitions(): void {
  typesLoaded = false;
}
