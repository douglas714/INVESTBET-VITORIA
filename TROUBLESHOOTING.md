# Guia de Solução de Problemas - INVESTBET

## Problema 1: "ERRO: Arquivo .env não foi criado"

### Sintomas
- Script para com mensagem de erro
- Arquivo .env não existe na pasta

### Causas Possíveis
1. Sem permissão de escrita na pasta
2. Caminho da pasta tem caracteres especiais
3. Antivírus bloqueando criação de arquivo

### Soluções

**Solução 1: Verificar Permissões**
```
1. Clique direito na pasta do projeto
2. Propriedades > Segurança
3. Verifique se seu usuário tem "Controle Total"
4. Se não, clique Editar > Seu usuário > Permitir "Controle Total"
```

**Solução 2: Criar .env Manualmente**
```
1. Abra Bloco de Notas
2. Copie o conteúdo abaixo:

# The Odds API Configuration
THE_ODDS_API_KEY=3a50d923ce7f50b649c36ced65029efd

# Database Configuration
DATABASE_URL=mysql://root:@localhost:3306/sports_betting

# OAuth Configuration (opcional)
OAUTH_SERVER_URL=
JWT_SECRET=local-dev-secret-key-change-in-production

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=

# App Configuration
VITE_APP_ID=sports-betting-robot
VITE_APP_TITLE=Sports Betting Robot
VITE_APP_LOGO=

# OAuth Portal (opcional)
VITE_OAUTH_PORTAL_URL=

# Owner Info (opcional)
OWNER_OPEN_ID=
OWNER_NAME=

# Forge API (opcional)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=

3. Salve como: .env (não .txt)
4. Coloque na pasta raiz do projeto
5. Execute install.bat novamente
```

**Solução 3: Desabilitar Antivírus Temporariamente**
```
1. Desabilite seu antivírus temporariamente
2. Execute install.bat
3. Reabilite o antivírus
```

---

## Problema 2: "0 Jogos Encontrados"

### Sintomas
- Clica em "INICIAR ANÁLISE"
- Sistema retorna "0 jogos encontrados"
- Mas sabe que tem jogos disponíveis

### Causas Possíveis
1. THE_ODDS_API_KEY não está configurada
2. Arquivo .env não foi lido pelo servidor
3. API atingiu limite de requisições (500/mês)

### Soluções

**Solução 1: Verificar THE_ODDS_API_KEY**
```
1. Abra arquivo .env
2. Procure por: THE_ODDS_API_KEY=
3. Verifique se tem uma chave após o =
4. Se estiver vazio, adicione: THE_ODDS_API_KEY=3a50d923ce7f50b649c36ced65029efd
5. Salve e reinicie o servidor (Ctrl+C e execute start.bat)
```

**Solução 2: Verificar Logs do Servidor**
```
1. Procure no console do servidor por:
   [OddsService] Fetching games from 17 leagues...
   
2. Se aparecer, a API key foi lida corretamente
3. Se não aparecer, significa que a API key não foi configurada
```

**Solução 3: Verificar Limite de API**
```
1. Procure por mensagem de erro:
   API LIMIT REACHED
   
2. Se aparecer, você atingiu o limite de 500 requisições/mês
3. Opções:
   - Aguardar o próximo mês
   - Usar uma chave de API diferente
   - Fazer upgrade em https://the-odds-api.com/
```

---

## Problema 3: "MySQL não está rodando"

### Sintomas
- Aviso: "MySQL não está rodando"
- Banco de dados não é criado
- Jogos não são salvos no banco

### Causas Possíveis
1. XAMPP não foi iniciado
2. Serviço MySQL não está rodando
3. MySQL não está instalado

### Soluções

**Solução 1: Iniciar XAMPP**
```
1. Abra XAMPP Control Panel
2. Clique em "Start" ao lado de "Apache"
3. Clique em "Start" ao lado de "MySQL"
4. Aguarde ficar verde
5. Execute install.bat novamente
```

**Solução 2: Iniciar Serviço MySQL (Windows)**
```
1. Pressione Windows + R
2. Digite: services.msc
3. Procure por "MySQL" ou "MySQL80"
4. Clique direito > Iniciar
5. Execute install.bat novamente
```

**Solução 3: Instalar MySQL**
```
Se MySQL não está instalado:
1. Baixe em: https://dev.mysql.com/downloads/mysql/
2. Ou use XAMPP que já inclui MySQL
3. Instale e execute install.bat novamente
```

---

## Problema 4: "Erro ao conectar ao banco de dados"

### Sintomas
- Erro: DATABASE_URL is required
- Jogos não são salvos
- Histórico não funciona

### Causas Possíveis
1. DATABASE_URL não está configurada no .env
2. MySQL não está rodando
3. Credenciais do MySQL estão erradas

### Soluções

**Solução 1: Verificar DATABASE_URL**
```
1. Abra arquivo .env
2. Procure por: DATABASE_URL=
3. Verifique se tem: mysql://root:@localhost:3306/sports_betting
4. Se estiver vazio ou errado, corrija
5. Salve e reinicie o servidor
```

**Solução 2: Verificar Credenciais MySQL**
```
1. Abra phpMyAdmin (http://localhost/phpmyadmin)
2. Verifique seu usuário e senha
3. Se for diferente de root, atualize no .env:
   DATABASE_URL=mysql://seu_usuario:sua_senha@localhost:3306/sports_betting
4. Salve e reinicie o servidor
```

**Solução 3: Criar Banco Manualmente**
```
1. Abra phpMyAdmin
2. Clique em "Novo"
3. Nome: sports_betting
4. Collation: utf8mb4_unicode_ci
5. Clique "Criar"
6. Reinicie o servidor
```

---

