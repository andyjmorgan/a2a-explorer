import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";

function proxyHandler(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (!req.url?.startsWith("/a2a-proxy")) {
    next();
    return;
  }

  console.log(`[a2a-proxy] HIT: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "*",
      "access-control-allow-headers": "*",
      "access-control-max-age": "86400",
    });
    res.end();
    return;
  }

  const targetUrl = req.headers["x-proxy-target"] as string;
  if (!targetUrl) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing x-proxy-target header" }));
    return;
  }

  console.log(`[a2a-proxy] ${req.method} -> ${targetUrl}`);

  const parsedUrl = new URL(targetUrl);
  const isHttps = parsedUrl.protocol === "https:";
  const doRequest = isHttps ? httpsRequest : httpRequest;

  const proxyHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (
      key === "host" ||
      key === "x-proxy-target" ||
      key === "origin" ||
      key === "referer" ||
      key === "connection"
    )
      continue;
    if (value) proxyHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
  }

  const proxyReq = doRequest(
    {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: req.method,
      headers: proxyHeaders,
      rejectUnauthorized: false,
    },
    (proxyRes) => {
      console.log(`[a2a-proxy] <- ${proxyRes.statusCode} from ${targetUrl}`);
      res.writeHead(proxyRes.statusCode || 500, {
        ...proxyRes.headers,
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "*",
        "access-control-allow-headers": "*",
      });
      proxyRes.pipe(res, { end: true });
    }
  );

  proxyReq.on("error", (err) => {
    console.log(`[a2a-proxy] ERROR: ${err.message}`);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  });

  req.pipe(proxyReq, { end: true });
}

function corsProxy(): Plugin {
  return {
    name: "a2a-cors-proxy",
    configureServer(server) {
      console.log("[a2a-cors-proxy] Registering proxy middleware");
      server.middlewares.use(proxyHandler);
    },
  };
}

export default defineConfig({
  plugins: [corsProxy(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
