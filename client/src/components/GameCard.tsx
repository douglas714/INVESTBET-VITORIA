import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, TrendingUp, Star, Trophy, Building2, Target, BarChart3, RefreshCw, CheckCircle2, XCircle, Loader2, Key } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function implied1x2FromOdds(homeOdd?: number, drawOdd?: number, awayOdd?: number) {
  const ho = Number(homeOdd);
  const doo = Number(drawOdd);
  const ao = Number(awayOdd);
  if (!Number.isFinite(ho) || !Number.isFinite(doo) || !Number.isFinite(ao) || ho <= 1e-9 || doo <= 1e-9 || ao <= 1e-9) {
    return null;
  }
  const ph = 1 / ho;
  const pd = 1 / doo;
  const pa = 1 / ao;
  const sum = ph + pd + pa;
  return {
    ph: (ph / sum) * 100,
    pd: (pd / sum) * 100,
    pa: (pa / sum) * 100,
  };
}

function formatPct(v: number) {
  return `${Number(v).toFixed(1)}%`;
}

interface GameCardProps {
  game: {
    gameId?: string;
    fixtureId?: number;
    league: string;
    leagueLogo?: string;
    country?: string;
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    commenceTime: string;
    homeOdd: number;
    drawOdd?: number;
    awayOdd: number;
    oddDifference?: number;
    homeWinRate?: number;
    awayWinRate?: number;
    h2hHomeWins?: number;
    h2hAwayWins?: number;
    h2hMatches?: number;
    approved?: boolean;
    status?: string;
    approvalScore?: number;
    strengthScore?: number;
    rejectionReasons?: string[];
    details?: {
      criterion1?: boolean;
      criterion2?: boolean;
      criterion3?: boolean;
    };
    // Casas de apostas
    bookmakers?: string[];
    bookmakersCount?: number;
    // Previsão de placar
    predictedHomeScore?: number;
    predictedAwayScore?: number;
    predictionConfidence?: number;
    predictionReasoning?: string;
    // Probabilidades 1X2 (em %)
    probHomePct?: number | null;
    probDrawPct?: number | null;
    probAwayPct?: number | null;
    winProbability?: number | null;
    // Resultado real
    realHomeScore?: number | null;
    realAwayScore?: number | null;
    scoreHome?: number | null;
    scoreAway?: number | null;
    matchStatus?: string;
    completed?: boolean;
    resultUpdated?: boolean;
  };
  position?: number;
  showDetails?: boolean;
  onResultUpdated?: () => void;
}