## Problema 5: "Porta 3000 já está em uso"

### Sintomas
- Erro: Port 3000 is already in use
- Servidor não inicia

### Causas Possíveis
1. Outro servidor está rodando na porta 3000
2. Processo anterior não foi encerrado

### Soluções

**Solução 1: Encerrar Processo na Porta 3000**
```
Windows:
1. Pressione Windows + R
2. Digite: cmd
3. Digite: netstat -ano | findstr :3000
4. Anote o PID (número na última coluna)
5. Digite: taskkill /PID [número] /F
6. Execute start.bat novamente
```

**Solução 2: Usar Porta Diferente**
```
1. Abra arquivo .env
2. Adicione: PORT=3001
3. Salve e execute start.bat
4. Acesse http://localhost:3001
```

---

## Problema 6: "Dependências não instaladas"

### Sintomas
- Erro: Cannot find module
- Erro: node_modules não existe

### Causas Possíveis
1. pnpm install falhou
2. Conexão de internet foi interrompida
3. Espaço em disco insuficiente

### Soluções

**Solução 1: Reinstalar Dependências**
```
1. Abra PowerShell/CMD na pasta do projeto
2. Digite: pnpm install
3. Aguarde completar
4. Execute start.bat
```

**Solução 2: Limpar Cache e Reinstalar**
```
1. Abra PowerShell/CMD na pasta do projeto
2. Digite: pnpm store prune
3. Digite: pnpm install
4. Aguarde completar
5. Execute start.bat
```

**Solução 3: Verificar Espaço em Disco**
```
1. Clique direito em C:
2. Propriedades
3. Verifique espaço livre
4. Precisa de pelo menos 2GB
5. Se não tiver, libere espaço
```

---

## Problema 7: "Erro ao compilar TypeScript"

### Sintomas
- Erro: TS2307 Cannot find module
- Servidor não inicia
- Erros de tipo no console

### Causas Possíveis
1. Arquivo .env não foi criado
2. Dependências não foram instaladas
3. Arquivo corrompido

### Soluções

**Solução 1: Verificar .env**
```
1. Certifique-se que .env existe
2. Verifique se tem THE_ODDS_API_KEY
3. Se não, crie manualmente
4. Reinicie o servidor
```

**Solução 2: Reinstalar Dependências**
```
1. Delete pasta node_modules
2. Execute: pnpm install
3. Aguarde completar
4. Execute start.bat
```

**Solução 3: Limpar Build**
```
1. Delete pasta .next (se existir)
2. Delete pasta dist (se existir)
3. Execute: pnpm build
4. Execute: pnpm dev
```

---

## Problema 8: "Navegador não abre automaticamente"

### Sintomas
- Servidor inicia mas navegador não abre
- Precisa digitar URL manualmente

### Causas Possíveis
1. Navegador padrão não está configurado
2. Firewall bloqueando
3. Permissão insuficiente

### Soluções

**Solução 1: Abrir Manualmente**
```
1. Abra seu navegador
2. Digite: http://localhost:3000
3. Pressione Enter
```

**Solução 2: Configurar Navegador Padrão**
```
Windows:
1. Configurações > Aplicativos > Aplicativos padrão
2. Procure por "Navegador da Web"
3. Clique e escolha seu navegador preferido
```

---

## Problema 9: "Erro de CORS"

### Sintomas
- Erro no console do navegador
- Mensagem: Cross-Origin Request Blocked
- Dados não carregam

### Causas Possíveis
1. Servidor e cliente em portas diferentes
2. Configuração de CORS incorreta

### Soluções

**Solução 1: Verificar Porta**
```
1. Verifique se está acessando: http://localhost:3000
2. Não use: http://127.0.0.1:3000
3. Não use: http://seu_ip:3000
```

**Solução 2: Reiniciar Servidor**
```
1. Pressione Ctrl+C no terminal
2. Execute: pnpm dev
3. Aguarde iniciar
4. Recarregue o navegador (F5)
```

---

## Problema 10: "Análise muito lenta"

### Sintomas
- Clica em "INICIAR ANÁLISE"
- Demora muito tempo para retornar
- Servidor parece travado

### Causas Possíveis
1. API respondendo lentamente
2. Muitos jogos para analisar
3. Conexão de internet lenta

### Soluções

**Solução 1: Aguardar**
```
1. A análise pode levar 30-60 segundos
2. Não feche o navegador
3. Aguarde a mensagem de sucesso
```

**Solução 2: Verificar Conexão**
```
1. Teste sua conexão de internet
2. Verifique velocidade em: speedtest.net
3. Se estiver lenta, aguarde ou mude de rede
```

**Solução 3: Verificar Logs**
```
1. Procure no console por:
   [OddsService] Fetching games from 17 leagues...
   [OddsService] Found X total games
   
2. Se aparecer, significa que está processando
3. Aguarde completar
```

---

## Checklist de Verificação

Se nada acima resolver, verifique:

- [ ] Node.js 18+ está instalado
- [ ] pnpm está instalado
- [ ] Arquivo .env existe
- [ ] THE_ODDS_API_KEY está configurada
- [ ] MySQL está rodando (se usar banco)
- [ ] Pasta do projeto tem permissão de escrita
- [ ] Porta 3000 está disponível
- [ ] Conexão de internet está funcionando
- [ ] Antivírus não está bloqueando
- [ ] Espaço em disco suficiente (2GB+)

---

## Contato e Suporte

Se ainda tiver problemas:

1. Verifique os logs do servidor
2. Consulte a documentação em DOCUMENTACAO_TECNICA.md
3. Verifique README.md para informações gerais
4. Leia README_CORRECAO.md para entender as correções

---

**Desenvolvido com Manus AI**  
Data: 18/01/2026
