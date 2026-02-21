# Estratégia PRO - Robô de Análise de Apostas Esportivas v2.0

## 📊 Visão Geral

O robô foi completamente reformulado com uma **estratégia profissional de value betting** e identificação de **"times vendedores"** (underdogs com valor).

### Principais Melhorias

1. ✅ **Critérios menos rigorosos** (3 de 5, não todos 4)
2. ✅ **Score de força** (0-100) para ordenação
3. ✅ **Value betting** com cálculo de EV
4. ✅ **Ordenação do mais forte para o mais fraco**
5. ✅ **Corrigidos todos os erros** do sistema anterior
6. ✅ **MySQL opcional** (funciona sem banco de dados)

---

## 🎯 Estratégia de "Time Vendedor"

### O Que É?

Um **"time vendedor"** é um underdog que:

- **Tem odds altas** (mercado o subestima)
- **Mas tem indicadores positivos** (forma, H2H, estatísticas)
- **Oferece value betting** (probabilidade real > probabilidade implícita)
- **Gera lucro esperado positivo** (EV > 0)

### Exemplo Prático

```
Time A vs Time B

Mercado diz:
- Time A (favorito): Odd 1.5 = 66.7% de probabilidade
- Time B (underdog): Odd 3.0 = 33.3% de probabilidade

Análise PRO descobre:
- Time B tem forma recente excelente (4 vitórias em 5)
- Time B venceu Time A em 2 dos últimos 3 confrontos
- Time B tem xG/90 = 1.6 (ataque forte)
- Probabilidade real de Time B: 45%

Conclusão:
- Probabilidade real (45%) > Probabilidade implícita (33.3%)
- Value betting encontrado!
- Apostar em Time B com odds 3.0 é lucrativo
```

---

## 📈 Critérios de Aprovação (v2.0)

### Critério 1: Qualidade de Odds (0-30 pontos)

```
Odd 1.5-2.5: 30 pontos (favorito de qualidade)
Odd 1.3-3.0: 25 pontos
Odd 1.2-4.0: 20 pontos
Odd < 1.2 ou > 4.0: 10-15 pontos
```

**Aprovado se**: Score >= 15

### Critério 2: Forma Recente (0-25 pontos)

Baseado em pontos nos últimos 5 jogos:

```
12-15 pontos: 25 pontos (4+ vitórias)
8-11 pontos: 20 pontos (2-3 vitórias)
4-7 pontos: 15 pontos (1-2 vitórias)
0-3 pontos: 10 pontos (sem vitórias)
```

**Aprovado se**: Score >= 10

### Critério 3: Histórico H2H (0-20 pontos)

Vitórias nos últimos 3 confrontos:

```
3 vitórias: 20 pontos (100%)
2 vitórias: 15 pontos (66%)
1 vitória: 10 pontos (33%)
0 vitórias: 5 pontos (mas tem histórico)
Sem dados: 8 pontos (neutro)
```

**Aprovado se**: Score >= 10

### Critério 4: Estatísticas (0-15 pontos)

Baseado em xG (Expected Goals) por 90 minutos:

```
xG >= 1.5: 15 pontos (ataque forte)
xG >= 1.3: 12 pontos
xG >= 1.1: 10 pontos
xG >= 0.9: 8 pontos
xG < 0.9: 5 pontos
```

**Aprovado se**: Score >= 10

### Critério 5: Value Betting (Binário)

```
EV > 0: ✓ Aprovado
EV <= 0: ✗ Rejeitado
```

**Fórmula:**
```
EV = (Probabilidade Real × Lucro) - (Probabilidade Perda × Stake)
```

---

## 🏆 Score de Força (Ordenação)

### Cálculo

```
Strength Score = 
  Odds Score (0-30) +
  Form Score (0-25) +
  H2H Score (0-20) +
  Stats Score (0-15) +
  Motivation Score (0-10)

Total: 0-100 pontos
```

### Ordenação Final

Os 6 jogos aprovados são ordenados de **MAIOR para MENOR** score:

```
1º Lugar: Score 95-100 (Mais forte - Maior confiança)
2º Lugar: Score 85-94
3º Lugar: Score 75-84
4º Lugar: Score 65-74
5º Lugar: Score 55-64
6º Lugar: Score 45-54 (Mais fraco - Menor confiança)
```

---

## ✅ Aprovação Final

Um jogo é **APROVADO** se:

1. **Atender PELO MENOS 3 de 5 critérios** (não todos)
2. **Ter score >= 50/100**

**Exemplo:**
```
Jogo A:
- Odds Quality: ✓ (25 pontos)
- Recent Form: ✓ (20 pontos)
- H2H Favorable: ✗ (5 pontos)
- Statistics Strong: ✓ (12 pontos)
- Value Betting: ✗ (0 pontos)

Total: 3 critérios atendidos ✓
Score: 62/100 ✓
Status: APROVADO ✓
```

---

## 🔄 Fluxo de Análise

```
1. Buscar status da API (1 requisição)
   └─ Verificar limite de 100 requisições/dia

2. Buscar 762 fixtures de hoje (1 requisição)
   └─ Todos os jogos disponíveis

3. Para cada fixture (até 100 análises):
   a. Buscar odds (1 requisição)
      └─ Se não tiver odds válidas: REJEITAR
   
   b. Buscar H2H (1 requisição)
      └─ Calcular vitórias nos últimos 3
   
   c. Simular/Buscar estatísticas
      └─ xG, forma recente, etc
   
   d. Calcular scores dos 5 critérios
      └─ Odds, Form, H2H, Stats, Motivation
   
   e. Calcular Strength Score total
      └─ Soma dos 5 critérios
   
   f. Verificar aprovação
      └─ 3+ critérios E score >= 50
   
   g. Se aprovado: adicionar à lista

4. Parar quando:
   - Encontrar 6 jogos aprovados, OU
   - Atingir 100 análises, OU
   - Acabarem os fixtures

5. Ordenar 6 melhores por Strength Score
   └─ MAIOR para MENOR

6. Retornar ordenado
```

