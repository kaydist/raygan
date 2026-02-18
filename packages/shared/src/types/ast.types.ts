/**
 * Component AST Types
 * Defines the structure for the React Native component tree
 */

// =============================================================================
// NODE TYPES
// =============================================================================

export type ASTNodeType =
  | "root"
  | "screen"
  | "navigator"
  | "component"
  | "custom_component";

export type NavigatorType = "stack" | "tabs" | "drawer";

export type ComponentType =
  | "View"
  | "Text"
  | "Image"
  | "Button"
  | "TextInput"
  | "ScrollView"
  | "FlatList"
  | "TouchableOpacity"
  | "Pressable"
  | "SafeAreaView"
  | "KeyboardAvoidingView"
  | "Modal"
  | "ActivityIndicator"
  | "Switch"
  | "Slider"
  | "Icon"
  | string;

// =============================================================================
// STYLE TYPES
// =============================================================================

export interface ASTStyle {
  layout?: {
    flex?: number;
    flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
    justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
    alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
    alignSelf?: "auto" | "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
    flexWrap?: "wrap" | "nowrap" | "wrap-reverse";
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number | string;
    position?: "relative" | "absolute";
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
    zIndex?: number;
  };
  spacing?: {
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
  };
  sizing?: {
    width?: number | string;
    height?: number | string;
    minWidth?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
    maxHeight?: number | string;
    aspectRatio?: number;
  };
  typography?: {
    fontSize?: number;
    fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
    fontStyle?: "normal" | "italic";
    fontFamily?: string;
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: "auto" | "left" | "right" | "center" | "justify";
    textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through";
    textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
  };
  colors?: {
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    tintColor?: string;
  };
  borders?: {
    borderWidth?: number;
    borderTopWidth?: number;
    borderRightWidth?: number;
    borderBottomWidth?: number;
    borderLeftWidth?: number;
    borderRadius?: number;
    borderTopLeftRadius?: number;
    borderTopRightRadius?: number;
    borderBottomLeftRadius?: number;
    borderBottomRightRadius?: number;
    borderStyle?: "solid" | "dotted" | "dashed";
  };
  effects?: {
    opacity?: number;
    overflow?: "visible" | "hidden" | "scroll";
    shadowColor?: string;
    shadowOffset?: { width: number; height: number };
    shadowOpacity?: number;
    shadowRadius?: number;
    elevation?: number;
  };
}

// =============================================================================
// AST NODE
// =============================================================================

export interface ASTNode {
  id: string;
  type: ASTNodeType;
  component_type?: ComponentType;
  navigator_type?: NavigatorType;
  name: string;
  props: Record<string, unknown>;
  style: ASTStyle;
  children: ASTNode[];
  meta: ASTNodeMeta;
}

export interface ASTNodeMeta {
  locked?: boolean;
  hidden?: boolean;
  collapsed?: boolean;
  description?: string;
  source?: "agent" | "builder" | "code";
  created_at?: string;
  updated_at?: string;
  version?: number;
}

// =============================================================================
// AST OPERATIONS
// =============================================================================

export type ASTOperationType = "create" | "update" | "delete" | "move" | "duplicate";

export interface ASTOperationCreate {
  type: "create";
  parent_id: string;
  index?: number;
  node: Omit<ASTNode, "id" | "children"> & { children?: ASTNode[] };
}

export interface ASTOperationUpdate {
  type: "update";
  node_id: string;
  updates: Partial<Omit<ASTNode, "id" | "children">>;
}

export interface ASTOperationDelete {
  type: "delete";
  node_id: string;
}

export interface ASTOperationMove {
  type: "move";
  node_id: string;
  new_parent_id: string;
  index?: number;
}

export interface ASTOperationDuplicate {
  type: "duplicate";
  node_id: string;
  new_parent_id?: string;
}

export type ASTOperation =
  | ASTOperationCreate
  | ASTOperationUpdate
  | ASTOperationDelete
  | ASTOperationMove
  | ASTOperationDuplicate;

// =============================================================================
// JSON PATCH (RFC 6902)
// =============================================================================

export type JSONPatchOp = "add" | "remove" | "replace" | "move" | "copy" | "test";

export interface JSONPatch {
  op: JSONPatchOp;
  path: string;
  value?: unknown;
  from?: string;
}

// =============================================================================
// AST SNAPSHOT
// =============================================================================

export interface ASTSnapshot {
  ast: ASTNode;
  version: number;
  timestamp: string;
}

// =============================================================================
// AST VALIDATION
// =============================================================================

export interface ASTValidationError {
  node_id: string;
  path: string;
  code: string;
  message: string;
}

export interface ASTValidationResult {
  valid: boolean;
  errors: ASTValidationError[];
}

// =============================================================================
// FACTORY HELPERS
// =============================================================================

export interface CreateNodeOptions {
  type: ASTNodeType;
  component_type?: ComponentType;
  navigator_type?: NavigatorType;
  name: string;
  props?: Record<string, unknown>;
  style?: ASTStyle;
  children?: ASTNode[];
  meta?: Partial<ASTNodeMeta>;
}
