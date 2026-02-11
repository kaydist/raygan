// Builder feature types
export interface PropertyDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "color" | "select" | "slider";
  label: string;
  category: "layout" | "spacing" | "typography" | "colors" | "effects";
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ComponentDefinition {
  type: string;
  name: string;
  category: "layout" | "input" | "display" | "navigation" | "native";
  icon: string;
  defaultProps: Record<string, unknown>;
  defaultStyles: Record<string, unknown>;
  properties: PropertyDefinition[];
}
