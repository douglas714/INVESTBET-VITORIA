import { defineConfig } from "drizzle-kit";

// Configuração do Drizzle - Suporta MySQL opcional
// Se MySQL não estiver disponível, usar JSON Storage

const connectionString = process.env.DATABASE_URL || "mysql://root:@localhost:3306/sports_betting";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
  // Não validar conexão durante build
  strict: false,
});