export function GameCard({ game, position, showDetails = true, onResultUpdated }: GameCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localResult, setLocalResult] = useState<{
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    finished: boolean;
  } | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  
  const updateResultMutation = trpc.games.updateResult.useMutation();
  
  const gameTime = new Date(game.commenceTime);
  const now = new Date();
  const isPastGame = gameTime < now;
  const isGameStarted = isPastGame || (game.matchStatus && game.matchStatus !== 'NS');
  
  // Calcular score (usa approvalScore ou strengthScore)
  const score = game.approvalScore ?? game.strengthScore ?? 0;
  const scorePercentage = Math.round((score / 100) * 100);
  
  // Determinar se está aprovado (usa approved ou status)
  const isApproved = game.approved ?? (game.status === 'approved');
  
  // Valores padrão para odds
  const homeOdd = game.homeOdd ?? 0;
  const awayOdd = game.awayOdd ?? 0;
  const drawOdd = game.drawOdd ?? ((homeOdd + awayOdd) / 2);
  const odds1x2Available = homeOdd > 0 && drawOdd > 0 && awayOdd > 0;
  const implied = odds1x2Available ? implied1x2FromOdds(homeOdd, drawOdd, awayOdd) : null;
  
  // Calcular critérios dinamicamente se não existirem
  const criterion1 = game.details?.criterion1 ?? (odds1x2Available ? (homeOdd < 2.0) : false);
  const criterion2 = game.details?.criterion2 ?? (odds1x2Available ? (awayOdd > 3.0) : false);
  const criterion3 = game.details?.criterion3 ?? (odds1x2Available ? (homeOdd < drawOdd && drawOdd < awayOdd) : false);
  
  // Valores padrão para estatísticas
  const homeWinRate = game.homeWinRate ?? 0;
  const awayWinRate = game.awayWinRate ?? 0;
  const h2hHomeWins = game.h2hHomeWins ?? 0;
  const h2hAwayWins = game.h2hAwayWins ?? 0;
  const rejectionReasons = game.rejectionReasons ?? [];
  
  // Casas de apostas
  const bookmakers = game.bookmakers ?? [];
  const bookmakersCount = game.bookmakersCount ?? bookmakers.length;
  
  // Previsão de placar
  const predictedHomeScore = game.predictedHomeScore ?? 0;
  const predictedAwayScore = game.predictedAwayScore ?? 0;
  const predictionConfidence = game.predictionConfidence ?? 50;
  const predictionReasoning = game.predictionReasoning ?? "";
  
  // Resultado real (do estado local ou do game)
  const realHomeScore = localResult?.homeScore ?? game.realHomeScore ?? game.scoreHome;
  const realAwayScore = localResult?.awayScore ?? game.realAwayScore ?? game.scoreAway;
  const matchStatus = localResult?.status ?? game.matchStatus ?? "NS";
  const isFinished = localResult?.finished ?? game.completed ?? false;
  const hasResult = realHomeScore !== null && realHomeScore !== undefined;

  // Verificar se a previsão acertou
  const predictionCorrect = hasResult && isFinished && 
    realHomeScore === predictedHomeScore && 
    realAwayScore === predictedAwayScore;
  
  // Verificar se acertou o vencedor
  const predictedWinner = predictedHomeScore > predictedAwayScore ? 'home' : 
                          predictedAwayScore > predictedHomeScore ? 'away' : 'draw';
  const actualWinner = hasResult ? (
    realHomeScore! > realAwayScore! ? 'home' : 
    realAwayScore! > realHomeScore! ? 'away' : 'draw'
  ) : null;
  const winnerCorrect = actualWinner && predictedWinner === actualWinner;

  // Função para atualizar resultado
  const handleUpdateResult = async (apiKey?: string) => {
    if (!game.gameId) {
      toast.error("ID do jogo não encontrado");
      return;
    }
    
    setIsUpdating(true);
    setShowApiKeyDialog(false);
    
    try {
      const result = await updateResultMutation.mutateAsync({
        gameId: game.gameId,
        fixtureId: game.fixtureId,
        apiKey: apiKey || tempApiKey || undefined
      });
      
      if (result.success && result.result) {
        setLocalResult({
          homeScore: result.result.homeScore,
          awayScore: result.result.awayScore,
          status: result.result.status,
          finished: result.result.finished
        });
        toast.success(result.message);
        onResultUpdated?.();
      } else {
        // Se falhar por falta de API key, mostrar dialog
        if (result.message?.includes("API") || result.message?.includes("key")) {
          setShowApiKeyDialog(true);
          toast.error("É necessário fornecer uma chave de API para buscar resultados");
        } else {
          toast.error(result.message || "Erro ao buscar resultado");
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || "Erro desconhecido";
      // Se o erro for relacionado a API key, mostrar dialog
      if (errorMsg.includes("API") || errorMsg.includes("key") || errorMsg.includes("configured")) {
        setShowApiKeyDialog(true);
        toast.error("É necessário fornecer uma chave de API para buscar resultados");
      } else {
        toast.error(`Erro: ${errorMsg}`);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Função para tentar com API key
  const handleUpdateWithApiKey = () => {
    if (!tempApiKey.trim()) {
      toast.error("Por favor, insira uma chave de API válida");
      return;
    }
    handleUpdateResult(tempApiKey);
  };

  return (
    <>
      <Card className="bg-black/40 border-[#d4af37]/30 hover:border-[#d4af37]/60 transition-all duration-300 hover:shadow-lg hover:shadow-[#d4af37]/20 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Position Badge */}
              {position && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50">
                    <span className="text-sm font-bold text-[#d4af37]">#{position}</span>
                  </div>
                  {position <= 3 && (
                    <Trophy className={`w-4 h-4 ${position === 1 ? 'text-[#d4af37]' : position === 2 ? 'text-gray-400' : 'text-amber-700'}`} />
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                {game.leagueLogo && (
                  <img src={game.leagueLogo} alt={game.league} className="w-5 h-5 object-contain" />
                )}
                <p className="text-sm text-[#10b981] font-medium truncate">
                  {game.league}
                </p>
                {game.country && (
                  <span className="text-xs text-gray-400">({game.country})</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-[#10b981]">
                <Clock className="w-3.5 h-3.5" />
                <span>{format(gameTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                {isPastGame && !isFinished && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                    Em andamento
                  </Badge>
                )}
                {isFinished && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                    Finalizado
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                className={`font-semibold ${
                  isApproved
                    ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }`}
              >
                <span className="mr-1.5">{isApproved ? "✓" : "✗"}</span>
                {isApproved ? "APROVADO" : "REJEITADO"}
              </Badge>

              {/* Nível do jogo (Fraco/Médio/Forte) */}
              {typeof game.strengthTier === "string" && game.strengthTier !== "sem_odds" && (
                <Badge
                  className={`font-semibold ${
                    game.strengthTier === "forte"
                      ? "bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/40"
                      : game.strengthTier === "medio"
                      ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                      : "bg-red-500/15 text-red-300 border-red-500/25"
                  }`}
                >
                  {game.strengthTier === "forte" ? "FORTE" : game.strengthTier === "medio" ? "MÉDIO" : "FRACO"}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Teams */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a5f4a]/50 border border-[#d4af37]/20">
              <div className="flex items-center gap-3 flex-1">
                {game.homeTeamLogo && (
                  <img src={game.homeTeamLogo} alt={game.homeTeam} className="w-6 h-6 object-contain" />
                )}
                {!game.homeTeamLogo && <div className="w-2 h-2 rounded-full bg-[#d4af37]" />}
                <span className="font-semibold text-white">{game.homeTeam}</span>
                {homeWinRate > 0 && (
                  <span className="text-xs text-[#10b981] ml-auto">{homeWinRate}% vitórias</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a2e24]/50 border border-[#d4af37]/10">
              <div className="flex items-center gap-3 flex-1">
                {game.awayTeamLogo && (
                  <img src={game.awayTeamLogo} alt={game.awayTeam} className="w-6 h-6 object-contain" />
                )}
                {!game.awayTeamLogo && <div className="w-2 h-2 rounded-full bg-[#10b981]" />}
                <span className="font-medium text-[#10b981]">{game.awayTeam}</span>
                {awayWinRate > 0 && (
                  <span className="text-xs text-[#10b981] ml-auto">{awayWinRate}% vitórias</span>
                )}
              </div>
            </div>
          </div>

          {/* Resultado Real (se disponível) */}
          {hasResult && (
            <div className={`p-4 rounded-lg border ${
              isFinished 
                ? winnerCorrect 
                  ? 'bg-[#10b981]/10 border-[#10b981]/30' 
                  : 'bg-red-500/10 border-red-500/30'
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isFinished ? (
                    winnerCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )
                  ) : (
                    <RefreshCw className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className={`text-sm font-semibold ${
                    isFinished 
                      ? winnerCorrect ? 'text-[#10b981]' : 'text-red-400'
                      : 'text-yellow-400'
                  }`}>
                    {isFinished ? 'Resultado Final' : matchStatus}
                  </span>
                </div>
                {isFinished && (
                  <Badge className={winnerCorrect 
                    ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                  }>
                    {predictionCorrect ? 'Placar Exato!' : winnerCorrect ? 'Vencedor Correto' : 'Errou'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">{game.homeTeam.split(' ').slice(0, 2).join(' ')}</p>
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                    isFinished ? 'bg-white/10' : 'bg-yellow-500/20'
                  }`}>
                    <span className="text-3xl font-bold text-white">{realHomeScore}</span>
                  </div>
                </div>
                <span className="text-2xl font-bold text-white">x</span>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">{game.awayTeam.split(' ').slice(0, 2).join(' ')}</p>
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                    isFinished ? 'bg-white/10' : 'bg-yellow-500/20'
                  }`}>
                    <span className="text-3xl font-bold text-white">{realAwayScore}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botão para Atualizar Resultado */}
          {isGameStarted && (
            <Button
              onClick={() => handleUpdateResult()}
              disabled={isUpdating}
              className={`w-full ${
                hasResult && isFinished
                  ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30'
                  : 'bg-[#d4af37]/20 hover:bg-[#d4af37]/30 text-[#d4af37] border border-[#d4af37]/30'
              }`}
              variant="outline"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando resultado...
                </>
              ) : hasResult && isFinished ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar Resultado
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Buscar Placar Real
                </>
              )}
            </Button>
          )}

          {/* Previsão de Placar */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-[#d4af37]/10 to-[#10b981]/10 border border-[#d4af37]/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#d4af37]" />
                <span className="text-sm font-semibold text-[#d4af37]">Previsão do Robô</span>
              </div>
              <Badge className="bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/30">
                {predictionConfidence}% confiança
              </Badge>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-xs text-[#10b981] mb-1">{game.homeTeam.split(' ').slice(0, 2).join(' ')}</p>
                <div className={`w-12 h-12 rounded-lg border flex items-center justify-center ${
                  hasResult && isFinished
                    ? predictedHomeScore === realHomeScore
                      ? 'bg-[#10b981]/20 border-[#10b981]/50'
                      : 'bg-red-500/20 border-red-500/50'
                    : 'bg-[#d4af37]/20 border-[#d4af37]/50'
                }`}>
                  <span className={`text-2xl font-bold ${
                    hasResult && isFinished
                      ? predictedHomeScore === realHomeScore ? 'text-[#10b981]' : 'text-red-400'
                      : 'text-[#d4af37]'
                  }`}>{predictedHomeScore}</span>
                </div>
              </div>
              <span className="text-2xl font-bold text-white">x</span>
              <div className="text-center">
                <p className="text-xs text-[#10b981] mb-1">{game.awayTeam.split(' ').slice(0, 2).join(' ')}</p>
                <div className={`w-12 h-12 rounded-lg border flex items-center justify-center ${
                  hasResult && isFinished
                    ? predictedAwayScore === realAwayScore
                      ? 'bg-[#10b981]/20 border-[#10b981]/50'
                      : 'bg-red-500/20 border-red-500/50'
                    : 'bg-[#10b981]/20 border-[#10b981]/50'
                }`}>
                  <span className={`text-2xl font-bold ${
                    hasResult && isFinished
                      ? predictedAwayScore === realAwayScore ? 'text-[#10b981]' : 'text-red-400'
                      : 'text-[#10b981]'
                  }`}>{predictedAwayScore}</span>
                </div>
              </div>
            </div>
            {predictionReasoning && (
              <p className="text-xs text-center text-gray-400 mt-2">{predictionReasoning}</p>
            )}
          </div>

          {/* Odds */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30">
              <div className="text-xs text-[#d4af37] mb-1 font-medium">Casa</div>
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#d4af37]" />
                <span className="text-lg font-bold text-[#d4af37]">{odds1x2Available ? Number(homeOdd).toFixed(2) : "N/A"}</span>
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#1a5f4a]/30 border border-[#d4af37]/20">
              <div className="text-xs text-[#10b981] mb-1 font-medium">Empate</div>
              <div className="text-lg font-bold text-white">{odds1x2Available ? Number(drawOdd).toFixed(2) : "N/A"}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#0a2e24]/30 border border-[#d4af37]/20">
              <div className="text-xs text-[#10b981] mb-1 font-medium">Visitante</div>
              <div className="text-lg font-bold text-[#10b981]">{odds1x2Available ? Number(awayOdd).toFixed(2) : "N/A"}</div>
            </div>
          </div>

          {/* Probabilidades 1X2 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30">
              <div className="text-xs text-[#d4af37] mb-1 font-medium">Casa %</div>
              <div className="text-lg font-bold text-white">
                {typeof game.probHomePct === "number" ? formatPct(game.probHomePct) : implied ? formatPct(implied.ph) : "N/A"}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#1a5f4a]/30 border border-[#d4af37]/20">
              <div className="text-xs text-[#10b981] mb-1 font-medium">Empate %</div>
              <div className="text-lg font-bold text-white">
                {typeof game.probDrawPct === "number" ? formatPct(game.probDrawPct) : implied ? formatPct(implied.pd) : "N/A"}
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#0a2e24]/30 border border-[#d4af37]/20">
              <div className="text-xs text-[#10b981] mb-1 font-medium">Fora %</div>
              <div className="text-lg font-bold text-white">
                {typeof game.probAwayPct === "number" ? formatPct(game.probAwayPct) : implied ? formatPct(implied.pa) : "N/A"}
              </div>
            </div>
          </div>

          {/* Casas de Apostas */}
          {bookmakers.length > 0 && (
            <div className="p-3 rounded-lg bg-black/30 border border-[#d4af37]/20">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-[#d4af37]" />
                <span className="text-sm font-medium text-[#d4af37]">
                  Disponível em {bookmakersCount} casa{bookmakersCount !== 1 ? 's' : ''} de apostas
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {bookmakers.slice(0, 8).map((bookmaker, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs bg-[#1a5f4a]/30 text-[#10b981] border-[#10b981]/30"
                  >
                    {bookmaker}
                  </Badge>
                ))}
                {bookmakers.length > 8 && (
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/30"
                  >
                    +{bookmakers.length - 8} mais
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Score e Critérios */}
          {showDetails && (
            <div className="pt-2 border-t border-[#d4af37]/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#d4af37]" />
                  <span className="text-sm text-[#10b981] font-medium">Score de Força</span>
                </div>
                <span className="text-lg font-bold text-[#d4af37]">{score}/100</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-black/50 rounded-full h-2 mb-3">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    score >= 70 ? 'bg-[#10b981]' : score >= 50 ? 'bg-[#d4af37]' : 'bg-red-500'
                  }`}
                  style={{ width: `${scorePercentage}%` }}
                />
              </div>

              {/* Critérios fortes (impactam o ranking) + Comparativos (somente informação) */}
              {(() => {
                const MIN_BOOKMAKERS = 3;

                // Critérios FORTES: usados para priorizar o TOP 10
                const strongCriteria: Array<{ label: string; passed: boolean; hint?: string }> = [
                  {
                    label: "Favorito forte (time da casa)",
                    passed: !!(game as any).favoriteStrong,
                    hint: "(odds + mercado 1X2 + liquidez)",
                  },
                  {
                    label: "H2H disponível (>= 3 jogos)",
                    passed: ((game as any).h2hStrongConsidered ?? 0) >= 3,
                    hint: `(${(game as any).h2hStrongConsidered ?? 0}/3)`,
                  },
                  {
                    label: "H2H forte (mandante): 3/3 vitórias por ≥2 gols",
                    passed:
                      ((game as any).h2hStrongConsidered ?? 0) >= 3 &&
                      ((game as any).h2hStrongWins ?? 0) === 3,
                    hint: `(${(game as any).h2hStrongWins ?? 0}/3)`,
                  },
                  {
                    label: "H2H forte (mandante): pelo menos 2/3 vitórias por ≥2 gols",
                    passed:
                      ((game as any).h2hStrongConsidered ?? 0) >= 3 &&
                      ((game as any).h2hStrongWins ?? 0) >= 2,
                    hint: `(${(game as any).h2hStrongWins ?? 0}/3)`,
                  },
                  {
                    label: "Score para aprovação (>= 75)",
                    passed: score >= 75,
                  },
                ];

                // Comparativos: apenas para leitura/diagnóstico (não determinam “jogo bom”)
                const comparativeCriteria: Array<{ label: string; passed: boolean; hint?: string }> = [
                  { label: "Home Odd < 2.0 (comparativo)", passed: criterion1 },
                  { label: "Away Odd > 3.0 (comparativo)", passed: criterion2 },
                  {
                    label: "Ordem das odds (Casa < Empate < Visitante) (comparativo)",
                    passed: criterion3,
                  },
                  {
                    label: `Casas de apostas suficientes (>= ${MIN_BOOKMAKERS}) (comparativo)`,
                    passed: bookmakersCount >= MIN_BOOKMAKERS,
                    hint: `(${bookmakersCount} encontrada${bookmakersCount !== 1 ? "s" : ""})`,
                  },
                ];

                const renderList = (
                  items: Array<{ label: string; passed: boolean; hint?: string }>
                ) => (
                  <div className="space-y-1 text-xs">
                    {items.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={c.passed ? "text-[#10b981]" : "text-red-400"}>
                          {c.passed ? "✓" : "✗"}
                        </span>
                        <span className={c.passed ? "text-[#10b981]" : "text-red-300"}>
                          {c.label}{c.hint ? ` ${c.hint}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                );

                return (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-[#d4af37] font-semibold mb-1">Critérios fortes</p>
                      {renderList(strongCriteria)}
                    </div>

                    <div className="pt-2 border-t border-[#d4af37]/20">
                      <p className="text-xs text-[#d4af37] font-semibold mb-1">Comparativos</p>
                      {renderList(comparativeCriteria)}
                    </div>
                  </div>
                );
              })()}
              {/* H2H */}
              {(h2hHomeWins > 0 || h2hAwayWins > 0 || game.h2hMatches) && (
                <div className="mt-2 pt-2 border-t border-[#d4af37]/20 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-3 h-3 text-[#d4af37]" />
                    <p className="text-[#10b981] font-medium">Histórico H2H ({game.h2hMatches || 0} jogos):</p>
                  </div>
                  <p className="text-[#10b981]">{game.homeTeam}: {h2hHomeWins} vitórias | {game.awayTeam}: {h2hAwayWins} vitórias</p>
                </div>
              )}

              {/* Rejection Reasons */}
              {rejectionReasons.length > 0 && (
                <div className="mt-2 pt-2 border-t border-red-500/20 text-xs">
                  <p className="text-red-400 font-medium mb-1">Motivos da Rejeição:</p>
                  {rejectionReasons.map((reason, idx) => (
                    <p key={idx} className="text-red-400">• {reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para API Key */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="bg-[#1a5f4a] border-[#d4af37]/30">
          <DialogHeader>
            <DialogTitle className="text-[#d4af37] flex items-center gap-2">
              <Key className="w-5 h-5" />
              Chave de API Necessária
            </DialogTitle>
            <DialogDescription className="text-[#10b981]">
              Para buscar o resultado em tempo real, é necessário fornecer uma chave de API Football válida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#10b981] mb-2">
                Chave de API Football
              </label>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="Cole sua chave de API Football"
                className="w-full px-4 py-2 bg-black/50 border border-[#d4af37]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
              />
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
                onClick={handleUpdateWithApiKey}
                disabled={!tempApiKey.trim() || isUpdating}
                className="flex-1 bg-[#d4af37] text-black hover:bg-[#d4af37]/90"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Buscar Resultado
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
