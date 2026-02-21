# Changelog - Robô de Análise Esportiva V4

## Versão 4.0 - 19/01/2026

### Novas Funcionalidades

#### 1. Exportação para WhatsApp (Sem Previsão de Placar)
- **Página Inicial**: Adicionado botão "Exportar WhatsApp" que gera texto formatado para compartilhamento
- **Página de Histórico**: Cada grupo de data possui botão "WhatsApp" para exportar sinais daquela data
- **Formato do texto exportado**:
  - Nome dos times
  - Liga
  - Horário do jogo
  - Força do Sinal (score)
  - Odds (Casa, Empate, Fora)
  - Casas de apostas disponíveis
  - **NÃO inclui previsão de placar** (conforme solicitado)
- Opções de copiar texto ou abrir WhatsApp diretamente

#### 2. Separação de Jogos por Data no Histórico
- Jogos agora são agrupados pela **data do jogo** (commenceTime), não pela data de análise
- Cada grupo de data mostra:
  - Label amigável (Hoje, Ontem, Amanhã, ou dia da semana)
  - Data completa formatada
  - Quantidade de jogos
  - Quantidade de aprovados
  - Quantidade de finalizados
  - Quantidade de pendentes
- Datas ordenadas da mais recente para a mais antiga

### Correções de Bugs

#### 3. Botão "Atualizar Resultados" Corrigido
- Agora solicita a chave de API antes de tentar atualizar
- Passa a API key corretamente para o backend
- Mostra feedback visual durante a atualização
- Exibe mensagem de sucesso/erro após conclusão

#### 4. Botão "Buscar Placar em Tempo Real" Corrigido
- Cada card de jogo possui botão para buscar placar individual
- Se a API key não estiver configurada, abre dialog para inserir
- Atualiza o resultado localmente após busca bem-sucedida
- Mostra status do jogo (Em andamento, Finalizado)
- Compara resultado real com previsão do robô

### Melhorias Técnicas

#### Backend (server/routers.ts)
- `updateResult`: Agora aceita parâmetro `apiKey` opcional
- `updateAllResults`: Agora aceita parâmetro `apiKey` opcional
- Ambas as mutations configuram a API key dinâmica antes de fazer requisições

#### Frontend (client/src/components/GameCard.tsx)
- Adicionado estado local para armazenar resultado após busca
- Dialog para inserir API key quando necessário
- Feedback visual de loading durante busca
- Comparação visual entre previsão e resultado real

#### Frontend (client/src/pages/Historico.tsx)
- Agrupamento de jogos por data do jogo
- Botão de exportação WhatsApp por grupo de data
- Dialog para API key na atualização em massa
- Estatísticas de jogos finalizados vs pendentes

#### Frontend (client/src/pages/Home.tsx)
- Botão "Exportar WhatsApp" na lista de sinais
- Texto de exportação sem previsão de placar

### Arquivos Modificados
1. `server/routers.ts` - Mutations de atualização de resultado
2. `client/src/components/GameCard.tsx` - Componente de card de jogo
3. `client/src/pages/Historico.tsx` - Página de histórico
4. `client/src/pages/Home.tsx` - Página inicial

### Como Usar

#### Exportar Sinais para WhatsApp
1. Na página inicial, após análise, clique em "Exportar WhatsApp"
2. Na página de histórico, clique no botão "WhatsApp" do grupo de data desejado
3. Copie o texto ou clique em "Abrir WhatsApp" para compartilhar

#### Atualizar Resultados
1. Na página de histórico, clique em "Atualizar Resultados (X)"
2. Insira sua chave de API Football
3. Aguarde a atualização de todos os jogos pendentes

#### Buscar Placar Individual
1. Em qualquer card de jogo já iniciado, clique em "Buscar Placar Real"
2. Se necessário, insira sua chave de API Football
3. O resultado será exibido no card

### Notas
- A API Football tem limite de 100 requisições por dia no plano gratuito
- Recomenda-se usar a mesma API key em todas as operações
- Os resultados são salvos localmente e persistem entre sessões
