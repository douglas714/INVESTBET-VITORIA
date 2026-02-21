# Guia Rápido - Robô v2.0 PRO

## ⚡ Instalação em 5 Minutos

### 1. Extrair o ZIP

```bash
unzip sports_betting_robot_v2.zip
cd sports_betting_robot_v2
```

### 2. Instalar Dependências

```bash
pnpm install
```

(Se não tiver pnpm: `npm install -g pnpm`)

### 3. Configurar API Key

Abra `.env` e adicione sua chave da API Football:

```env
API_FOOTBALL_KEY=sua_chave_aqui
```

Obter chave em: https://dashboard.api-football.com/

### 4. Iniciar Servidor

```bash
pnpm dev
```

### 5. Acessar Interface

Abra no navegador: http://localhost:3000

---

## 🎮 Usando o Robô

### Passo 1: Clicar em "INICIAR ANÁLISE"

- Sistema analisará até 100 jogos
- Pode levar 30-60 segundos

### Passo 2: Aguardar Resultados

- Mostra progresso em tempo real
- Exibe % de análise completa

### Passo 3: Ver 6 Jogos Aprovados

Ordenados de **MAIS FORTE** para **MAIS FRACO**:

```
1º Jogo - Score 92/100 (MAIS FORTE)
2º Jogo - Score 78/100
3º Jogo - Score 71/100
4º Jogo - Score 65/100
5º Jogo - Score 58/100
6º Jogo - Score 52/100 (MAIS FRACO)
```

### Passo 4: Apostar Conforme Confiança

- **Jogos 1-3**: Maior confiança (aposte mais)
- **Jogos 4-6**: Menor confiança (aposte menos)

---

## 📊 Entendendo os Scores

### Strength Score (0-100)

Combina 5 critérios:

| Critério | Pontos | O Que Significa |
|----------|--------|-----------------|
| Odds | 0-30 | Qualidade das odds |
| Forma | 0-25 | Desempenho recente |
| H2H | 0-20 | Histórico favorável |
| Stats | 0-15 | Estatísticas fortes |
| Motivação | 0-10 | Importância do jogo |

**Score >= 50**: Jogo aprovado

### Exemplo

```
Jogo: Flamengo vs Vasco

Odds Score: 28/30 (odds boas)
Form Score: 20/25 (forma excelente)
H2H Score: 15/20 (histórico favorável)
Stats Score: 12/15 (estatísticas boas)
Motivation Score: 8/10 (jogo importante)

TOTAL: 83/100 (Muito forte)
```

---

## 💡 Dicas de Apostas

### Estratégia Conservadora

Aposte apenas nos **3 primeiros** (scores 80+):
- Menor risco
- Maior confiança
- Taxa de acerto mais alta

### Estratégia Agressiva

Aposte em **todos os 6**:
- Maior potencial de lucro
- Maior risco
- Requer gerenciamento de banca

### Gerenciamento de Banca

Para banca de R$ 1000:

```
1º Jogo (Score 92): R$ 200 (20%)
2º Jogo (Score 78): R$ 180 (18%)
3º Jogo (Score 71): R$ 160 (16%)
4º Jogo (Score 65): R$ 140 (14%)
5º Jogo (Score 58): R$ 120 (12%)
6º Jogo (Score 52): R$ 100 (10%)
```

---

## 🔍 Entendendo o Valor (EV)

### O Que É Expected Value?

EV mostra o lucro esperado a longo prazo:

```
EV > 1%: Excelente (aposte com confiança)
EV > 0.5%: Bom (aposte normalmente)
EV > 0%: Aceitável (aposte com cuidado)
EV <= 0%: Ruim (evite)
```

### Exemplo

```
Jogo: Time A vs Time B

Probabilidade Real: 55%
Odd: 2.0 (probabilidade implícita: 50%)

EV = (55% × 100) - (45% × 100) = +5%
```

Neste caso, **EV positivo de 5%** = Ótima oportunidade!

---

## ⚙️ Configurações

### Mudar Número de Jogos Aprovados

Editar `server/gameAnalyzerPro.ts`:

```typescript
const MAX_APPROVED = 6;  // Mudar para 8, 10, etc
```

### Mudar Score Mínimo

Editar `server/gameAnalyzerPro.ts`:

```typescript
analysis.approved = criteriasMet >= 3 && analysis.strengthScore >= 50;
// Mudar 50 para 40, 60, etc
```

### Usar Modo Demo (Sem API)

Editar `.env`:

```env
DEMO_MODE=true
```

---

## 🐛 Solução de Problemas

### "Nenhum jogo encontrado"

**Causa**: API Football sem requisições disponíveis

**Solução**: 
1. Verificar limite em https://dashboard.api-football.com/
2. Aguardar reset (meia-noite UTC)
3. Usar chave diferente

### "Erro de conexão"

**Causa**: Servidor não iniciou

**Solução**:
```bash
# Parar servidor
Ctrl+C

# Limpar cache
rm -rf .next dist

# Reiniciar
pnpm dev
```

### "Análise muito lenta"

**Causa**: Muitos jogos para analisar

**Solução**: Aguardar 30-60 segundos ou reduzir MAX_ANALYSES

---

## 📈 Histórico de Análises

### Ver Análises Anteriores

1. Clique em "Histórico"
2. Selecione a data
3. Veja resultados da análise

### Rastrear Desempenho

Acompanhe:
- Quantos jogos foram aprovados
- Taxa de acerto
- ROI (retorno sobre investimento)

---

## 📞 Suporte

### Documentação Completa

- `ESTRATEGIA_PRO.md` - Estratégia detalhada
- `CORRECOES_REALIZADAS.md` - O que foi corrigido
- `DOCUMENTACAO_TECNICA.md` - Documentação técnica
- `TROUBLESHOOTING.md` - Solução de problemas

### Contato

Para dúvidas ou sugestões, consulte os arquivos de documentação.

---

## ✅ Checklist de Início

- [ ] ZIP extraído
- [ ] Dependências instaladas (`pnpm install`)
- [ ] API Key configurada em `.env`
- [ ] Servidor iniciado (`pnpm dev`)
- [ ] Interface acessível em http://localhost:3000
- [ ] Primeiro teste realizado
- [ ] Documentação lida

---

## 🚀 Próximos Passos

1. **Entender a estratégia**: Ler `ESTRATEGIA_PRO.md`
2. **Fazer testes**: Rodar análise algumas vezes
3. **Acompanhar resultados**: Verificar histórico
4. **Otimizar apostas**: Ajustar gerenciamento de banca
5. **Lucrar**: Seguir as recomendações do robô

---

**Versão**: 2.0 PRO  
**Data**: 18/01/2026  
**Status**: Pronto para Usar  
**Tempo de Setup**: ~5 minutos
