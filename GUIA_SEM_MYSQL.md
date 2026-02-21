# Guia Completo - Robô SEM MySQL (100% Funcional)

## ✅ Novidade: Sistema de Armazenamento em JSON

O robô agora **funciona 100% sem MySQL**! Todos os dados são armazenados em arquivos JSON em uma pasta local.

---

## 🎯 Como Funciona

### Antes (com MySQL)
```
Robô → MySQL → Banco de Dados
     (Precisa estar rodando)
```

### Depois (com JSON)
```
Robô → Pasta /data → Arquivos JSON
     (Sempre funciona!)
```

---

## 📁 Estrutura de Pastas

Quando você rodar o robô, será criada uma pasta `data` com os seguintes arquivos:

```
projeto/
├── data/
│   ├── games.json           # Todos os jogos analisados
│   ├── analysis_history.json # Histórico de análises
│   └── statistics.json       # Estatísticas
├── server/
├── client/
└── ... (outros arquivos)
```

---

## 📊 Estrutura dos Arquivos JSON

### games.json
```json
[
  {
    "id": "game_1705594800_abc123",
    "gameId": "123456",
    "sportKey": "soccer",
    "league": "Campeonato Brasileiro",
    "homeTeam": "Flamengo",
    "awayTeam": "Vasco",
    "commenceTime": "2026-01-18T15:00:00Z",
    "homeOdd": "1.65",
    "drawOdd": "0",
    "awayOdd": "2.5",
    "status": "approved",
    "scoreHome": 0,
    "scoreAway": 0,
    "analyzedAt": "2026-01-18T13:30:00Z",
    "resultUpdatedAt": "2026-01-18T13:30:00Z",
    "completed": false,
    "strengthScore": 92,
    "criteria": {
      "oddsQuality": true,
      "recentForm": true,
      "h2hFavorable": true,
      "statisticsStrong": true,
      "valueBetting": true
    }
  }
]
```

### analysis_history.json
```json
[
  {
    "id": "analysis_1705594800",
    "date": "2026-01-18",
    "totalGames": 762,
    "analyzedGames": 50,
    "approvedGames": 6,
    "rejectedGames": 44,
    "topGames": "Flamengo vs Vasco, Palmeiras vs Corinthians, ...",
    "createdAt": "2026-01-18T13:30:00Z"
  }
]
```

### statistics.json
```json
[
  {
    "id": "stats_2026-01-18",
    "date": "2026-01-18",
    "totalAnalyzed": 50,
    "totalApproved": 6,
    "totalRejected": 44,
    "approvalRate": 12,
    "averageScore": 68.5,
    "updatedAt": "2026-01-18T13:30:00Z"
  }
]
```

---

## 🚀 Instalação e Uso

### 1. Extrair o ZIP
```bash
unzip sports_betting_robot_v2_FINAL.zip
cd sports_betting_robot_v2
```

### 2. Instalar Dependências
```bash
pnpm install
```

### 3. Configurar .env
```env
API_FOOTBALL_KEY=sua_chave_aqui
DEMO_MODE=false
```

### 4. Rodar o Robô
```bash
pnpm dev
```

### 5. Acessar Interface
```
http://localhost:3000
```

### 6. Clicar em "INICIAR ANÁLISE"

O robô vai:
1. Buscar fixtures de hoje
2. Analisar até 100 jogos
3. Retornar 6 aprovados
4. **Salvar automaticamente em JSON**

---

## 📂 Acessar os Dados

### Ver Todos os Jogos Salvos

Abra o arquivo `data/games.json` em um editor de texto:

```bash
# No Windows
notepad data\games.json

# No Mac/Linux
cat data/games.json
```

### Ver Histórico de Análises

```bash
# No Windows
notepad data\analysis_history.json

# No Mac/Linux
cat data/analysis_history.json
```

### Ver Estatísticas

```bash
# No Windows
notepad data\statistics.json

# No Mac/Linux
cat data/statistics.json
```

---

## 🔍 Consultar Dados Programaticamente

### Exemplo: Ler Todos os Jogos

```typescript
import { getAllGames } from "./server/jsonStorage";

const games = getAllGames();
console.log(`Total de jogos: ${games.length}`);

games.forEach(game => {
  console.log(`${game.homeTeam} vs ${game.awayTeam} - Score: ${game.strengthScore}`);
});
```

### Exemplo: Ler Jogos de Hoje

```typescript
import { getTodaysGames } from "./server/jsonStorage";

const todaysGames = getTodaysGames();
console.log(`Jogos de hoje: ${todaysGames.length}`);
```

### Exemplo: Ler Histórico de Análises

```typescript
import { getAnalysisHistory } from "./server/jsonStorage";

const history = getAnalysisHistory();
console.log(`Total de análises: ${history.length}`);

history.forEach(analysis => {
  console.log(`${analysis.date}: ${analysis.approvedGames} jogos aprovados`);
});
```

---

## 💾 Backup e Restauração

### Fazer Backup

```typescript
import { exportAllData } from "./server/jsonStorage";

const backup = exportAllData();
// Salvar em arquivo
fs.writeFileSync("backup.json", backup);
```

