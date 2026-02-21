import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import "dotenv/config";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

/**
 * Netlify Function: tRPC API Handler
 * 
 * Usa o adaptador fetch puro do tRPC que é mais simples e compatível com serverless.
 */
export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    // Reconstruir o path original
    let path = event.path;
    if (!path.startsWith("/api/trpc")) {
      path = `/api/trpc${path}`;
    }

    const qs = event.rawQuery ? `?${event.rawQuery}` : "";
    const url = `http://localhost${path}${qs}`;

    console.log(`[tRPC] ${event.httpMethod} ${url}`);

    // Decodificar body
    let bodyStr: string | undefined;
    if (event.body) {
      bodyStr = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;
    }

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
        // Criar um contexto mínimo que satisfaz o tipo
        return {
          req: request as any,
          res: {} as any,
        };
      },
      onError: ({ path, error }) => {
        console.error(`[tRPC] Error at ${path}:`, error);
      },
    });

    // Extrair body
    const body = await response.text();
    const statusCode = response.status;

    console.log(`[tRPC] Response: ${statusCode}`);

    // Retornar resposta
    return {
      statusCode,
      headers: {
        "content-type": "application/json",
        ...Object.fromEntries(response.headers),
      },
      body,
    };
  } catch (error: any) {
    console.error("[tRPC] Error:", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        error: error.message || "Internal Server Error",
      }),
    };
  }
};