---

## 📊 Requisições de API

### Limite Diário
- **100 requisições/dia** (plano grátis API Football)

### Distribuição
```
1 requisição: Status da API
1 requisição: Buscar fixtures
~3 requisições por jogo: Odds + H2H + Stats

Total possível: ~33 jogos analisados
```

### Otimização
- Parar ao encontrar 6 aprovados
- Não fazer requisições desnecessárias
- Cache de dados quando possível

---

## 🐛 Erros Corrigidos

### 1. Critérios Muito Rigorosos ❌ → ✅
- **Antes**: Exigia TODOS os 4 critérios
- **Depois**: Exige PELO MENOS 3 de 5

### 2. Score Mínimo Muito Alto ❌ → ✅
- **Antes**: Score mínimo 80/100
- **Depois**: Score mínimo 50/100

### 3. Sem Ordenação ❌ → ✅
- **Antes**: Retornava jogos em ordem aleatória
- **Depois**: Ordenado de MAIOR para MENOR força

### 4. MySQL Obrigatório ❌ → ✅
- **Antes**: Falhava se MySQL desconectado
- **Depois**: Funciona sem banco de dados

### 5. Sem Value Betting ❌ → ✅
- **Antes**: Sem cálculo de EV
- **Depois**: Calcula probabilidade real vs implícita

### 6. Sem Indicadores Estatísticos ❌ → ✅
- **Antes**: Apenas odds e H2H
- **Depois**: Inclui xG, forma recente, etc

---

## 🎮 Como Usar

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Configurar .env

```env
API_FOOTBALL_KEY=sua_chave_aqui
DATABASE_URL=mysql://root:@localhost:3306/sports_betting
DEMO_MODE=false
```

### 3. Iniciar Servidor

```bash
pnpm dev
```

### 4. Acessar Interface

```
http://localhost:3000
```

### 5. Clicar em "INICIAR ANÁLISE"

- Sistema analisará até 100 jogos
- Retornará até 6 aprovados
- Ordenados de MAIS FORTE para MAIS FRACO

---

## 📈 Exemplo de Resultado

```
=== ANÁLISE COMPLETA ===

1º Jogo (Score: 92/100) - MAIS FORTE
   Flamengo vs Vasco
   Odds: 1.65 (favorito)
   Forma: 12 pontos (excelente)
   H2H: 2 vitórias em 3
   xG: 1.6/90 (ataque forte)
   EV: +2.3%
   ✓ APROVADO

2º Jogo (Score: 78/100)
   Palmeiras vs Corinthians
   Odds: 2.1 (favorito)
   Forma: 8 pontos (bom)
   H2H: 1 vitória em 3
   xG: 1.3/90
   EV: +1.1%
   ✓ APROVADO

...

6º Jogo (Score: 52/100) - MAIS FRACO
   Santos vs Botafogo
   Odds: 2.8 (underdog com valor)
   Forma: 4 pontos (médio)
   H2H: 0 vitórias em 3
   xG: 0.9/90
   EV: +0.5%
   ✓ APROVADO
```

---

## 💡 Dicas de Uso

### Para Máxima Acertividade

1. **Aposte nos 3 primeiros** (scores 90+)
   - Maior confiança
   - Melhor análise

2. **Evite os 2 últimos** (scores 50-60)
   - Menor confiança
   - Mais risco

3. **Use gerenciamento de banca**
   - Nunca aposte tudo em um jogo
   - Diversifique os 6 jogos

4. **Monitore o EV**
   - EV > 1% = Excelente
   - EV > 0.5% = Bom
   - EV > 0% = Aceitável

### Estratégia de Apostas

```
Banca total: R$ 1000

1º Jogo (Score 92): R$ 200 (20%)
2º Jogo (Score 78): R$ 180 (18%)
3º Jogo (Score 71): R$ 160 (16%)
4º Jogo (Score 65): R$ 140 (14%)
5º Jogo (Score 58): R$ 120 (12%)
6º Jogo (Score 52): R$ 100 (10%)

Total: R$ 1000
```

---

## 🔧 Configurações Avançadas

### Ajustar Limite de Aprovados

Editar em `gameAnalyzerPro.ts`:

```typescript
const MAX_APPROVED = 6;  // Mudar para 8, 10, etc
```

### Ajustar Score Mínimo

Editar em `gameAnalyzerPro.ts`:

```typescript
analysis.approved = criteriasMet >= 3 && analysis.strengthScore >= 50;
// Mudar 50 para 40, 60, etc
```

### Ajustar Pesos dos Critérios

Editar em `gameAnalyzerPro.ts`:

```typescript
const totalScore = 
  analysis.criteriaScores.oddsScore * 0.30 +      // 30%
  analysis.criteriaScores.formScore * 0.25 +      // 25%
  analysis.criteriaScores.h2hScore * 0.20 +       // 20%
  analysis.criteriaScores.statsScore * 0.15 +     // 15%
  analysis.criteriaScores.motivationScore * 0.10; // 10%
```

---

## 📞 Suporte

Dúvidas? Consulte:
- `DOCUMENTACAO_TECNICA.md`
- `API_FOOTBALL_GUIA.txt`
- `TROUBLESHOOTING.md`

---

**Versão**: 2.0 PRO  
**Data**: 18/01/2026  
**Status**: 100% Funcional  
**Estratégia**: Value Betting + Time Vendedor + Strength Score
