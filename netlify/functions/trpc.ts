import type { Handler } from "@netlify/functions";
import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
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
export const handler: Handler = (event, _context) => {
  return new Promise((resolve) => {
    // Montar URL com query string
    const qs = event.rawQuery ? `?${event.rawQuery}` : "";
    const url = `${event.path}${qs}`;

    // Construir objeto req compatível com Express
    const req = Object.assign(Object.create(require("http").IncomingMessage.prototype), {
      method: event.httpMethod,
      url,
      headers: event.headers ?? {},
      body: (() => {
        if (!event.body) return undefined;
        try {
          return JSON.parse(
            event.isBase64Encoded
              ? Buffer.from(event.body, "base64").toString("utf8")
              : event.body
          );
        } catch {
          return event.body;
        }
      })(),
      socket: { remoteAddress: event.headers?.["x-forwarded-for"] ?? "127.0.0.1" },
    });

    // Construir objeto res compatível com Express
    const chunks: Buffer[] = [];
    let statusCode = 200;
    const resHeaders: Record<string, string> = {};

    const res = Object.assign(Object.create(require("http").ServerResponse.prototype), {
      statusCode: 200,
      setHeader(name: string, value: string) {
        resHeaders[name.toLowerCase()] = String(value);
      },
      getHeader(name: string) {
        return resHeaders[name.toLowerCase()];
      },
      removeHeader(name: string) {
        delete resHeaders[name.toLowerCase()];
      },
      write(chunk: Buffer | string) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      },
      end(chunk?: Buffer | string) {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const body = Buffer.concat(chunks).toString("utf8");
        resolve({
          statusCode: this.statusCode ?? 200,
          headers: {
            "content-type": "application/json",
            ...resHeaders,
          },
          body,
        });
      },
      on() { return this; },
      once() { return this; },
      emit() { return false; },
    });

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
