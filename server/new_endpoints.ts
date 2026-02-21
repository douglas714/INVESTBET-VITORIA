// Novos endpoints para adicionar ao appRouter em routers.ts
// Adicionar estes endpoints antes do fechamento do router games

export const newEndpoints = `
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
            console.log(\`[Games] API: \${apiUsed}/\${apiLimit} used\`);
          }

          const dateType = input.analysisDate || 'today';
          const dateLabel = dateType === 'today' ? 'hoje' : 'amanhã';
          console.log(\`[Games] Fetching fixtures for 2-Goal Margin analysis (\${dateLabel})...\`);

          // Buscar fixtures do dia
          const allFixtures = await fetchUpcomingFixtures(dateType);
          console.log(\`[Games] Found \${allFixtures.length} fixtures for analysis\`);

          if (allFixtures.length === 0) {
            return {
              success: true,
              analyses: [],
              count: 0,
              message: \`Nenhum jogo encontrado para \${dateLabel}\`,
              apiStatus: {
                used: apiUsed,
                limit: apiLimit,
                remaining: apiLimit - apiUsed,
              },
            };
          }

          // Executar análise 2-Goal Margin
          const analyses = await analyzeGamesFor2GoalMargin(
            allFixtures,
            (progress, approved) => {
              console.log(
                \`[Games] Progress: \${progress.analyzed}/\${progress.total} analyzed, \` +
                \`\${progress.approved} approved\`
              );
            }
          );

          // Salvar análises no histórico
          for (const analysis of analyses) {
            await saveAnalysisHistory({
              analysisDate: new Date(),
              totalAnalyzed: allFixtures.length,
              totalApproved: analyses.length,
              analysisData: JSON.stringify(analysis),
            });
          }

          // Gerar relatório
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
`;
