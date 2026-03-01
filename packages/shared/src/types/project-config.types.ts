export interface ProjectAppConfig {
  version: string;
  orientation: "portrait" | "landscape" | "default";
  scheme: string;
  bundle_identifier: string;
  package_name: string;
  icon_url: string | null;
  splash_url: string | null;
}

export interface ProjectEnvVariable {
  key: string;
  value: string;
  is_secret: boolean;
}

export interface ProjectSettings {
  app_config: ProjectAppConfig;
  env_variables: ProjectEnvVariable[];
}

export interface UpdateProjectConfigRequest {
  app_config?: Partial<ProjectAppConfig>;
  env_variables?: ProjectEnvVariable[];
}

export interface ProjectConfigResponse {
  app_config: ProjectAppConfig;
  env_variables: ProjectEnvVariable[];
}
