import { SchedulerServiceTaskScheduleDefinition } from '@backstage/backend-plugin-api';
import {
  GithubIntegrationConfig,
  GitLabIntegrationConfig,
} from '@backstage/integration';

export type Organization = {
  id: number;
  name: string;
};

export type Inventory = {
  id: number;
  name: string;
};

export type Project = {
  id?: number;
  projectName: string;
  projectDescription?: string;
  organization: Organization;
  scmUrl: string;
  scmBranch?: string;
  scmUpdateOnLaunch?: boolean;
  status?: string;
  url?: string;
};

export type ExecutionEnvironment = {
  id?: number;
  environmentName: string;
  environmentDescription?: string;
  organization: Organization;
  image: string;
  pull: string;
  url?: string;
};

export type JobTemplate = {
  id?: number;
  templateName: string;
  templateDescription?: string;
  project: Project;
  organization: Organization;
  jobInventory: Inventory;
  playbook: string;
  executionEnvironment?: ExecutionEnvironment;
  extraVariables?: string | object;
  status?: string;
  url?: string;
};

export type CleanUp = {
  project?: Project;
  executionEnvironment?: ExecutionEnvironment;
  template?: JobTemplate;
};

export type LaunchJobTemplate = {
  template: {
    id: number;
    name: string;
  };
  jobType?: 'run' | 'check';
  inventory?: Inventory;
  executionEnvironment?: ExecutionEnvironment;
  credentials?: {
    id: number;
    type: string;
    credential_type: number;
    name: string;
    summary_fields: Record<string, { id: number; name: string }>;
  }[];
  forks?: number;
  limit?: string;
  verbosity?: {
    id: number;
    name: string;
  };
  jobSliceCount?: number;
  timeout?: number;
  diffMode?: boolean;
  extraVariables?: string | object;
  jobTags?: string;
  skipTags?: string;
};

export type UseCase = {
  name: string;
  version: string;
  url: string;
};

export type AAPTemplate = {
  id: number;
  name: string;
};

export type Analytics = {
  enabled: boolean;
};

export type DevSpaces = {
  baseUrl: string;
};

export type AutomationHub = {
  baseUrl: string;
};

export type ShowCaseLocation = {
  type: 'url' | 'file';
  target: string;
  gitBranch?: string;
  gitUser?: string;
  gitEmail?: string;
};

export type CreatorService = {
  baseUrl: string;
  port: string;
};

export type RHAAPConfig = {
  baseUrl: string;
  token?: string;
  checkSSL?: boolean;
  showCaseLocation: ShowCaseLocation;
  githubIntegration?: GithubIntegrationConfig;
  gitlabIntegration?: GitLabIntegrationConfig;
  schedule?: SchedulerServiceTaskScheduleDefinition;
  creatorService?: CreatorService;
};

export type AnsibleConfig = {
  analytics?: Analytics;
  devSpaces?: DevSpaces;
  automationHub?: AutomationHub;
  rhaap: RHAAPConfig;
};

export type CreatedTemplate = {
  templateName: string;
  template: any;
  templateId?: number;
};
export type ParsedTemplate = {
  filename: string;
  fileContent: string;
};

// BackstageTemplate?
export type BackstageAAPShowcase = {
  apiVersion: string;
  kind: string;
  metadata: { name: string; description: string };
  spec: { targets: string[] };
};
