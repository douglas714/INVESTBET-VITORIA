# Integração dos Novos Endpoints - Guia Passo a Passo

## Arquivos Criados

1. **server/gameAnalyzer2GoalMargin.ts** - Novo analisador com estratégia 2-Goal Margin
2. **server/cacheService.ts** - Sistema de cache para otimizar API
3. **server/metricsService.ts** - Serviço de métricas e performance
4. **server/new_endpoints.ts** - Referência dos novos endpoints

## Como Integrar

### Passo 1: Adicionar Imports no routers.ts

Abra `server/routers.ts` e localize a seção de imports (linhas 1-40).

Já foi adicionado automaticamente:
```typescript
import { analyzeGamesFor2GoalMargin, getAnalysisReport } from "./gameAnalyzer2GoalMargin";
import { cacheService } from "./cacheService";
import { metricsService, type AnalysisMetrics } from "./metricsService";
```

### Passo 2: Adicionar Novos Endpoints

Abra `server/routers.ts` e localize a linha 1850 (final do router games).

Antes de `});` (fechamento do router), adicione:

```typescript
    // ✅ NOVO: Análise 2-Goal Margin (Estratégia Otimizada)
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
            console.log("[Games] Using provided API key for 2-Goal Margin analysis");
          }

          const status = await getStatus();
          let apiUsed = 0;
          let apiLimit = 100;
          
          if (status?.response?.requests) {
            apiUsed = status.response.requests.current || 0;
            apiLimit = status.response.requests.limit_day || 100;
            console.log(`[Games] API: ${apiUsed}/${apiLimit} used`);
          }

          const dateType = input.analysisDate || 'today';
          const dateLabel = dateType === 'today' ? 'hoje' : 'amanhã';
          console.log(`[Games] Fetching fixtures for 2-Goal Margin analysis (${dateLabel})...`);

          const allFixtures = await fetchUpcomingFixtures(dateType);
          console.log(`[Games] Found ${allFixtures.length} fixtures for analysis`);

          if (allFixtures.length === 0) {
            return {
              success: true,
              analyses: [],
              count: 0,
              message: `Nenhum jogo encontrado para ${dateLabel}`,
              apiStatus: {
                used: apiUsed,
                limit: apiLimit,
                remaining: apiLimit - apiUsed,
              },
            };
          }

          const analyses = await analyzeGamesFor2GoalMargin(allFixtures);

          for (const analysis of analyses) {
            await saveAnalysisHistory({
              analysisDate: new Date(),
              totalAnalyzed: allFixtures.length,
              totalApproved: analyses.length,
              analysisData: JSON.stringify(analysis),
            });
          }

          const report = getAnalysisReport(analyses);
          console.log(report);

          return {
            success: true,
            analyses,
            count: analyses.length,
            report,
            apiStatus: {
              used: apiUsed,
              limit: apiLimit,
              remaining: apiLimit - apiUsed,
            },
          };
        } catch (error: any) {
          console.error("[Games] Error in 2-Goal Margin analysis:", error.message);
          return {
            success: false,
            error: error.message,
            analyses: [],
            count: 0,
          };
        }
      }),

    // ✅ NOVO: Obter métricas de performance
    getMetrics: publicProcedure.query(async () => {
      const metrics = metricsService.calculateMetrics();
      return {
        success: true,
        metrics,
      };
    }),

    // ✅ NOVO: Gerar relatório de métricas
    getMetricsReport: publicProcedure.query(async () => {
      const report = metricsService.generateReport();
      return {
        success: true,
        report,
      };
    }),

    // ✅ NOVO: Obter status do cache
    getCacheStats: publicProcedure.query(async () => {
      const stats = cacheService.getStats();
      return {
        success: true,
        cache: stats,
      };
    }),

    // ✅ NOVO: Limpar cache
    clearCache: publicProcedure.mutation(async () => {
      cacheService.clearAll();
      return {
        success: true,
        message: "Cache limpo com sucesso",
      };
    }),
```

### Passo 3: Atualizar o Frontend (Opcional)

Para usar os novos endpoints no frontend, adicione um novo componente em `client/src/pages/`:

```typescript
// client/src/pages/Analysis2GoalMargin.tsx
import { trpc } from "@/lib/trpc";

export function Analysis2GoalMargin() {
  const mutation = trpc.games.analyze2GoalMargin.useMutation();
  const metricsQuery = trpc.games.getMetrics.useQuery();

  const handleAnalyze = async () => {
    const result = await mutation.mutateAsync({
      analysisDate: 'today',
    });
    console.log(result);
  };

  return (
    <div className="space-y-4">
      <button onClick={handleAnalyze} disabled={mutation.isPending}>
        {mutation.isPending ? 'Analisando...' : 'Iniciar Análise 2-Goal Margin'}
      </button>
      
      {metricsQuery.data && (
        <div>
          <h3>Métricas</h3>
          <pre>{JSON.stringify(metricsQuery.data.metrics, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

## Testes

### Testar via tRPC Client

```typescript
// No console do navegador ou em um teste
const result = await client.games.analyze2GoalMargin.mutate({
  apiKey: 'sua_chave_aqui',
  analysisDate: 'today'
});

console.log(result.analyses); // Ver análises
console.log(result.report);   // Ver relatório
```

### Testar Métricas

```typescript
const metrics = await client.games.getMetrics.query();
console.log(metrics.metrics);
```

### Testar Cache

```typescript
const cacheStats = await client.games.getCacheStats.query();
console.log(cacheStats.cache);
```

## Verificação

Para verificar se tudo foi integrado corretamente:

1. Abra `server/routers.ts`
2. Procure por `analyze2GoalMargin` - deve estar presente
3. Procure por `getMetrics` - deve estar presente
4. Procure por `getCacheStats` - deve estar presente

Se todos estiverem presentes, a integração foi bem-sucedida!

## Próximos Passos

1. Testar a análise com dados reais
2. Implementar backtesting
3. Adicionar UI para exibir resultados
4. Monitorar métricas de performance
