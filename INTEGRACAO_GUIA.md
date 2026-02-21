# Integração dos Novos Endpoints - Guia Passo a Passo

## Arquivos Criados

1. **server/gameAnalyzer2GoalMargin.ts** - Novo analisador com estratégia 2-Goal Margin
2. **server/cacheService.ts** - Sistema de cache para otimizar API
3. **server/metricsService.ts** - Serviço de métricas e performance

## Como Integrar no routers.ts

### Passo 1: Imports (JÁ FEITO)

Os imports já foram adicionados automaticamente:
```typescript
import { analyzeGamesFor2GoalMargin, getAnalysisReport } from "./gameAnalyzer2GoalMargin";
import { cacheService } from "./cacheService";
import { metricsService, type AnalysisMetrics } from "./metricsService";
```

### Passo 2: Adicionar Novos Endpoints

Abra `server/routers.ts` na linha 1850 e ANTES de `});` adicione:

```typescript
    // ✅ NOVO: Análise 2-Goal Margin
    analyze2GoalMargin: publicProcedure
      .input(z.object({ 
        apiKey: z.string().optional(),
        analysisDate: z.enum(['today', 'tomorrow']).optional(),
      }))
      .mutation(async ({ input }) => {
        console.log("[Games] Starting 2-GOAL MARGIN analysis...");
        try {
          if (input.apiKey) {
            setDynamicApiKey(input.apiKey);
          }
          const status = await getStatus();
          const allFixtures = await fetchUpcomingFixtures(input.analysisDate || 'today');
          const analyses = await analyzeGamesFor2GoalMargin(allFixtures);
          
          for (const analysis of analyses) {
            await saveAnalysisHistory({
              analysisDate: new Date(),
              totalAnalyzed: allFixtures.length,
              totalApproved: analyses.length,
              analysisData: JSON.stringify(analysis),
            });
          }
          
          return {
            success: true,
            analyses,
            count: analyses.length,
            report: getAnalysisReport(analyses),
          };
        } catch (error: any) {
          return { success: false, error: error.message, analyses: [], count: 0 };
        }
      }),

    // ✅ NOVO: Métricas
    getMetrics: publicProcedure.query(async () => {
      return { success: true, metrics: metricsService.calculateMetrics() };
    }),

    // ✅ NOVO: Relatório de Métricas
    getMetricsReport: publicProcedure.query(async () => {
      return { success: true, report: metricsService.generateReport() };
    }),

    // ✅ NOVO: Cache Stats
    getCacheStats: publicProcedure.query(async () => {
      return { success: true, cache: cacheService.getStats() };
    }),

    // ✅ NOVO: Limpar Cache
    clearCache: publicProcedure.mutation(async () => {
      cacheService.clearAll();
      return { success: true, message: "Cache limpo" };
    }),
```

## Verificação

Após integrar, verifique:

1. `server/routers.ts` tem os imports
2. `server/routers.ts` tem os 5 novos endpoints
3. Nenhum erro de compilação TypeScript

## Uso

### Via Frontend

```typescript
// Análise 2-Goal Margin
const result = await trpc.games.analyze2GoalMargin.mutate({
  apiKey: 'sua_chave',
  analysisDate: 'today'
});

// Métricas
const metrics = await trpc.games.getMetrics.query();

// Relatório
const report = await trpc.games.getMetricsReport.query();

// Cache
const cacheStats = await trpc.games.getCacheStats.query();
```

## Próximos Passos

1. Testar análise com dados reais
2. Implementar UI para exibir resultados
3. Adicionar backtesting
4. Monitorar métricas
