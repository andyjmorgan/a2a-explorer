import { fetchWithAuth } from "./fetchWithAuth";
import type {
  AgentDetails,
  AgentSummary,
  CreateAgentRequest,
  TestConnectionRequest,
  UpdateAgentRequest,
} from "@/types/saved-agent";
import type { AgentCard, Message, Task } from "@/types/a2a";

const AGENTS_BASE = "/api/v1/agents";

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, body || response.statusText);
  }
  return (await response.json()) as T;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Saved-agent CRUD. */
export const agentsApi = {
  list: async (): Promise<AgentSummary[]> =>
    json(await fetchWithAuth(AGENTS_BASE)),

  get: async (id: string): Promise<AgentDetails> =>
    json(await fetchWithAuth(`${AGENTS_BASE}/${id}`)),

  create: async (body: CreateAgentRequest): Promise<AgentDetails> =>
    json(
      await fetchWithAuth(AGENTS_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),

  update: async (id: string, body: UpdateAgentRequest): Promise<AgentDetails> =>
    json(
      await fetchWithAuth(`${AGENTS_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),

  delete: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`${AGENTS_BASE}/${id}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      throw new ApiError(response.status, response.statusText);
    }
  },
};

/** Wire shape of the backend's SendMessageRequest (A2A SDK type) — the SPA only sends a message. */
export interface SendMessageRequestBody {
  message: Message;
  configuration?: {
    acceptedOutputModes?: string[];
    historyLength?: number;
    blocking?: boolean;
  };
  metadata?: Record<string, unknown>;
}

/** The backend mirrors the A2A SDK's discriminated envelope: exactly one of task | message is set. */
export interface SendMessageResponseBody {
  task?: import("@/types/a2a").Task;
  message?: Message;
}

/** First-party A2A protocol surface. The browser only talks to our backend. */
export const a2aApi = {
  testConnection: async (body: TestConnectionRequest): Promise<AgentCard> =>
    json(
      await fetchWithAuth(`${AGENTS_BASE}/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),

  getCard: async (id: string): Promise<AgentCard> =>
    json(await fetchWithAuth(`${AGENTS_BASE}/${id}/card`)),

  sendMessage: async (id: string, body: SendMessageRequestBody): Promise<SendMessageResponseBody> =>
    json(
      await fetchWithAuth(`${AGENTS_BASE}/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),

  getTask: async (id: string, taskId: string): Promise<Task> =>
    json(
      await fetchWithAuth(`${AGENTS_BASE}/${id}/tasks/${encodeURIComponent(taskId)}`)
    ),

  cancelTask: async (id: string, taskId: string): Promise<Task> =>
    json(
      await fetchWithAuth(`${AGENTS_BASE}/${id}/tasks/${encodeURIComponent(taskId)}/cancel`, {
        method: "POST",
      })
    ),
};
