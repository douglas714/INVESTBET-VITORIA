# 🔧 Correção: API não funciona no Netlify

## 🎯 Problema Identificado

Quando você clica em "Analisar", recebe o erro:
```
TRPCClientError: Unexpected token '<', "<!doctype "... is not valid JSON
/api/trpc/games.analyze?batch=1: Failed to load resource: the server responded with a status of 404
```

**Causa:** O Netlify é uma plataforma de hospedagem **estática** e não consegue rodar um servidor Node.js/Express contínuo. Quando você tenta acessar `/api/trpc/games.analyze`, o Netlify retorna HTML (404) em vez de conectar ao servidor.

## ✅ Solução Implementada

Convertemos o servidor para usar **Netlify Functions** (serverless):

### 1. **Novo arquivo: `netlify/functions/trpc.ts`**
- Função serverless que processa todas as requisições de `/api/trpc`
- Usa `fetchRequestHandler` do tRPC para compatibilidade total
- Executa sob demanda, sem servidor contínuo

### 2. **Atualizado: `netlify.toml`**
- Configuração de redirects para `/api/trpc/*` → `/.netlify/functions/trpc`
- Headers de CORS adicionados
- Ambiente Node.js 22.13.0

### 3. **Atualizado: `package.json`**
- Adicionada dependência `@netlify/functions`
- Novo script `dev:netlify` para testar localmente
- Script `build:functions` para compilar funções

## 🚀 Como Usar

### Passo 1: Instalar Netlify CLI (local)

```bash
npm install -g netlify-cli
```

### Passo 2: Fazer Login no Netlify

```bash
netlify login
```

### Passo 3: Testar Localmente

```bash
# Instalar dependências
pnpm install

# Testar com Netlify Dev
pnpm dev:netlify
```

O site estará disponível em `http://localhost:8888` com as funções serverless funcionando!

### Passo 4: Fazer Push para GitHub

```bash
git add .
git commit -m "Fix: Convert to Netlify Functions for serverless API"
git push origin main
```

### Passo 5: Deploy Automático

Netlify detectará o novo push e fará deploy automático. A API agora funcionará corretamente! ✅

## 📋 Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `netlify.toml` | Adicionado redirect para `/api/trpc` |
| `package.json` | Adicionadas dependências e scripts |
| `netlify/functions/trpc.ts` | **Novo** - Função serverless |
| `.netlify/state.json` | **Novo** - Configuração local |

## 🧪 Testando Localmente

```bash
# Terminal 1: Iniciar Netlify Dev
pnpm dev:netlify

# Terminal 2: Testar API (em outro terminal)
curl -X POST http://localhost:8888/api/trpc/games.analyze \
  -H "Content-Type: application/json" \
  -d '{"json":{}}'
```

## ✨ O Que Muda no Deploy

**Antes (Não funcionava):**
- Netlify tentava servir servidor Node.js
- `/api/trpc` retornava 404 HTML
- Erro: "is not valid JSON"

**Depois (Funciona!):**
- Netlify Functions executam serverless
- `/api/trpc` redireciona para função
- API responde corretamente com JSON

## 🔐 Variáveis de Ambiente

Certifique-se de que estas variáveis estão configuradas no painel do Netlify:

```
TELEGRAM_BOT_TOKEN = seu_token
TELEGRAM_CHAT_ID = seu_chat_id
API_FOOTBALL_KEY = sua_chave (opcional)
RESULT_POLL_SECONDS = 120
NODE_ENV = production
```

## 📞 Troubleshooting

### Erro: "Cannot find module @netlify/functions"

```bash
pnpm install
```

### Erro: "Port 8888 already in use"

```bash
netlify dev --port 8889
```

### Função não está sendo chamada

1. Verifique se `netlify/functions/trpc.ts` existe
2. Verifique se `netlify.toml` tem o redirect correto
3. Verifique os logs: `netlify dev --debug`

## 🎉 Resultado

Após fazer push e deploy no Netlify:

✅ Clique em "Analisar" funciona  
✅ API retorna JSON corretamente  
✅ Notificações Telegram funcionam  
✅ Sem erros 404 ou HTML  

---

**Desenvolvido para resolver o problema de serverless no Netlify!**