### Restaurar Backup

```typescript
import { importData } from "./server/jsonStorage";

const backup = fs.readFileSync("backup.json", "utf-8");
importData(backup);
```

---

## 🧹 Limpar Dados

### Limpar Tudo

```typescript
import { clearAllData } from "./server/jsonStorage";

clearAllData();
```

### Limpar Apenas Jogos

```typescript
import { writeJSON } from "./server/jsonStorage";

writeJSON("data/games.json", []);
```

---

## 📊 Visualizar Dados com Python

Se preferir analisar os dados com Python:

```python
import json

# Ler jogos
with open("data/games.json", "r") as f:
    games = json.load(f)

# Ler análises
with open("data/analysis_history.json", "r") as f:
    analyses = json.load(f)

# Ler estatísticas
with open("data/statistics.json", "r") as f:
    stats = json.load(f)

# Exemplo: Mostrar jogos aprovados
approved = [g for g in games if g["status"] == "approved"]
print(f"Total de jogos aprovados: {len(approved)}")

for game in approved:
    print(f"{game['homeTeam']} vs {game['awayTeam']} - Score: {game['strengthScore']}")
```

---

## 🎯 Casos de Uso

### 1. Acompanhar Resultados

```typescript
// Depois que os jogos acontecem, atualizar resultado
import { updateGameResult } from "./server/jsonStorage";

updateGameResult("123456", 2, 1, true); // Flamengo 2 x 1 Vasco
```

### 2. Gerar Relatórios

```typescript
import { getAllGames, getAllStatistics } from "./server/jsonStorage";

const games = getAllGames();
const stats = getAllStatistics();

console.log("=== RELATÓRIO ===");
console.log(`Total de jogos: ${games.length}`);
console.log(`Taxa de aprovação: ${stats.map(s => s.approvalRate).reduce((a, b) => a + b) / stats.length}%`);
```

### 3. Exportar para Excel

```typescript
import { getAllGames } from "./server/jsonStorage";
import ExcelJS from "exceljs";

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("Jogos");

const games = getAllGames();
games.forEach(game => {
  worksheet.addRow([
    game.homeTeam,
    game.awayTeam,
    game.league,
    game.strengthScore,
    game.status,
  ]);
});

await workbook.xlsx.writeFile("jogos.xlsx");
```

---

## ⚙️ Configurações Avançadas

### Mudar Pasta de Dados

Editar `server/jsonStorage.ts`:

```typescript
const DATA_DIR = path.join(process.cwd(), "meus_dados"); // Mudar para "meus_dados"
```

### Adicionar Mais Campos

Editar interface `GameRecord`:

```typescript
export interface GameRecord {
  // ... campos existentes
  customField?: string; // Novo campo
}
```

---

## 🔒 Segurança

### Backup Automático

```typescript
// Adicionar ao servidor
setInterval(() => {
  const backup = exportAllData();
  const timestamp = new Date().toISOString();
  fs.writeFileSync(`backups/backup_${timestamp}.json`, backup);
}, 24 * 60 * 60 * 1000); // A cada 24 horas
```

### Criptografia (Opcional)

```typescript
import crypto from "crypto";

function encryptData(data: string, key: string): string {
  const cipher = crypto.createCipher("aes-256-cbc", key);
  return cipher.update(data, "utf8", "hex") + cipher.final("hex");
}
```

---

## 📞 Troubleshooting

### Problema: Pasta /data não foi criada

**Solução**: Executar robô uma vez para criar automaticamente

```bash
pnpm dev
# Aguardar alguns segundos
# Pasta /data será criada
```

### Problema: Arquivo JSON corrompido

**Solução**: Deletar arquivo e deixar recriar

```bash
rm data/games.json
# Próxima análise vai recriar
```

### Problema: Dados não aparecem

**Solução**: Verificar se análise foi concluída

```bash
# Ver logs
cat data/games.json

# Se vazio, rodar análise novamente
```

---

## 🎓 Vantagens do Sistema JSON

| Aspecto | MySQL | JSON |
|---------|-------|------|
| **Instalação** | Complexa | Automática |
| **Configuração** | Muitos passos | Nenhum |
| **Dependências** | Servidor externo | Nenhuma |
| **Portabilidade** | Difícil | Fácil |
| **Backup** | Complexo | Um arquivo |
| **Visualização** | Ferramenta especial | Editor de texto |
| **Custo** | Pode ter | Grátis |

---

## 🚀 Próximos Passos

1. ✅ Instalar robô
2. ✅ Rodar primeira análise
3. ✅ Ver dados em `data/games.json`
4. ✅ Acompanhar histórico
5. ✅ Gerar relatórios

---

## 📝 Resumo

**O robô agora funciona 100% sem MySQL!**

- ✓ Armazenamento em JSON
- ✓ Sem dependências externas
- ✓ Fácil de usar e visualizar
- ✓ Portável e seguro
- ✓ Pronto para produção

---

**Versão**: 2.0 PRO (Sem MySQL)  
**Data**: 18/01/2026  
**Status**: 100% Funcional  
**Armazenamento**: JSON em pasta local
