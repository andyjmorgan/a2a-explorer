import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { agentsApi, a2aApi, ApiError } from "./api";
import { useAuthStore } from "./authStore";

describe("agentsApi", () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens("test-token", null, 3600);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().logout();
  });

  test("list GETs the agents collection and returns the parsed body", async () => {
    const agents = [{ id: "1", name: "a", baseUrl: "https://a", authMode: "None", hasAuthHeaderValue: false, createdAt: "2026" }];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(agents), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await agentsApi.list();

    expect(result).toEqual(agents);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/agents", expect.any(Object));
  });

  test("create POSTs the body with JSON content-type", async () => {
    const saved = { id: "1", name: "a", baseUrl: "https://a", authMode: "None", hasAuthHeaderValue: false, createdAt: "2026" };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(saved), { status: 201, headers: { "Content-Type": "application/json" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await agentsApi.create({ name: "a", baseUrl: "https://a", authMode: "None" });

    expect(result).toEqual(saved);
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect((init.headers as Headers).get("Content-Type")).toBe("application/json");
  });

  test("delete sends DELETE and accepts 204", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await agentsApi.delete("abc");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/agents/abc",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  test("list throws ApiError on non-2xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(agentsApi.list()).rejects.toBeInstanceOf(ApiError);
  });
});

describe("a2aApi", () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens("test-token", null, 3600);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().logout();
  });

  test("testConnection POSTs and returns the card", async () => {
    const card = {
      name: "sample",
      description: "d",
      version: "1",
      defaultInputModes: [],
      defaultOutputModes: [],
      skills: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(card), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await a2aApi.testConnection({ baseUrl: "https://agent" });
    expect(result).toEqual(card);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/agents/test-connection");
  });

  test("getCard GETs the saved-agent card endpoint", async () => {
    const card = { name: "sample", description: "d", version: "1", defaultInputModes: [], defaultOutputModes: [], skills: [] };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(card), { status: 200, headers: { "Content-Type": "application/json" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await a2aApi.getCard("agent-1");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/agents/agent-1/card");
  });

  test("sendMessage POSTs the message body and returns the SDK envelope", async () => {
    const envelope = {
      task: { id: "t", contextId: "c", status: { state: "completed" } },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(envelope), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await a2aApi.sendMessage("agent-1", {
      message: { messageId: "u1", role: "ROLE_USER", parts: [{ text: "hi" }] },
    });

    expect(result).toEqual(envelope);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/agents/agent-1/messages");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });
});
