import type { BuildPlatformType, BuildProfileType, BuildDistributionType, ReleaseStoreType, ReleaseTrackType } from "../db/entities";

export interface BuildJobData {
  build_id: number;
  project_id: number;
  organization_id: number;
  user_id: number;
  platform: BuildPlatformType;
  profile: BuildProfileType;
  distribution: BuildDistributionType;
}

export interface StoreSubmitJobData {
  release_id: number;
  project_id: number;
  organization_id: number;
  build_id: number;
  user_id: number;
  store: ReleaseStoreType;
  track: ReleaseTrackType;
}
