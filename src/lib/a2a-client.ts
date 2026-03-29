import { v4 as uuidv4 } from "uuid";
import type {
  AgentCard,
  AuthConfig,
  JsonRpcRequest,
  JsonRpcResponse,
  Message,
  Task,
  StreamEvent,
} from "@/types/a2a";

const PROXY_PATH = "/a2a-proxy";

function proxiedFetch(targetUrl: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("x-proxy-target", targetUrl);

  return fetch(PROXY_PATH, {
    ...init,
    headers,
  });
}

export class A2AClient {
  private baseUrl: string;
  private agentUrl: string | null = null;
  private auth: AuthConfig;
  private card: AgentCard | null = null;

  constructor(baseUrl: string, auth: AuthConfig = { mode: "none" }) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.auth = auth;
  }

  setAuth(auth: AuthConfig) {
    this.auth = auth;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.auth.mode === "header" && this.auth.headerName && this.auth.headerValue) {
      headers[this.auth.headerName] = this.auth.headerValue;
    }

    return headers;
  }

  async discoverCard(): Promise<AgentCard> {
    const cardUrl = `${this.baseUrl}/.well-known/agent.json`;
    const response = await proxiedFetch(cardUrl, { headers: this.getHeaders() });

    if (!response.ok) {
      throw new Error(`Failed to discover agent card: ${response.status} ${response.statusText}`);
    }

    this.card = await response.json();

    if (this.card!.supportedInterfaces?.length) {
      const jsonRpcInterface = this.card!.supportedInterfaces.find(
        (i) => i.protocolBinding === "JSONRPC"
      );
      this.agentUrl = jsonRpcInterface?.url ?? this.card!.supportedInterfaces[0].url;
    } else if (this.card!.url) {
      this.agentUrl = this.card!.url;
    }

    return this.card!;
  }

  getCard(): AgentCard | null {
    return this.card;
  }

  getAgentUrl(): string {
    if (this.agentUrl) return this.agentUrl;
    return this.baseUrl;
  }

  private async rpc(method: string, params: Record<string, unknown>): Promise<JsonRpcResponse> {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: uuidv4(),
      method,
      params,
    };

    const response = await proxiedFetch(this.getAgentUrl(), {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async sendMessage(
    text: string,
    contextId?: string,
    taskId?: string
  ): Promise<{ task?: Task; message?: Message }> {
    const message: Message = {
      messageId: uuidv4(),
      role: "user",
      parts: [{ kind: "text", text }],
      ...(contextId && { contextId }),
      ...(taskId && { taskId }),
    };

    const response = await this.rpc("message/send", {
      message,
      configuration: {
        acceptedOutputModes: ["text/plain", "application/json"],
        historyLength: 10,
        blocking: true,
      },
    });

    if (response.error) {
      throw new Error(`Agent error: ${response.error.message} (code: ${response.error.code})`);
    }

    const result = response.result as Record<string, unknown>;

    if (result.kind === "message" || result.role !== undefined) {
      return { message: result as unknown as Message };
    }

    return { task: result as unknown as Task };
  }

  async *sendStreamingMessage(
    text: string,
    contextId?: string,
    taskId?: string
  ): AsyncGenerator<StreamEvent> {
    const message: Message = {
      messageId: uuidv4(),
      role: "user",
      parts: [{ kind: "text", text }],
      ...(contextId && { contextId }),
      ...(taskId && { taskId }),
    };

    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: uuidv4(),
      method: "message/stream",
      params: {
        message,
        configuration: {
          acceptedOutputModes: ["text/plain", "application/json"],
          historyLength: 10,
        },
      },
    };

    const response = await proxiedFetch(this.getAgentUrl(), {
      method: "POST",
      headers: {
        ...this.getHeaders(),
        Accept: "text/event-stream",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body for streaming");

    const decoder = new TextDecoder();
    let buffer = "";

    const parseEvent = (data: string): StreamEvent | null => {
      try {
        const parsed = JSON.parse(data);
        const result = parsed.result || parsed;

        if (result.status !== undefined && result.id !== undefined) {
          return { type: "task", task: result as Task };
        } else if (result.taskId && result.status) {
          return { type: "statusUpdate", statusUpdate: result };
        } else if (result.taskId && result.artifact) {
          return { type: "artifactUpdate", artifactUpdate: result };
        } else if (result.role !== undefined) {
          return { type: "message", message: result as Message };
        } else if (result.parts !== undefined) {
          return { type: "message", message: result as Message };
        }
      } catch {
        // skip unparseable
      }
      return null;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentData = "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          currentData += line.slice(6);
        } else if (line.trim() === "" && currentData) {
          const event = parseEvent(currentData);
          if (event) yield event;
          currentData = "";
        }
      }

      if (currentData) {
        const event = parseEvent(currentData);
        if (event) yield event;
      }
    }

    if (buffer.startsWith("data: ")) {
      const event = parseEvent(buffer.slice(6));
      if (event) yield event;
    }
  }

  async getTask(taskId: string): Promise<Task> {
    const response = await this.rpc("tasks/get", { id: taskId });

    if (response.error) {
      throw new Error(`Get task error: ${response.error.message}`);
    }

    return response.result as unknown as Task;
  }
}
