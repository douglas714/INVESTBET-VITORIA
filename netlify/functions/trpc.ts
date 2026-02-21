import type { Handler, HandlerEvent } from "@netlify/functions";
import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import http from "http";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

// Criar app Express uma vez (reutilizado entre invocações warm)
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      console.error(`[tRPC] Error at ${path}:`, error);
    },
  })
);

/**
 * Netlify Function: tRPC API Handler
 * Converte evento Netlify → Express req/res → resposta Netlify
 */
export const handler: Handler = (event: HandlerEvent) => {
  return new Promise((resolve) => {
    // Montar URL com query string
    const qs = event.rawQuery ? `?${event.rawQuery}` : "";
    const url = `${event.path}${qs}`;

    // Decodificar body
    let bodyData: unknown;
    if (event.body) {
      try {
        const rawBody = event.isBase64Encoded
          ? Buffer.from(event.body, "base64").toString("utf8")
          : event.body;
        bodyData = JSON.parse(rawBody);
      } catch {
        bodyData = event.body;
      }
    }

    // Construir objeto req compatível com Express usando IncomingMessage
    const req = new http.IncomingMessage(null as any);
    Object.assign(req, {
      method: event.httpMethod,
      url,
      headers: event.headers ?? {},
      body: bodyData,
      socket: { remoteAddress: event.headers?.["x-forwarded-for"] ?? "127.0.0.1" },
    });

    // Construir objeto res compatível com Express
    const chunks: Buffer[] = [];
    const resHeaders: Record<string, string> = {};
    let statusCode = 200;

    const res = new http.ServerResponse(req);
    const originalSetHeader = res.setHeader.bind(res);
    const originalEnd = res.end.bind(res);
    const originalWrite = res.write.bind(res);

    res.setHeader = (name: string, value: string | number | readonly string[]) => {
      resHeaders[name.toLowerCase()] = String(value);
      return originalSetHeader(name, value);
    };

    (res as any).write = (chunk: Buffer | string, ...args: any[]) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      return true;
    };

    (res as any).end = (chunk?: Buffer | string, ...args: any[]) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      const body = Buffer.concat(chunks).toString("utf8");
      resolve({
        statusCode: res.statusCode ?? 200,
        headers: {
          "content-type": "application/json",
          ...resHeaders,
        },
        body,
      });
    };

    // Processar requisição com Express
    app(req as any, res as any, () => {
      resolve({
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "Not found" }),
      });
    });
  });
};
