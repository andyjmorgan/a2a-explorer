import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimit } from "./rate-limit";
import { proxyHandler, BLOCKED_REASON } from "./proxy";

const app = new Hono();
const port = parseInt(process.env.PORT || "3000", 10);

app.use("/a2a-proxy", cors());
app.use("/a2a-proxy", rateLimit(60_000, 60));

app.all("/a2a-proxy", async (c) => {
  const method = c.req.method;

  if (method === "OPTIONS") {
    return c.body(null, 204);
  }

  if (method !== "GET" && method !== "POST") {
    return c.json({ error: "Only GET and POST are allowed" }, 405);
  }

  const targetUrl = c.req.header("x-proxy-target");
  if (!targetUrl) {
    return c.json({ error: "Missing x-proxy-target header" }, 400);
  }

  const result = proxyHandler(targetUrl);
  if (result === BLOCKED_REASON.PRIVATE_IP) {
    return c.json({ error: "Requests to private/internal addresses are not allowed" }, 403);
  }
  if (result === BLOCKED_REASON.NOT_HTTPS) {
    return c.json({ error: "Only HTTPS targets are allowed" }, 403);
  }
  if (result === BLOCKED_REASON.INVALID_URL) {
    return c.json({ error: "Invalid target URL" }, 400);
  }

  const parsedUrl = new URL(targetUrl);

  const proxyHeaders = new Headers();
  for (const [key, value] of c.req.raw.headers.entries()) {
    if (
      key === "host" ||
      key === "x-proxy-target" ||
      key === "origin" ||
      key === "referer" ||
      key === "connection" ||
      key === "cf-connecting-ip" ||
      key === "x-forwarded-for" ||
      key === "x-real-ip"
    ) {
      continue;
    }
    proxyHeaders.set(key, value);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const body = method === "POST" ? await c.req.arrayBuffer() : undefined;

    const response = await fetch(parsedUrl.toString(), {
      method,
      headers: proxyHeaders,
      body,
      signal: controller.signal,
      redirect: "error",
    });

    clearTimeout(timeout);

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return c.json({ error: "Response too large" }, 502);
    }

    const responseHeaders = new Headers();
    for (const [key, value] of response.headers.entries()) {
      if (
        key === "set-cookie" ||
        key === "x-powered-by" ||
        key === "server"
      ) {
        continue;
      }
      responseHeaders.set(key, value);
    }

    responseHeaders.set("access-control-allow-origin", "*");
    responseHeaders.set("access-control-allow-methods", "GET, POST, OPTIONS");
    responseHeaders.set("access-control-allow-headers", "*");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return c.json({ error: "Request to agent timed out (30s)" }, 504);
    }
    if (err instanceof TypeError && String(err).includes("redirect")) {
      return c.json({ error: "Agent responded with a redirect, which is not followed for security" }, 502);
    }
    return c.json(
      { error: `Proxy error: ${err instanceof Error ? err.message : "unknown"}` },
      502
    );
  }
});

app.get("*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

console.log(`A2A Explorer listening on :${port}`);
serve({ fetch: app.fetch, port });
