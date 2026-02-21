# 🤖 Sports Betting Robot - Documentação Técnica

## 📋 Índice

1. [Arquitetura do Sistema](#arquitetura-do-sistema)
2. [Fluxo de Instalação](#fluxo-de-instalação)
3. [Lógica de Análise](#lógica-de-análise)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [APIs e Integrações](#apis-e-integrações)
6. [Banco de Dados](#banco-de-dados)
7. [Testes](#testes)
8. [Troubleshooting](#troubleshooting)

---

## Arquitetura do Sistema

### Componentes Principais

```
┌─────────────────────────────────────────────────────────┐
│                   SPORTS BETTING ROBOT                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐         ┌──────────────────┐    │
│  │   Frontend       │         │   Backend        │    │
│  │   (React 19)     │◄────────►│   (Node.js)      │    │
│  │   TailwindCSS    │  tRPC    │   Express        │    │
│  │   shadcn/ui      │          │   TypeScript     │    │
│  └──────────────────┘         └──────────────────┘    │
│         │                            │                  │
│         │                            ▼                  │
│         │                    ┌──────────────────┐      │
│         │                    │  The Odds API    │      │
│         │                    │  (Dados de Odds) │      │
│         │                    └──────────────────┘      │
│         │                                               │
│         └────────────────────────────────────────┐     │
│                                                  │     │
│                                          ┌──────▼────┐ │
│                                          │  MySQL    │ │
│                                          │  Database │ │
│                                          └───────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

**Frontend:**
- React 19.2.1
- TypeScript 5.9.3
- TailwindCSS 4.1.14
- shadcn/ui (Radix UI)
- tRPC Client
- React Query
- Vite 7.1.7

**Backend:**
- Node.js 18+
- Express 4.21.2
- TypeScript 5.9.3
- tRPC 11.6.0
- Drizzle ORM 0.44.5
- MySQL2 3.15.0

**Banco de Dados:**
- MySQL 5.7+ ou MariaDB
- Drizzle ORM para migrations

**APIs Externas:**
- The Odds API v4 (Dados de odds de apostas)

---

## Fluxo de Instalação

### Fase 1: Verificação de Pré-requisitos

```batch
1. Verifica Node.js 18+
   └─ Se não encontrado: Erro e saída
   
2. Instala pnpm globalmente (se necessário)
   └─ npm install -g pnpm
   
3. Verifica versão do Node.js
   └─ Mínimo: v18.0.0
```

### Fase 2: Configuração do Ambiente

```batch
1. Cria arquivo .env (se não existir)
   ├─ THE_ODDS_API_KEY=3a50d923ce7f50b649c36ced65029efd
   ├─ DATABASE_URL=mysql://root:@localhost:3306/sports_betting
   └─ Outras configurações opcionais
```

### Fase 3: Instalação de Dependências

```batch
1. Executa: pnpm install
   ├─ Instala todas as dependências do package.json
   ├─ Cria pasta node_modules
   └─ Gera arquivo pnpm-lock.yaml
```

### Fase 4: Configuração do Banco de Dados

```batch
1. Verifica se MySQL está rodando
   └─ mysql -u root -e "SELECT 1"
   
2. Cria banco de dados (se não existir)
   └─ CREATE DATABASE sports_betting
   
3. Executa migrations
   └─ pnpm db:push
```

### Fase 5: Inicialização do Servidor

```batch
1. Inicia servidor de desenvolvimento
   └─ pnpm dev
   
2. Abre navegador
   └─ http://localhost:3000
```

---

## Lógica de Análise

### Critérios de Seleção de Jogos

O robô seleciona jogos que atendem **3 critérios obrigatórios**:

#### Critério 1: Time da Casa Favorito

```typescript
function checkHomeFavorite(homeOdd, drawOdd, awayOdd): boolean {
  return homeOdd < drawOdd && homeOdd < awayOdd;
}
```

**Exemplo:**
```
✓ APROVADO:  Casa 1.80 < Empate 3.50 < Visitante 4.20
✗ REJEITADO: Casa 3.50 > Empate 3.50 (não é favorito)
```

#### Critério 2: Odds em Ordem Crescente

```typescript
function checkOddsOrder(homeOdd, drawOdd, awayOdd): boolean {
  return homeOdd < drawOdd && drawOdd < awayOdd;
}
```

**Exemplo:**
```
✓ APROVADO:  1.80 < 3.50 < 4.20 (ordem correta)
✗ REJEITADO: 1.80 < 2.50 < 4.20 (draw < away, mas não > home)
```

#### Critério 3: Confronto Direto (H2H)

```typescript
function analyzeHeadToHead(h2hGames, homeTeam): boolean {
  // Time da casa deve ter vencido TODOS os últimos jogos
  // Vitória deve ser por 2+ gols de diferença
  
  for (const game of h2hGames) {
    if (homeGoals <= awayGoals) return false;      // Não venceu
    if (homeGoals - awayGoals < 2) return false;   // Vitória < 2 gols
  }
  return true;
}
```

**Exemplo:**
```
✓ APROVADO:  Vitória 3-1 (diferença 2 gols)
✗ REJEITADO: Vitória 2-1 (diferença 1 gol)
✗ REJEITADO: Empate 2-2 (não venceu)
✗ REJEITADO: Derrota 1-2 (não venceu)
```

### Priorização de Jogos

Os jogos aprovados são ordenados por:

1. **Menor odd do time da casa** (favorito mais forte)
2. **Maior diferença entre odds** (casa vs visitante)

```typescript
approved.sort((a, b) => {
  if (a.homeOdd !== b.homeOdd) {
    return a.homeOdd - b.homeOdd;  // Menor odd primeiro
  }
  return b.oddDifference - a.oddDifference;  // Maior diferença
});
```

**Exemplo de Ranking:**
```
🥇 Jogo A: Casa 1.50 (Diferença: 2.70)
🥈 Jogo B: Casa 1.65 (Diferença: 2.50)
🥉 Jogo C: Casa 1.80 (Diferença: 2.40)
```

### Seleção Final

- Apenas os **6 melhores jogos** são exibidos
- Jogos aprovados além do 6º lugar são rejeitados
- Logs detalhados são gerados para cada análise

---

## Estrutura do Projeto

```
sports_betting_robot/
│
├── client/                          # Frontend React
│   ├── index.html                   # HTML principal
│   ├── src/
│   │   ├── main.tsx                 # Ponto de entrada
│   │   ├── App.tsx                  # Componente raiz
│   │   ├── index.css                # Estilos globais
│   │   ├── const.ts                 # Constantes
│   │   ├── components/              # Componentes reutilizáveis
│   │   │   ├── GameCard.tsx         # Card de jogo
│   │   │   ├── AnalysisPanel.tsx    # Painel de análise
│   │   │   └── ...
│   │   ├── pages/                   # Páginas da aplicação
│   │   │   ├── Home.tsx             # Página inicial
│   │   │   └── ...
│   │   ├── hooks/                   # Custom hooks
│   │   ├── contexts/                # React contexts
│   │   ├── lib/                     # Utilitários
│   │   └── _core/                   # Configurações core
│   └── public/                      # Arquivos estáticos
│
├── server/                          # Backend Node.js
│   ├── _core/
│   │   ├── index.ts                 # Servidor principal
│   │   ├── trpc.ts                  # Configuração tRPC
│   │   ├── context.ts               # Contexto tRPC
│   │   ├── dataApi.ts               # APIs de dados
│   │   ├── env.ts                   # Variáveis de ambiente
│   │   └── ...
│   ├── gameAnalyzer.ts              # Lógica de análise
│   ├── oddsService.ts               # Integração com The Odds API
│   ├── routers.ts                   # Endpoints tRPC
│   ├── db.ts                        # Conexão com banco
│   └── storage.ts                   # Persistência de dados
│
├── shared/                          # Código compartilhado
│   ├── types.ts                     # Tipos TypeScript
│   ├── const.ts                     # Constantes compartilhadas
│   └── _core/
│       └── errors.ts                # Classes de erro
│
├── drizzle/                         # Migrations do banco
│   ├── schema.ts                    # Schema do banco
│   ├── relations.ts                 # Relações entre tabelas
│   ├── migrations/                  # Arquivos de migration
│   └── meta/                        # Metadados de migrations
│
├── install.bat                      # Instalador completo
├── start.bat                        # Iniciar servidor
├── package.json                     # Dependências do projeto
├── tsconfig.json                    # Configuração TypeScript
├── vite.config.ts                   # Configuração Vite
├── drizzle.config.ts                # Configuração Drizzle
├── README.md                        # Documentação principal
├── GUIA_INSTALACAO.txt              # Guia de instalação
└── DOCUMENTACAO_TECNICA.md          # Este arquivo
```

---

## APIs e Integrações

### The Odds API

**Endpoint:** `https://api.the-odds-api.com/v4`

**Autenticação:** Query parameter `apiKey`

#### Endpoints Utilizados

**1. Fetch Sports**
```
GET /sports
Retorna: Lista de esportes disponíveis
```

**2. Fetch Odds**
```
GET /sports/{sportKey}/odds
Params:
  - apiKey: Chave de autenticação
  - regions: eu,uk
  - markets: h2h (home/draw/away)
  - oddsFormat: decimal
  - dateFormat: iso

Retorna: Array de jogos com odds
```

**3. Fetch Scores**
```
GET /sports/{sportKey}/scores
Params:
  - apiKey: Chave de autenticação
  - daysFrom: Número de dias para buscar
  - dateFormat: iso

Retorna: Array de resultados de jogos
```

#### Ligas de Futebol Suportadas

```typescript
[
  "soccer_brazil_campeonato",      // Série A Brasil
  "soccer_brazil_serie_b",          // Série B Brasil
  "soccer_england_epl",             // Premier League
  "soccer_france_ligue_one",        // Ligue 1
  "soccer_germany_bundesliga",      // Bundesliga
  "soccer_italy_serie_a",           // Serie A Itália
  "soccer_spain_la_liga",           // La Liga
  "soccer_uefa_champs_league",      // Champions League
  // ... mais 9 ligas
]
```

#### Limites de API

- **Plano Gratuito:** 500 requisições/mês
- **Taxa de Atualização:** Dados atualizados a cada 5 minutos
- **Histórico:** Dados disponíveis para últimos 7 dias

---

## Banco de Dados

### Schema

```typescript
// Tabela de Jogos
interface Game {
  id: string;              // ID único do jogo
  gameId: string;          // ID da API
  sportKey: string;        // Chave do esporte
  league: string;          // Nome da liga
  homeTeam: string;        // Time da casa
  awayTeam: string;        // Time visitante
  commenceTime: Date;      // Horário do jogo
  homeOdd: number;         // Odd do time da casa
  drawOdd: number;         // Odd do empate
  awayOdd: number;         // Odd do time visitante
  oddDifference: number;   // Diferença de odds
  approved: boolean;       // Aprovado na análise
  rejectionReasons: string[]; // Motivos de rejeição
  status: 'pending' | 'live' | 'completed'; // Status
  result: 'green' | 'red' | null; // Resultado
  createdAt: Date;         // Data de criação
  updatedAt: Date;         // Data de atualização
}
```

### Migrations

Executadas automaticamente via Drizzle:

```bash
pnpm db:push
```

Cria/atualiza:
- Tabelas necessárias
- Índices
- Constraints

---

## Testes

### Executar Testes

```bash
# Todos os testes
pnpm test

# Teste específico
pnpm test gameAnalyzer

# Com cobertura
pnpm test --coverage
```

### Testes Disponíveis

**gameAnalyzer.test.ts**
- ✓ Aprova jogo que atende todos os critérios
- ✓ Rejeita jogo onde time da casa não é favorito
- ✓ Rejeita jogo onde odds não estão em ordem
- ✓ Rejeita jogo onde time da casa perdeu em H2H
- ✓ Rejeita jogo com vitória < 2 gols em H2H
- ✓ Seleciona top 6 jogos
- ✓ Calcula diferença de odds corretamente
- ✓ Trata jogos sem dados de H2H
- ✓ Trata jogos sem dados de odds

**oddsService.test.ts**
- ✓ Busca esportes disponíveis
- ✓ Busca odds para um esporte
- ✓ Busca jogos de hoje
- ✓ Trata erros de API

---

## Troubleshooting

### Problema: Node.js não encontrado

**Solução:**
1. Instale Node.js 18+ de https://nodejs.org/
2. Reinicie o computador
3. Execute `install.bat` novamente

### Problema: Porta 3000 em uso

**Solução:**
```bash
# Encontrar processo usando porta 3000
netstat -ano | findstr :3000

# Matar processo (Windows)
taskkill /PID <PID> /F

# Ou alterar porta em server/_core/index.ts
const PORT = 3001;
```

### Problema: Banco de dados não conecta

**Solução:**
1. Verifique se MySQL está rodando
2. Confirme credenciais em `.env`
3. Crie banco manualmente:
   ```sql
   CREATE DATABASE sports_betting CHARACTER SET utf8mb4;
   ```
4. Execute: `pnpm db:push`

### Problema: API Key inválida

**Solução:**
1. Verifique arquivo `.env`
2. Confirme chave: `THE_ODDS_API_KEY=3a50d923ce7f50b649c36ced65029efd`
3. Reinicie servidor: `start.bat`

### Problema: Nenhum jogo encontrado

**Solução:**
1. Verifique se há jogos de futebol hoje
2. Aguarde alguns minutos (API atualiza a cada 5 min)
3. Verifique conexão com internet
4. Verifique logs no console do servidor

### Problema: Erro ao instalar dependências

**Solução:**
```bash
# Limpar cache
pnpm store prune

# Reinstalar
pnpm install --force

# Ou reinstalar tudo
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## Variáveis de Ambiente

### Obrigatórias

```env
THE_ODDS_API_KEY=3a50d923ce7f50b649c36ced65029efd
DATABASE_URL=mysql://root:@localhost:3306/sports_betting
```

### Opcionais

```env
OAUTH_SERVER_URL=
JWT_SECRET=local-dev-secret-key-change-in-production
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
VITE_APP_ID=sports-betting-robot
VITE_APP_TITLE=Sports Betting Robot
VITE_APP_LOGO=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=
OWNER_NAME=
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
```

---

## Comandos Úteis

```bash
# Desenvolvimento
pnpm dev              # Iniciar servidor de desenvolvimento
pnpm build            # Build para produção
pnpm start            # Iniciar servidor de produção

# Banco de dados
pnpm db:push          # Executar migrations
pnpm db:studio        # Abrir Drizzle Studio

# Testes
pnpm test             # Executar testes
pnpm test --watch     # Modo watch

# Formatação
pnpm format           # Formatar código
pnpm check            # Verificar tipos TypeScript

# Limpeza
rm -rf node_modules   # Remover dependências
pnpm install          # Reinstalar dependências
```

---

## Performance e Otimizações

### Frontend
- Code splitting automático com Vite
- Lazy loading de componentes
- React Query para cache de dados
- TailwindCSS purge de CSS não utilizado

### Backend
- Connection pooling MySQL
- Caching de resultados de API
- Batch processing de requisições
- Logging estruturado

### Banco de Dados
- Índices em campos de busca
- Particionamento por data
- Cleanup automático de dados antigos

---

## Segurança

### Práticas Implementadas

1. **Variáveis de Ambiente**
   - Nunca commit `.env`
   - Chaves de API protegidas

2. **Validação de Dados**
   - Zod para validação de schemas
   - Type-safe com TypeScript

3. **CORS**
   - Configurado para localhost:3000
   - Protege contra requisições não autorizadas

4. **JWT**
   - Autenticação baseada em token
   - Refresh tokens para sessões

---

## Desenvolvido com Manus AI 🤖

Para mais informações, consulte:
- README.md - Documentação geral
- GUIA_INSTALACAO.txt - Guia de instalação
- Código-fonte comentado nos arquivos TypeScript
