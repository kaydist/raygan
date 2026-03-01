import type { BuildPlatformType, BuildProfileType, BuildDistributionType } from "../db/entities";

export interface BuildJobData {
  build_id: number;
  project_id: number;
  organization_id: number;
  user_id: number;
  platform: BuildPlatformType;
  profile: BuildProfileType;
  distribution: BuildDistributionType;
}
