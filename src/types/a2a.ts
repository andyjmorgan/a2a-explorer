export interface AgentCard {
  name: string;
  description: string;
  version: string;
  supportedInterfaces?: AgentInterface[];
  provider?: AgentProvider;
  documentationUrl?: string;
  capabilities?: AgentCapabilities;
  securitySchemes?: Record<string, SecurityScheme | LegacySecurityScheme>;
  securityRequirements?: SecurityRequirement[];
  security?: SecurityRequirement[];
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: AgentSkill[];
  iconUrl?: string;
  url?: string;
  protocolVersion?: string;
  preferredTransport?: string;
}

export interface LegacySecurityScheme {
  type: string;
  in?: string;
  name?: string;
  description?: string;
}

export interface AgentInterface {
  url: string;
  protocolBinding: "JSONRPC" | "GRPC" | "HTTP+JSON";
  protocolVersion: string;
  tenant?: string;
}

export interface AgentProvider {
  organization: string;
  url?: string;
}

export interface AgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  extendedAgentCard?: boolean;
  extensions?: string[];
}

export type SecurityScheme =
  | { apiKeySecurityScheme: ApiKeySecurityScheme }
  | { httpAuthSecurityScheme: HttpAuthSecurityScheme }
  | { oauth2SecurityScheme: OAuth2SecurityScheme }
  | { openIdConnectSecurityScheme: OpenIdConnectSecurityScheme };

export interface ApiKeySecurityScheme {
  description?: string;
  location: "query" | "header" | "cookie";
  name: string;
}

export interface HttpAuthSecurityScheme {
  description?: string;
  scheme: string;
  bearerFormat?: string;
}

export interface OAuth2SecurityScheme {
  description?: string;
  flows: Record<string, unknown>;
  oauth2MetadataUrl?: string;
}

export interface OpenIdConnectSecurityScheme {
  description?: string;
  openIdConnectUrl: string;
}

export interface SecurityRequirement {
  [schemeName: string]: string[];
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

// The A2A .NET SDK serialises Role with JsonStringEnumMemberName attributes — its wire format is
// ROLE_USER / ROLE_AGENT, not the protocol's lowercase "user"/"agent". We match the SDK because it
// wins serialization on both sides of our backend.
export type Role = "ROLE_USER" | "ROLE_AGENT" | "ROLE_UNSPECIFIED";

export interface Message {
  messageId: string;
  contextId?: string;
  taskId?: string;
  role: Role;
  parts: Part[];
  metadata?: Record<string, unknown>;
}

// The A2A .NET SDK serialises Part by field-presence rather than the protocol's `kind`
// discriminator: exactly one of text / data / url / raw is populated per part. We match that.
export interface Part {
  text?: string | null;
  data?: Record<string, unknown> | null;
  url?: string | null;
  raw?: string | null;
  filename?: string | null;
  mediaType?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface Task {
  id: string;
  contextId: string;
  status: TaskStatus;
  artifacts?: Artifact[];
  history?: Message[];
  metadata?: Record<string, unknown>;
}

export interface TaskStatus {
  state: TaskState;
  message?: Message;
  timestamp?: string;
}

// The A2A .NET SDK serialises TaskState as the raw protobuf enum name — same pattern as Role above.
export type TaskState =
  | "TASK_STATE_UNSPECIFIED"
  | "TASK_STATE_SUBMITTED"
  | "TASK_STATE_WORKING"
  | "TASK_STATE_COMPLETED"
  | "TASK_STATE_FAILED"
  | "TASK_STATE_CANCELED"
  | "TASK_STATE_REJECTED"
  | "TASK_STATE_INPUT_REQUIRED"
  | "TASK_STATE_AUTH_REQUIRED";

export const TERMINAL_TASK_STATES: ReadonlySet<TaskState> = new Set<TaskState>([
  "TASK_STATE_COMPLETED",
  "TASK_STATE_FAILED",
  "TASK_STATE_CANCELED",
  "TASK_STATE_REJECTED",
]);

export function friendlyTaskState(state: TaskState): string {
  return state.replace(/^TASK_STATE_/, "").replace(/_/g, "-").toLowerCase();
}

export interface Artifact {
  artifactId: string;
  name?: string;
  description?: string;
  parts: Part[];
  metadata?: Record<string, unknown>;
}

export interface TaskStatusUpdateEvent {
  taskId: string;
  contextId: string;
  status: TaskStatus;
  final: boolean;
}

export interface TaskArtifactUpdateEvent {
  taskId: string;
  contextId: string;
  artifact: Artifact;
  append?: boolean;
  lastChunk?: boolean;
}

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type AuthMode = "none" | "header";

export interface AuthConfig {
  mode: AuthMode;
  headerName?: string;
  headerValue?: string;
}

export interface SendMessageRequest {
  message: Message;
  configuration?: {
    acceptedOutputModes?: string[];
    historyLength?: number;
    blocking?: boolean;
  };
}

export type StreamEvent =
  | { type: "task"; task: Task }
  | { type: "message"; message: Message }
  | { type: "statusUpdate"; statusUpdate: TaskStatusUpdateEvent }
  | { type: "artifactUpdate"; artifactUpdate: TaskArtifactUpdateEvent };
