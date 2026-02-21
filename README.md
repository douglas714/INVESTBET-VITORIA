# 🤖 Sports Betting Robot - Robô de Análise de Apostas Esportivas

Robô automatizado de análise de apostas esportivas com interface web elegante, integração com Telegram e suporte a múltiplas APIs de dados esportivos.

## 🌟 Características

- **Análise Automatizada**: Análise inteligente de jogos e odds em tempo real
- **Interface Web Moderna**: Dashboard responsivo com React + TypeScript
- **Notificações Telegram**: Receba alertas de oportunidades de apostas via Telegram
- **Banco de Dados**: Histórico completo de análises com MySQL/Drizzle ORM
- **API Integrada**: Suporte para The Odds API e API-Football
- **Backtest**: Teste estratégias com dados históricos

## 📋 Pré-requisitos

- **Node.js 18+** - [Download](https://nodejs.org/)
- **pnpm** (será instalado automaticamente)
- **Git** - [Download](https://git-scm.com/)

## 🚀 Início Rápido

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/sports_betting_robot.git
cd sports_betting_robot
```

### 2. Instalar Dependências

```bash
pnpm install
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o arquivo .env com suas credenciais
nano .env
```

**Variáveis necessárias:**

| Variável | Descrição | Obtenção |
|----------|-----------|----------|
| `TELEGRAM_BOT_TOKEN` | Token do seu bot Telegram | [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | ID do chat/grupo para notificações | [@userinfobot](https://t.me/userinfobot) |
| `API_FOOTBALL_KEY` | Chave da API-Football (opcional) | [api-football.com](https://www.api-football.com/) |
| `DATABASE_URL` | URL de conexão MySQL (opcional) | Configure seu MySQL |

### 4. Iniciar em Desenvolvimento

```bash
pnpm dev
```

O servidor estará disponível em: **http://localhost:3000**

## 🌐 Deploy no Netlify

### Opção 1: Deploy Automático (Recomendado)

1. **Faça push do repositório para GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Conecte ao Netlify**
   - Acesse [netlify.com](https://app.netlify.com)
   - Clique em "New site from Git"
   - Selecione seu repositório GitHub
   - Configure as variáveis de ambiente no painel do Netlify

3. **Configure Variáveis de Ambiente no Netlify**
   - Vá para **Site settings → Build & deploy → Environment**
   - Adicione as variáveis:
     - `TELEGRAM_BOT_TOKEN`
     - `TELEGRAM_CHAT_ID`
     - `API_FOOTBALL_KEY` (opcional)
     - `NODE_ENV=production`

4. **Deploy automático**
   - Cada push para `main` fará deploy automático

### Opção 2: Deploy Manual

```bash
# Instale Netlify CLI
npm install -g netlify-cli

# Faça login
netlify login

# Deploy
netlify deploy --prod
```

## 🏗️ Estrutura do Projeto

```
sports_betting_robot/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas da aplicação
│   │   └── App.tsx        # Componente principal
│   └── index.html
├── server/                # Backend Express + tRPC
│   ├── _core/            # Configuração principal
│   ├── routers.ts        # Rotas tRPC
│   └── gameAnalyzer.ts   # Lógica de análise
├── shared/               # Código compartilhado
│   ├── types.ts          # Tipos TypeScript
│   └── const.ts          # Constantes
├── drizzle/              # Migrações do banco de dados
├── .env.example          # Exemplo de variáveis de ambiente
├── netlify.toml          # Configuração do Netlify
├── package.json          # Dependências
├── tsconfig.json         # Configuração TypeScript
└── vite.config.ts        # Configuração Vite
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia servidor em modo desenvolvimento
pnpm dev:watch        # Modo watch com reload automático

# Build
pnpm build            # Build para produção
pnpm check            # Verifica tipos TypeScript

# Banco de Dados
pnpm db:push          # Sincroniza schema com banco de dados
pnpm db:migrate       # Executa migrações

# Testes
pnpm test             # Executa testes
pnpm format           # Formata código com Prettier

# Backtest
pnpm backtest:last30  # Backtest dos últimos 30 dias
pnpm backtest:report  # Gera relatório de backtest
```

## 📊 Configuração do Banco de Dados (Opcional)

Se deseja usar banco de dados local:

### MySQL/MariaDB

```bash
# Instale MySQL
# Windows: https://dev.mysql.com/downloads/installer/
# Mac: brew install mysql
# Linux: sudo apt-get install mysql-server

# Inicie o MySQL
mysql -u root -p

# Crie o banco de dados
CREATE DATABASE sports_betting;

# Configure a URL no .env
DATABASE_URL=mysql://root:sua_senha@localhost:3306/sports_betting

# Sincronize o schema
pnpm db:push
```

## 🤖 Configuração do Telegram

1. **Crie um bot no Telegram**
   - Abra [@BotFather](https://t.me/BotFather)
   - Use `/newbot` para criar um novo bot
   - Copie o token fornecido

2. **Obtenha seu Chat ID**
   - Abra [@userinfobot](https://t.me/userinfobot)
   - Copie o ID fornecido

3. **Configure no .env**
   ```env
   TELEGRAM_BOT_TOKEN=seu_token_aqui
   TELEGRAM_CHAT_ID=seu_id_aqui
   ```

## 📚 Documentação Adicional

- [Guia de Instalação](./docs/INSTALACAO.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [Documentação Técnica](./DOCUMENTACAO_TECNICA.md)

## 🐛 Troubleshooting

### Erro: "Port 3000 is already in use"
```bash
# Mude a porta
PORT=3001 pnpm dev
```

### Erro: "Cannot find module"
```bash
# Reinstale dependências
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Erro de conexão com Telegram
- Verifique se `TELEGRAM_BOT_TOKEN` está correto
- Verifique se `TELEGRAM_CHAT_ID` está correto
- Teste o bot: `https://api.telegram.org/bot{TOKEN}/getMe`

## 🔐 Segurança

- **Nunca commite o arquivo `.env`** com credenciais reais
- Use `.env.example` como template
- Configure variáveis de ambiente no Netlify, não no repositório
- Mantenha tokens e chaves de API seguras

## 📝 Licença

MIT - Veja [LICENSE](./LICENSE) para detalhes

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📧 Suporte

Para dúvidas ou problemas:
- Abra uma [Issue](https://github.com/seu-usuario/sports_betting_robot/issues)
- Consulte a [Documentação](./DOCUMENTACAO_TECNICA.md)

---

**Desenvolvido com ❤️ para análise de apostas esportivas**
