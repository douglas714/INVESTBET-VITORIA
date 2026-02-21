# 🚀 Guia de Deploy - GitHub e Netlify

Instruções passo a passo para publicar seu robô no GitHub e fazer deploy no Netlify.

## 📦 Passo 1: Preparar o Repositório Local

### 1.1 Inicializar Git (se ainda não fez)

```bash
cd sports_betting_robot
git init
git config user.name "Seu Nome"
git config user.email "seu.email@example.com"
```

### 1.2 Adicionar e Commitar Arquivos

```bash
# Adicionar todos os arquivos (respeitando .gitignore)
git add .

# Verificar o que será commitado
git status

# Fazer commit inicial
git commit -m "Initial commit: Sports Betting Robot v1.0"
```

## 🐙 Passo 2: Criar Repositório no GitHub

### 2.1 Criar Repositório

1. Acesse [github.com/new](https://github.com/new)
2. Preencha os dados:
   - **Repository name**: `sports_betting_robot`
   - **Description**: "Robô de análise automatizada de apostas esportivas"
   - **Visibility**: Public (ou Private se preferir)
   - **Initialize repository**: Deixe desmarcado (já temos arquivos locais)

3. Clique em "Create repository"

### 2.2 Conectar Repositório Local ao GitHub

```bash
# Adicionar remote (substitua seu-usuario pelo seu usuário do GitHub)
git remote add origin https://github.com/seu-usuario/sports_betting_robot.git

# Renomear branch para main (se necessário)
git branch -M main

# Fazer push do código
git push -u origin main
```

## 🌐 Passo 3: Deploy no Netlify

### 3.1 Opção A: Deploy Automático (Recomendado)

**Melhor opção para atualizações contínuas**

1. **Acesse Netlify**
   - Vá para [app.netlify.com](https://app.netlify.com)
   - Faça login com sua conta (ou crie uma)

2. **Conectar Repositório**
   - Clique em "Add new site" → "Import an existing project"
   - Selecione "GitHub"
   - Autorize Netlify a acessar seus repositórios
   - Selecione `sports_betting_robot`

3. **Configurar Build**
   - **Build command**: `pnpm install && pnpm build`
   - **Publish directory**: `dist/public`
   - Clique em "Deploy site"

4. **Configurar Variáveis de Ambiente**
   - Vá para **Site settings** → **Build & deploy** → **Environment**
   - Clique em "Edit variables"
   - Adicione as seguintes variáveis:

   ```
   TELEGRAM_BOT_TOKEN = seu_token_aqui
   TELEGRAM_CHAT_ID = seu_chat_id_aqui
   API_FOOTBALL_KEY = sua_chave_aqui (opcional)
   NODE_ENV = production
   ```

5. **Ativar Deploy Automático**
   - Vá para **Deploys** → **Deploy settings**
   - Certifique-se de que "Auto publishing" está ativado
   - Agora cada push para `main` fará deploy automático!

### 3.2 Opção B: Deploy Manual com Netlify CLI

**Para testes rápidos ou deploys pontuais**

```bash
# 1. Instalar Netlify CLI
npm install -g netlify-cli

# 2. Fazer login
netlify login

# 3. Fazer build local
pnpm build

# 4. Deploy para produção
netlify deploy --prod
```

## ✅ Passo 4: Verificar Deploy

### 4.1 Verificar Status no Netlify

1. Acesse seu site no Netlify
2. Clique em "Deploys" para ver histórico
3. Verifique se o último deploy tem status "Published"

### 4.2 Testar a Aplicação

1. Clique no link do site (ex: `https://seu-site.netlify.app`)
2. Verifique se a interface carrega corretamente
3. Teste as funcionalidades principais

### 4.3 Verificar Logs

Se houver erro no deploy:

1. Vá para **Deploys** → Clique no deploy com erro
2. Clique em "Deploy log"
3. Procure por mensagens de erro

## 🔄 Passo 5: Atualizações Contínuas

### 5.1 Fazer Alterações Localmente

```bash
# Fazer alterações nos arquivos

# Adicionar mudanças
git add .

# Commitar
git commit -m "Descrição das mudanças"

# Fazer push
git push origin main
```

### 5.2 Netlify Fará Deploy Automaticamente

- Netlify detectará o novo push
- Executará o build automaticamente
- Publicará a nova versão

**Tempo de deploy**: Geralmente 2-5 minutos

## 🔐 Passo 6: Segurança

### 6.1 Proteger Variáveis Sensíveis

✅ **Faça:**
- Configure variáveis de ambiente no painel do Netlify
- Use `.env.example` como template
- Mantenha `.env` no `.gitignore`

❌ **Não Faça:**
- Commitar arquivos `.env` com credenciais reais
- Expor tokens em comentários do código
- Compartilhar variáveis de ambiente em mensagens

### 6.2 Proteger Repositório

1. Vá para **Settings** → **Security & analysis**
2. Ative "Dependabot alerts"
3. Ative "Dependabot security updates"

## 📊 Passo 7: Monitoramento

### 7.1 Verificar Logs do Netlify

```bash
# Ver logs em tempo real
netlify logs --tail
```

### 7.2 Monitorar Erros

- Acesse o painel do Netlify
- Clique em "Functions" para ver logs de funções
- Verifique "Deploys" para histórico

## 🆘 Troubleshooting

### Erro: "Build failed"

**Solução:**
1. Verifique o "Deploy log" no Netlify
2. Procure por mensagens de erro
3. Corrija o erro localmente
4. Faça push novamente

### Erro: "Cannot find module"

**Solução:**
```bash
# Limpar cache e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Erro: "Port already in use"

**Solução:**
```bash
# Mudar porta
PORT=3001 pnpm dev
```

### Variáveis de Ambiente não Funcionam

**Solução:**
1. Verifique se as variáveis estão configuradas no Netlify
2. Verifique se os nomes estão exatos (case-sensitive)
3. Faça um novo deploy após adicionar variáveis

## 📚 Recursos Úteis

- [Documentação Netlify](https://docs.netlify.com/)
- [Documentação GitHub](https://docs.github.com/)
- [Guia Git](https://git-scm.com/doc)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)

## ✨ Próximos Passos

Após o deploy:

1. **Testar funcionalidades**
   - Verificar se a interface carrega
   - Testar análise de jogos
   - Verificar notificações Telegram

2. **Configurar domínio customizado** (opcional)
   - Vá para **Site settings** → **Domain management**
   - Adicione seu domínio

3. **Configurar SSL** (automático no Netlify)
   - Netlify fornece SSL gratuito

4. **Monitorar performance**
   - Use Netlify Analytics
   - Monitore erros e logs

---

**Parabéns! Seu robô está online! 🎉**
