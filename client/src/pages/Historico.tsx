import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, ArrowLeft, FileText, Calendar, ChevronDown, ChevronUp, Target, RefreshCw, CheckCircle2, XCircle, Key, Share2, Copy, Check, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { format, isToday, isYesterday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GameCard } from "@/components/GameCard";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Historico() {
  const API_STORAGE_KEY = "investbet_api_football_key";
  const [selectedHistory, setSelectedHistory] = useState<any>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(API_STORAGE_KEY);
      if (saved && saved.trim()) setApiKey(saved.trim());
    } catch {
      // ignore
    }
  }, []);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error("Insira uma chave de API válida para salvar");
      return;
    }
    try {
      localStorage.setItem(API_STORAGE_KEY, apiKey.trim());
      toast.success("Chave de API salva neste navegador");
    } catch {
      toast.error("Não foi possível salvar a chave (localStorage bloqueado)");
    }
  };

  const handleClearApiKey = () => {
    try {
      localStorage.removeItem(API_STORAGE_KEY);
    } catch {
      // ignore
    }
    setApiKey("");
    toast.success("Chave removida");
  };
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportText, setExportText] = useState("");
  const [exportDate, setExportDate] = useState("");
  const [copied, setCopied] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  // Buscar histórico com jogos
  const historyQuery = trpc.games.history.useQuery();
  
  // Buscar todos os jogos salvos
  const allGamesQuery = trpc.games.allGames.useQuery();
  
  // Mutation para atualizar todos os resultados
  const updateAllMutation = trpc.games.updateAllResults.useMutation();

  // Mutation para limpar histórico
  const clearHistoryMutation = trpc.games.clearHistory.useMutation();


  const history = historyQuery.data || [];
  const allGames = allGamesQuery.data || [];

  // A API retorna datas em UTC (ex.: 22:00 -03 vira 01:00Z no dia seguinte).
  // Se usarmos toISOString() para agrupar, jogos noturnos acabam indo para o "dia seguinte".
  // Aqui geramos a chave de data no fuso do Brasil para manter o agrupamento correto.
  const getDateKeyBR = (isoOrDate: string | Date) => {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    // en-CA => YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  };

  // Agrupar jogos por data (usando a data do jogo, não a data de análise)
  const gamesByDate = allGames.reduce((acc: any, game: any) => {
    // Usar a data do commenceTime para agrupar
    const gameDate = new Date(game.commenceTime);
    const dateKey = getDateKeyBR(gameDate);
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(game);
    return acc;
  }, {});

  // Ordenar datas (mais recentes primeiro)
  const sortedDates = Object.keys(gamesByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Calcular estatísticas
  const totalGames = allGames.length;
  const completedGames = allGames.filter((g: any) => g.completed).length;
  const pendingGames = totalGames - completedGames;
  const approvedGames = allGames.filter((g: any) => g.status === 'approved').length;

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // Função para obter label da data
  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "EEEE", { locale: ptBR });
  };

  // Atualizar todos os resultados pendentes
  const handleUpdateAllResults = async () => {
    if (!apiKey.trim()) {
      setShowApiKeyDialog(true);
      return;
    }
    
    setIsUpdatingAll(true);
    setShowApiKeyDialog(false);
    
    try {
      const result = await updateAllMutation.mutateAsync({ apiKey });
      if (result.success) {
        toast.success(result.message);
        // Recarregar dados
        allGamesQuery.refetch();
        historyQuery.refetch();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      const errorMsg = error.message || "Erro desconhecido";
      if (errorMsg.includes("API") || errorMsg.includes("key")) {
        setShowApiKeyDialog(true);
        toast.error("É necessário fornecer uma chave de API válida");
      } else {
        toast.error(`Erro: ${errorMsg}`);
      }
    } finally {
      setIsUpdatingAll(false);
    }
  };

  // Função para confirmar atualização com API key
  const handleConfirmUpdate = () => {
    if (!apiKey.trim()) {
      toast.error("Por favor, insira uma chave de API válida");
      return;
    }
    handleUpdateAllResults();
  };

  // Callback quando um resultado é atualizado
  const handleResultUpdated = () => {
    allGamesQuery.refetch();
  };

  // Função para gerar texto de exportação para WhatsApp (SEM previsão de placar)
  const generateWhatsAppExport = (date: string, gamesForDate: any[]) => {
    if (!gamesForDate || gamesForDate.length === 0) {
      toast.error("Nenhum jogo para exportar");
      return;
    }

    const dateObj = parseISO(date);
    const dateLabel = getDateLabel(date);
    const formattedDate = format(dateObj, "dd/MM/yyyy", { locale: ptBR });

    let text = `🏆 *INVESTBET - SINAIS* 🏆\n`;
    text += `📅 ${dateLabel} - ${formattedDate}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Ordenar por força do sinal
    const sortedGames = [...gamesForDate].sort((a, b) => 
      (b.strengthScore || 0) - (a.strengthScore || 0)
    );

    sortedGames.forEach((game: any, index: number) => {
      const gameTime = new Date(game.commenceTime);
      const timeStr = format(gameTime, "HH:mm", { locale: ptBR });
      const score = game.strengthScore || 0;
      const homeOdd = parseFloat(game.homeOdd) || 0;
      const drawOdd = parseFloat(game.drawOdd) || 0;
      const awayOdd = parseFloat(game.awayOdd) || 0;
      
      text += `*${index + 1}. ${game.homeTeam} x ${game.awayTeam}*\n`;
      text += `⚽ Liga: ${game.league}\n`;
      text += `🕐 Horário: ${timeStr}\n`;
      text += `📊 Força do Sinal: ${score}/100\n`;
      text += `⭐ Favorito forte (casa): ${game.favoriteStrong ? 'SIM' : 'NÃO'}\n`;
      if (homeOdd > 0 && drawOdd > 0 && awayOdd > 0) {
        text += `💰 Odds: Casa ${homeOdd.toFixed(2)} | Empate ${drawOdd.toFixed(2)} | Fora ${awayOdd.toFixed(2)}\n`;
      } else {
        text += `💰 Odds: indisponível (confirmado em casas)\n`;
      }

      // Adicionar resultado se disponível
      if (game.completed && game.scoreHome !== null && game.scoreAway !== null) {
        text += `✅ Resultado: ${game.scoreHome} x ${game.scoreAway}\n`;
      }
      
      if (game.criteria?.bookmakers && game.criteria.bookmakers.length > 0) {
        text += `🏪 Casas: ${game.criteria.bookmakers.slice(0, 5).join(', ')}\n`;
      }
      
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📈 Total: ${gamesForDate.length} sinais\n`;
    text += `✅ Jogos aprovados pelo robô\n`;
    text += `⚠️ Aposte com responsabilidade!\n`;

    setExportText(text);
    setExportDate(date);
    setShowExportDialog(true);
    setCopied(false);
  };

  // Função para copiar texto
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      toast.success("Texto copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error("Erro ao copiar texto");
    }
  };

  // Função para compartilhar no WhatsApp
  const handleShareWhatsApp = () => {
    const encodedText = encodeURIComponent(exportText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  // Limpar histórico (zera tudo para não acumular)
  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      const result = await clearHistoryMutation.mutateAsync();
      if (result.success) {
        toast.success(result.message);
        setExpandedItems([]);
        setSelectedHistory(null);
        setShowClearDialog(false);
        await Promise.all([allGamesQuery.refetch(), historyQuery.refetch()]);
      } else {
        toast.error(result.message || "Não foi possível limpar o histórico");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao limpar histórico");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a5f4a] via-[#0f4a3a] to-[#0a2e24]">
      {/* Header */}
      <header className="border-b border-[#d4af37]/20 bg-black/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-[#d4af37] hover:bg-[#d4af37]/10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-[#d4af37] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#d4af37]" />
                  </div>
                  Histórico de Análises
                </h1>
                <p className="text-[#10b981] mt-1">
                  Consulte análises anteriores e resultados dos jogos
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Botão para limpar histórico */}
              {allGames.length > 0 && (
                <Button
                  onClick={() => setShowClearDialog(true)}
                  variant="outline"
                  className="border-red-500/40 text-red-200 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Histórico
                </Button>
              )}

              {/* Botão para atualizar todos os resultados */}
              {pendingGames > 0 && (
                <Button
                  onClick={() => setShowApiKeyDialog(true)}
                  disabled={isUpdatingAll}
                  className="bg-[#d4af37] text-black hover:bg-[#d4af37]/90"
                >
                  {isUpdatingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Atualizar Resultados ({pendingGames})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Summary */}
        {allGames.length > 0 && (
          <Card className="mb-8 bg-black/40 border-[#d4af37]/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-sm text-[#10b981]">Total de Jogos</p>
                  <p className="text-3xl font-bold text-[#d4af37]">{totalGames}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[#10b981]">Aprovados</p>
                  <p className="text-3xl font-bold text-[#10b981]">{approvedGames}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[#10b981]">Finalizados</p>
                  <p className="text-3xl font-bold text-blue-400">{completedGames}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[#10b981]">Pendentes</p>
                  <p className="text-3xl font-bold text-yellow-400">{pendingGames}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[#10b981]">Datas</p>
                  <p className="text-3xl font-bold text-white">{sortedDates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {historyQuery.isLoading || allGamesQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
            <span className="ml-3 text-[#10b981]">Carregando histórico...</span>
          </div>
        ) : allGames.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-[#d4af37]/50 mx-auto mb-4" />
            <p className="text-[#10b981] text-lg">Nenhuma análise realizada ainda</p>
            <p className="text-gray-400 mt-2">Faça sua primeira análise na página inicial</p>
            <Link href="/">
              <Button className="mt-4 bg-[#d4af37] text-black hover:bg-[#d4af37]/90">
                Ir para Análise
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Jogos agrupados por data */}
            {sortedDates.map((date) => {
              const gamesForDate = gamesByDate[date];
              const isExpanded = expandedItems.includes(date);
              const approvedCount = gamesForDate.filter((g: any) => g.status === 'approved').length;
              const completedCount = gamesForDate.filter((g: any) => g.completed).length;
              const pendingCount = gamesForDate.length - completedCount;
              
              // Verificar se a data é passada
              const dateObj = parseISO(date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPastDate = dateObj < today;
              
              // Obter label da data
              const dateLabel = getDateLabel(date);
              
              return (
                <Card key={date} className="bg-black/40 border-[#d4af37]/30 overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-[#d4af37]/5 transition-colors"
                    onClick={() => toggleExpand(date)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#d4af37]/20 flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-[#d4af37]" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-[#d4af37]">
                            {dateLabel} - {format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                          <div className="flex items-center gap-4 mt-1 flex-wrap">
                            <span className="text-sm text-[#10b981]">
                              {gamesForDate.length} jogo{gamesForDate.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-sm text-[#10b981]">
                              • {approvedCount} aprovado{approvedCount !== 1 ? 's' : ''}
                            </span>
                            {completedCount > 0 && (
                              <span className="text-sm text-blue-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {completedCount} finalizado{completedCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {pendingCount > 0 && isPastDate && (
                              <span className="text-sm text-yellow-400 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" />
                                {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Botão de exportar para WhatsApp */}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            generateWhatsAppExport(date, gamesForDate);
                          }}
                          size="sm"
                          className="bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                        >
                          <Share2 className="w-4 h-4 mr-1" />
                          WhatsApp
                        </Button>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#d4af37]">{approvedCount}</p>
                          <p className="text-xs text-[#10b981]">aprovados</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-[#d4af37]" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-[#d4af37]" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t border-[#d4af37]/20 p-4">
                      <div className="grid gap-4">
                        {gamesForDate
                          .sort((a: any, b: any) => (b.strengthScore || 0) - (a.strengthScore || 0))
                          .map((game: any, index: number) => (
                            <GameCard 
                              key={game.id || game.gameId || index} 
                              game={{
                                ...game,
                                homeOdd: parseFloat(game.homeOdd) || 0,
                                drawOdd: parseFloat(game.drawOdd) || 0,
                                awayOdd: parseFloat(game.awayOdd) || 0,
                                bookmakers: game.criteria?.bookmakers || [],
                                // ✅ manter os mesmos campos usados no card principal
                                favoriteStrong: game.criteria?.favoriteStrong ?? (game as any).favoriteStrong ?? false,
                                h2hStrongConsidered: game.criteria?.h2hStrongConsidered ?? (game as any).h2hStrongConsidered ?? 0,
                                h2hStrongWins: game.criteria?.h2hStrongWins ?? (game as any).h2hStrongWins ?? 0,
                                strengthTier: game.criteria?.strengthTier ?? (game as any).strengthTier ?? "",
                                matchedCriteria: game.criteria?.matchedCriteria ?? (game as any).matchedCriteria ?? [],
                                predictedHomeScore: game.criteria?.predictedHomeScore,
                                predictedAwayScore: game.criteria?.predictedAwayScore,
                                predictionConfidence: game.criteria?.predictionConfidence,
                                predictionReasoning: game.criteria?.predictionReasoning,
                                // Probabilidades 1X2 (em %)
                                winProbability: game.criteria?.winProbability ?? (game as any).winProbability ?? null,
                                probHomePct: game.criteria?.probHomePct ?? (game as any).probHomePct ?? null,
                                probDrawPct: game.criteria?.probDrawPct ?? (game as any).probDrawPct ?? null,
                                probAwayPct: game.criteria?.probAwayPct ?? (game as any).probAwayPct ?? null,

                              }} 
                              position={index + 1}
                              showDetails={true}
                              onResultUpdated={handleResultUpdated}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Histórico de Sessões de Análise */}
        {history.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-[#d4af37] mb-6 flex items-center gap-3">
              <TrendingUp className="w-6 h-6" />
              Sessões de Análise
            </h2>
            <div className="grid gap-4">
              {history.map((item: any, index: number) => (
                <Card 
                  key={item.id || index}
                  className="bg-black/40 border-[#d4af37]/30 hover:border-[#d4af37]/60 cursor-pointer transition-all"
                  onClick={() => setSelectedHistory(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                          <Target className="w-5 h-5 text-[#10b981]" />
                        </div>
                        <div>
                          <p className="text-[#d4af37] font-semibold">
                            {item.approvedGames || item.totalApproved || 0} de {item.analyzedGames || item.totalAnalyzed || 0} aprovados
                          </p>
                          <p className="text-[#10b981] text-sm">
                            {item.createdAt 
                              ? format(new Date(item.createdAt), "PPpp", { locale: ptBR }) 
                              : "Data não disponível"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#d4af37]">
                          {item.approvedGames || item.totalApproved || 0}
                        </p>
                        <p className="text-xs text-[#10b981]">jogos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Details Dialog */}
      <Dialog open={!!selectedHistory} onOpenChange={() => setSelectedHistory(null)}>
        <DialogContent className="bg-[#0a2e24] border-[#d4af37]/30 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#d4af37] flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalhes da Análise
            </DialogTitle>
          </DialogHeader>
          {selectedHistory && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-black/40 border border-[#d4af37]/20">
                  <p className="text-[#10b981] text-sm font-medium">Aprovados</p>
                  <p className="text-2xl font-bold text-[#d4af37]">
                    {selectedHistory.approvedGames || selectedHistory.totalApproved || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-black/40 border border-[#d4af37]/20">
                  <p className="text-[#10b981] text-sm font-medium">Analisados</p>
                  <p className="text-2xl font-bold text-white">
                    {selectedHistory.analyzedGames || selectedHistory.totalAnalyzed || 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-black/40 border border-[#d4af37]/20">
                  <p className="text-[#10b981] text-sm font-medium">Rejeitados</p>
                  <p className="text-2xl font-bold text-red-400">
                    {selectedHistory.rejectedGames || 
                      ((selectedHistory.analyzedGames || selectedHistory.totalAnalyzed || 0) - 
                       (selectedHistory.approvedGames || selectedHistory.totalApproved || 0))}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-black/40 border border-[#d4af37]/20">
                  <p className="text-[#10b981] text-sm font-medium">Data</p>
                  <p className="text-lg font-bold text-white">
                    {selectedHistory.createdAt 
                      ? format(new Date(selectedHistory.createdAt), "dd/MM/yyyy", { locale: ptBR })
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Games List */}
              {selectedHistory.games && selectedHistory.games.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-[#d4af37] mb-4">
                    Jogos desta Análise ({selectedHistory.games.length})
                  </h3>
                  <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2">
                    {selectedHistory.games.map((game: any, idx: number) => (
                      <GameCard 
                        key={game.gameId || idx} 
                        game={game} 
                        position={idx + 1}
                        showDetails={false}
                        onResultUpdated={handleResultUpdated}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Limpar Histórico */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="bg-[#1a5f4a] border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-red-200 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Limpar Histórico
            </DialogTitle>
            <DialogDescription className="text-[#10b981]">
              Isso vai apagar todos os jogos salvos, sessões de análise e estatísticas.
              <br />
              Use quando quiser começar do zero e não acumular análises antigas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowClearDialog(false)}
              disabled={isClearing}
              variant="outline"
              className="flex-1 bg-black/50 text-[#d4af37] border border-[#d4af37]/30 hover:bg-black/70"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleClearHistory}
              disabled={isClearing}
              className="flex-1 bg-red-500 text-white hover:bg-red-500/90"
            >
              {isClearing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Limpando...
                </>
              ) : (
                "Limpar agora"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para API Key */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="bg-[#1a5f4a] border-[#d4af37]/30">
          <DialogHeader>
            <DialogTitle className="text-[#d4af37] flex items-center gap-2">
              <Key className="w-5 h-5" />
              Chave de API Necessária
            </DialogTitle>
            <DialogDescription className="text-[#10b981]">
              Para atualizar os resultados de todos os jogos pendentes, é necessário fornecer uma chave de API Football válida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#10b981] mb-2">
                Chave de API Football
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Cole sua chave de API Football"
                  className="flex-1 px-4 py-2 bg-black/50 border border-[#d4af37]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
                />
                <Button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="bg-[#10b981] text-black hover:bg-[#10b981]/90"
                  disabled={!apiKey.trim() || isUpdatingAll}
                >
                  Salvar
                </Button>
                <Button
                  type="button"
                  onClick={handleClearApiKey}
                  className="bg-black/50 text-[#d4af37] border border-[#d4af37]/30 hover:bg-black/70"
                  disabled={isUpdatingAll}
                >
                  Limpar
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowApiKeyDialog(false)}
                className="flex-1 bg-black/50 text-[#d4af37] border border-[#d4af37]/30 hover:bg-black/70"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmUpdate}
                disabled={!apiKey.trim() || isUpdatingAll}
                className="flex-1 bg-[#d4af37] text-black hover:bg-[#d4af37]/90"
              >
                {isUpdatingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar Todos
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Export to WhatsApp */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="bg-[#1a5f4a] border-[#d4af37]/30 max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-[#d4af37] flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Exportar Sinais para WhatsApp
            </DialogTitle>
            <DialogDescription className="text-[#10b981]">
              Copie o texto abaixo ou compartilhe diretamente no WhatsApp
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Text Preview */}
            <div className="bg-black/40 rounded-lg border border-[#d4af37]/30 p-4 max-h-[40vh] overflow-y-auto">
              <pre className="text-white text-sm whitespace-pre-wrap font-mono">
                {exportText}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleCopyText}
                className={`flex-1 ${copied ? 'bg-[#10b981]' : 'bg-[#d4af37]'} text-black hover:opacity-90`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Texto
                  </>
                )}
              </Button>
              <Button
                onClick={handleShareWhatsApp}
                className="flex-1 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Abrir WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
