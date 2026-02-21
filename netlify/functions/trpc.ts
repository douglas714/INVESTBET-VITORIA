import type { Handler, HandlerEvent } from "@netlify/functions";
import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

// Criar app Express uma vez (reutilizado entre invocações warm)
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Montar o middleware tRPC na raiz
app.use(
  "/",
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
 *
 * O redirect no netlify.toml mapeia:
 *   /api/trpc/* → /.netlify/functions/trpc/:splat
 *
 * Então quando chega /api/trpc/games.analyze, o Netlify chama
 * esta função com event.path = /games.analyze
 */
export const handler: Handler = (event: HandlerEvent) => {
  return new Promise((resolve) => {
    const qs = event.rawQuery ? `?${event.rawQuery}` : "";

    // Usar o path relativo (sem /api/trpc)
    let urlPath = event.path;
    if (urlPath.startsWith("/api/trpc")) {
      urlPath = urlPath.replace("/api/trpc", "") || "/";
    }
    const url = `${urlPath}${qs}`;

    console.log(
      `[tRPC Function] ${event.httpMethod} ${url} (original: ${event.path})`
    );

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

    // Usar uma abordagem mais simples: criar um mock de req/res compatível com Express
    // sem depender de http.IncomingMessage/ServerResponse
    const bodyChunks: string[] = [];
    const resHeaders: Record<string, string> = {
      "content-type": "application/json",
    };
    let statusCode = 200;

    // Mock de request
    const req: any = {
      method: event.httpMethod,
      url,
      headers: {
        ...(event.headers ?? {}),
        "content-type": "application/json",
      },
      body: bodyData,
      socket: {
        remoteAddress:
          event.headers?.["x-forwarded-for"] ?? "127.0.0.1",
      },
      // Métodos necessários pelo Express
      get(name: string) {
        return this.headers[name.toLowerCase()];
      },
      is(type: string) {
        const ct = this.headers["content-type"] ?? "";
        return ct.includes(type);
      },
    };

    // Mock de response
    const res: any = {
      statusCode: 200,
      headersSent: false,
      locals: {},
      setHeader(name: string, value: string | number | string[]) {
        resHeaders[name.toLowerCase()] = String(value);
        return this;
      },
      getHeader(name: string) {
        return resHeaders[name.toLowerCase()];
      },
      removeHeader(name: string) {
        delete resHeaders[name.toLowerCase()];
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      write(chunk: Buffer | string | Uint8Array) {
        if (chunk) {
          if (Buffer.isBuffer(chunk) || chunk instanceof Uint8Array) {
            bodyChunks.push(Buffer.from(chunk).toString("utf8"));
          } else {
            bodyChunks.push(String(chunk));
          }
        }
        return true;
      },
      end(chunk?: Buffer | string | Uint8Array) {
        if (chunk) {
          if (Buffer.isBuffer(chunk) || chunk instanceof Uint8Array) {
            bodyChunks.push(Buffer.from(chunk).toString("utf8"));
          } else {
            bodyChunks.push(String(chunk));
          }
        }
        const body = bodyChunks.join("");
        console.log(
          `[tRPC Function] Response: ${this.statusCode} - ${body.substring(0, 100)}`
        );
        resolve({
          statusCode: this.statusCode ?? 200,
          headers: resHeaders,
          body,
        });
      },
      json(data: unknown) {
        this.setHeader("content-type", "application/json");
        this.end(JSON.stringify(data));
        return this;
      },
      send(data: unknown) {
        if (typeof data === "string") {
          this.end(data);
        } else {
          this.end(JSON.stringify(data));
        }
        return this;
      },
      on() { return this; },
      once() { return this; },
      emit() { return false; },
    };

    // Processar requisição com Express
    app(req, res, () => {
      console.log(`[tRPC Function] No route matched for: ${url}`);
      resolve({
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "tRPC route not found", path: url }),
      });
    });
  });
};
