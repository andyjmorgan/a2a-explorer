// Matches DonkeyWork.A2AExplorer.Agents.Contracts DTOs (V1 suffix in C#; dropped here since the
// wire format is the only contract the SPA sees).

export type AgentAuthMode = "None" | "Header";

export interface AgentSummary {
  id: string;
  name: string;
  baseUrl: string;
  authMode: AgentAuthMode;
  hasAuthHeaderValue: boolean;
  lastUsedAt?: string;
  createdAt: string;
}

export interface AgentDetails extends AgentSummary {
  authHeaderName?: string;
  updatedAt?: string;
}

export interface CreateAgentRequest {
  name: string;
  baseUrl: string;
  authMode: AgentAuthMode;
  authHeaderName?: string;
  authHeaderValue?: string;
}

export interface UpdateAgentRequest {
  name?: string;
  baseUrl?: string;
  authMode?: AgentAuthMode;
  authHeaderName?: string;
  authHeaderValue?: string;
}

export interface TestConnectionRequest {
  baseUrl: string;
  authHeaderName?: string;
  authHeaderValue?: string;
}
