import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GameCard } from "@/components/GameCard";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, Activity, Target, History, AlertCircle, Key, Eye, EyeOff, Calendar, Zap, Building2, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Home() {
  const API_STORAGE_KEY = "investbet_api_football_key";
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow'>('today');
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [showNewKeyInput, setShowNewKeyInput] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportText, setExportText] = useState("");
  const [copied, setCopied] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);

  // Carregar chave salva (localStorage) ao abrir a página
  useEffect(() => {
    try {
      const saved = localStorage.getItem(API_STORAGE_KEY);
      if (saved && saved.trim()) {
        setApiKey(saved.trim());
      }
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

  // Queries
  const telegramSettingsQuery = trpc.games.telegramSettings.useQuery();
  const gamesQuery = trpc.games.today.useQuery(undefined, {
    enabled: hasAnalyzed,
    refetchInterval: hasAnalyzed ? 30000 : false,
  });

  useEffect(() => {
    if (telegramSettingsQuery.data) {
      setTelegramEnabled(!!telegramSettingsQuery.data.telegramEnabled);
    }
  }, [telegramSettingsQuery.data]);

  // Mutations
  const setTelegramEnabledMutation = trpc.games.setTelegramEnabled.useMutation({
    onSuccess: (data) => {
      setTelegramEnabled(!!data?.settings?.telegramEnabled);
      toast.success(`Telegram: ${data?.settings?.telegramEnabled ? "ON" : "OFF"}`);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao configurar Telegram");
    }
  });

  const analyzeMutation = trpc.games.analyze.useMutation({
    onSuccess: (data) => {
      setIsAnalyzing(false);
      setHasAnalyzed(true);
      setApiError(null);
      setAnalysisResult(data);
      setProgress(data.progress);
      
      const dateLabel = selectedDate === 'today' ? 'de hoje' : 'de amanhã';
      
      // Verificar se precisa de nova chave
      if (data.shouldAskForNewKey) {
        setShowNewKeyDialog(true);
        toast.warning(`Limite de API atingido! ${data.progress.apiRemaining} requisições restantes.`);
      } else {
        const message = data.progress?.stopped 
          ? `Análise parada: ${data.progress.reason}. ${data.games.length} jogos retornados de ${data.progress.analyzed} analisados ${dateLabel}.`
          : `Análise concluída! ${data.games.length} jogos selecionados de ${data.progress?.analyzed || 0} analisados ${dateLabel}.`;
        
        toast.success(message);
      }
      
      gamesQuery.refetch();
    },
    onError: (error) => {
      setIsAnalyzing(false);
      const errorMsg = error.message || "Erro desconhecido";
      setApiError(errorMsg);
      toast.error(`Erro na análise: ${errorMsg}`);
    },
  });

  const handleAnalyze = () => {
    if (!apiKey.trim()) {
      toast.error("Por favor, insira uma chave de API válida");
      return;
    }

    setIsAnalyzing(true);
    setApiError(null);
    setProgress(null);
    
    analyzeMutation.mutate({ apiKey: apiKey.trim(), analysisDate: selectedDate, telegramEnabled });
  };

  const handleContinueWithNewKey = () => {
    if (!newApiKey.trim()) {
      toast.error("Por favor, insira a nova chave de API");
      return;
    }

    setIsAnalyzing(true);
    setShowNewKeyDialog(false);
    
    // Continuar análise com nova chave
    analyzeMutation.mutate({ 
      newApiKey: newApiKey.trim(), 
      analysisDate: selectedDate,
      retryWithNewKey: true,
      telegramEnabled,
    });
  };

  const handleFinalizeAnalysis = () => {
    setShowNewKeyDialog(false);
    toast.success(`Análise finalizada! ${analysisResult?.games?.length || 0} jogos salvos.`);
  };

  // Função para gerar texto de exportação para WhatsApp (SEM previsão de placar)
  const generateWhatsAppExport = () => {
    if (!games || games.length === 0) {
      toast.error("Nenhum jogo para exportar");
      return;
    }

    const dateLabel = selectedDate === 'today' ? 'Hoje' : 'Amanhã';
    const currentDate = new Date();
    if (selectedDate === 'tomorrow') {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    const formattedDate = format(currentDate, "dd/MM/yyyy", { locale: ptBR });

    let text = `🏆 *INVESTBET - SINAIS DO DIA* 🏆\n`;
    text += `📅 ${dateLabel} - ${formattedDate}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    games.forEach((game: any, index: number) => {
      const gameTime = new Date(game.commenceTime);
      const timeStr = format(gameTime, "HH:mm", { locale: ptBR });
      const score = game.strengthScore || game.approvalScore || 0;
      
      text += `*${index + 1}. ${game.homeTeam} x ${game.awayTeam}*\n`;
      text += `⚽ Liga: ${game.league}\n`;
      text += `🕐 Horário: ${timeStr}\n`;
      text += `📊 Força do Sinal: ${score}/100\n`;
      text += `⭐ Favorito forte (casa): ${game.favoriteStrong ? 'SIM' : 'NÃO'}\n`;
      const ho = Number(game.homeOdd) || 0;
      const do_ = Number(game.drawOdd) || 0;
      const ao = Number(game.awayOdd) || 0;
      if (ho > 0 && do_ > 0 && ao > 0) {
        text += `💰 Odds: Casa ${ho.toFixed(2)} | Empate ${do_.toFixed(2)} | Fora ${ao.toFixed(2)}
`;
      } else {
        text += `💰 Odds: indisponível (confirmado em casas)
`;
      }
      if (game.matchedCriteria && Array.isArray(game.matchedCriteria) && game.matchedCriteria.length > 0) {
        text += `✅ Critérios: ${game.matchedCriteria.join(' | ')}\n`;
      }
      
      if (game.bookmakers && game.bookmakers.length > 0) {
        text += `🏪 Casas: ${game.bookmakers.slice(0, 5).join(', ')}\n`;
      }
      
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📈 Total: ${games.length} sinais\n`;
    text += `✅ Jogos aprovados pelo robô\n`;
    text += `⚠️ Aposte com responsabilidade!\n`;

    setExportText(text);
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

  const games = (analysisResult?.games || []).slice().sort((a: any, b: any) => (b.strengthScore || 0) - (a.strengthScore || 0));
  const apiRemaining = progress?.apiRemaining || 0;
  const apiUsed = progress?.apiUsed || 0;
  const apiLimit = progress?.apiLimit || 100;
  const apiPercentage = Math.round((apiUsed / apiLimit) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a5f4a] via-[#0f4a3a] to-[#0a2e24]">
      {/* Header */}
      <header className="border-b border-[#d4af37]/20 bg-black/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-investbet.png" alt="INVESTBET" className="h-12 w-12" />
            <div>
              <h1 className="text-2xl font-bold text-[#d4af37]">INVESTBET</h1>
              <p className="text-sm text-[#10b981]">Análise Inteligente de Apostas</p>
            </div>
          </div>
          <Link href="/historico">
            <Button variant="outline" className="border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37]/10">
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Análise Automática de Jogos
          </h2>
          <p className="text-[#10b981] text-lg mb-8">
            Usando API Football com dados de 600+ ligas
          </p>
        </div>

        {/* API Balance Card */}
        {progress && (
          <Card className="mb-8 bg-black/40 border-[#d4af37]/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-[#10b981]">Requisições Usadas</p>
                  <p className="text-2xl font-bold text-[#d4af37]">{apiUsed}/{apiLimit}</p>
                </div>
                <div>
                  <p className="text-sm text-[#10b981]">Restantes</p>
                  <p className="text-2xl font-bold text-[#10b981]">{apiRemaining}</p>
                </div>
                <div>
                  <p className="text-sm text-[#10b981]">Uso (%)</p>
                  <p className="text-2xl font-bold text-[#d4af37]">{apiPercentage}%</p>
                </div>
                <div>
                  <p className="text-sm text-[#10b981]">Jogos Analisados</p>
                  <p className="text-2xl font-bold text-[#10b981]">{progress.analyzed}</p>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-black/50 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#d4af37] to-[#10b981] h-2 rounded-full transition-all"
                    style={{ width: `${apiPercentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Configuration */}
        <Card className="mb-8 bg-black/40 border-[#d4af37]/30">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-[#10b981] mb-3">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Selecione a Data da Análise
                </label>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setSelectedDate('today')}
                    className={`flex-1 ${
                      selectedDate === 'today'
                        ? 'bg-[#d4af37] text-black hover:bg-[#d4af37]/90'
                        : 'bg-black/50 text-[#d4af37] border border-[#d4af37]/30 hover:bg-black/70'
                    }`}
                    disabled={isAnalyzing}
                  >
                    📅 Hoje
                  </Button>
                  <Button
                    onClick={() => setSelectedDate('tomorrow')}
                    className={`flex-1 ${
                      selectedDate === 'tomorrow'
                        ? 'bg-[#d4af37] text-black hover:bg-[#d4af37]/90'
                        : 'bg-black/50 text-[#d4af37] border border-[#d4af37]/30 hover:bg-black/70'
                    }`}
                    disabled={isAnalyzing}
                  >
                    📅 Amanhã
                  </Button>
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-sm font-medium text-[#10b981] mb-2">
                  <Key className="w-4 h-4 inline mr-2" />
                  Chave de API Football
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Cole sua chave de API Football"
                      className="w-full px-4 py-2 bg-black/50 border border-[#d4af37]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
                      disabled={isAnalyzing}
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#10b981] hover:text-[#d4af37]"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="bg-[#10b981] text-black hover:bg-[#10b981]/90"
                    disabled={isAnalyzing || !apiKey.trim()}
                  >
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClearApiKey}
                    className="bg-black/50 text-[#d4af37] border border-[#d4af37]/30 hover:bg-black/70"
                    disabled={isAnalyzing}
                  >
                    Limpar
                  </Button>
                </div>
              </div>

              {/* Telegram Toggle */}
              <div className="flex items-center justify-between p-3 bg-black/30 border border-[#d4af37]/20 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-[#d4af37] flex items-center gap-2">
                    📣 Telegram
                  </div>
                  <div className="text-xs text-[#10b981]">
                    Envia a lista após analisar e manda GREEN/RED com placar só quando finalizar
                  </div>
                </div>
                <Switch
                  checked={telegramEnabled}
                  onCheckedChange={(checked) => {
                    setTelegramEnabled(checked);
                    setTelegramEnabledMutation.mutate({ enabled: checked });
                  }}
                />
              </div>

              {/* Error Message */}
              {apiError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm">{apiError}</p>
                </div>
              )}

              {/* Analyze Button */}
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !apiKey.trim()}
                className="w-full bg-gradient-to-r from-[#d4af37] to-[#10b981] text-black font-bold py-3 hover:opacity-90 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando... {progress?.percentage || 0}%
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    INICIAR ANÁLISE
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {games.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#d4af37] flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                {games.length} Jogos Selecionados
              </h3>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm text-[#10b981] block">
                    Ordenados do mais forte para o mais fraco
                  </span>
                  <span className="text-xs text-[#d4af37] flex items-center gap-1 justify-end mt-1">
                    <Building2 className="w-3 h-3" />
                    Com casas de apostas e previsão de placar
                  </span>
                </div>
                {/* Botão de Exportar para WhatsApp */}
                <Button
                  onClick={generateWhatsAppExport}
                  className="bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Exportar WhatsApp
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {games.map((game: any, index: number) => (
                <GameCard key={game.gameId} game={game} position={index + 1} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {hasAnalyzed && games.length === 0 && (
          <Card className="bg-black/40 border-[#d4af37]/30 text-center py-12">
            <CardContent>
              <Activity className="w-12 h-12 text-[#d4af37] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Nenhum jogo encontrado</h3>
              <p className="text-[#10b981]">
                {progress?.reason || "Tente outra data ou insira uma nova chave de API"}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog: New API Key */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent className="bg-[#1a5f4a] border-[#d4af37]/30">
          <DialogHeader>
            <DialogTitle className="text-[#d4af37] flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Limite de API Atingido
            </DialogTitle>
            <DialogDescription className="text-[#10b981]">
              Você usou {apiUsed} de {apiLimit} requisições disponíveis.
              <br />
              Escolha uma opção para continuar:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Option 1: New API Key */}
            <div className="p-4 bg-black/40 rounded-lg border border-[#d4af37]/30">
              <h4 className="font-semibold text-[#d4af37] mb-2">Opção 1: Usar Nova Chave de API</h4>
              <p className="text-sm text-[#10b981] mb-3">
                Insira uma nova chave de API Football para continuar analisando
              </p>
              {showNewKeyInput ? (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="Cole a nova chave de API"
                    className="w-full px-3 py-2 bg-black/50 border border-[#d4af37]/30 rounded text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
                  />
                  <Button
                    onClick={handleContinueWithNewKey}
                    disabled={isAnalyzing || !newApiKey.trim()}
                    className="w-full bg-[#10b981] text-black hover:bg-[#10b981]/90"
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Continuar com Nova Chave
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowNewKeyInput(true)}
                  className="w-full bg-[#d4af37] text-black hover:bg-[#d4af37]/90"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Inserir Nova Chave
                </Button>
              )}
            </div>

            {/* Option 2: Finalize */}
            <div className="p-4 bg-black/40 rounded-lg border border-[#d4af37]/30">
              <h4 className="font-semibold text-[#d4af37] mb-2">Opção 2: Finalizar Análise</h4>
              <p className="text-sm text-[#10b981] mb-3">
                Salvar os {analysisResult?.games?.length || 0} jogos já analisados e encerrar
              </p>
              <Button
                onClick={handleFinalizeAnalysis}
                className="w-full bg-black/50 text-[#d4af37] border border-[#d4af37]/30 hover:bg-black/70"
              >
                Finalizar e Salvar
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
