import type { Handler, HandlerEvent } from "@netlify/functions";
import "dotenv/config";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";

/**
 * Netlify Function: tRPC API Handler
 *
 * Usa o adaptador fetch do tRPC que é mais simples e compatível com serverless.
 */
export const handler: Handler = async (event: HandlerEvent) => {
  // Reconstruir o path original /api/trpc/...
  let path = event.path;
  if (!path.startsWith("/api/trpc")) {
    path = `/api/trpc${path}`;
  }

  const qs = event.rawQuery ? `?${event.rawQuery}` : "";
  const url = `http://localhost${path}${qs}`;

  console.log(`[tRPC Function] ${event.httpMethod} ${url}`);

  // Decodificar body
  let bodyStr: string | undefined;
  if (event.body) {
    bodyStr = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
  }

  try {
    // Criar Request do fetch API
    const request = new Request(url, {
      method: event.httpMethod,
      headers: new Headers({
        "content-type": "application/json",
        ...(event.headers ?? {}),
      }),
      body: bodyStr && ["POST", "PUT", "PATCH"].includes(event.httpMethod)
        ? bodyStr
        : undefined,
    });

    // Usar o fetchRequestHandler do tRPC
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: request,
      router: appRouter,
      createContext: async () => {
        // Criar um contexto mínimo
        // As procedures públicas não precisam de autenticação
        return {
          req: {
            headers: Object.fromEntries(request.headers.entries()),
            socket: { remoteAddress: event.headers?.["x-forwarded-for"] ?? "127.0.0.1" },
            get: (name: string) => request.headers.get(name),
          },
          res: {
            setHeader: () => {},
            getHeader: () => undefined,
          },
          user: null,
        };
      },
      onError: ({ path, error }) => {
        console.error(`[tRPC] Error at ${path}:`, error);
      },
    });

    const body = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    console.log(
      `[tRPC Function] Response: ${response.status} - ${body.substring(0, 100)}`
    );

    return {
      statusCode: response.status,
      headers: { "content-type": "application/json", ...headers },
      body,
    };
  } catch (error: any) {
    console.error("[tRPC Function] Fatal error:", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
