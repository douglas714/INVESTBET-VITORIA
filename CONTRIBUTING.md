# 🤝 Guia de Contribuição

Obrigado por considerar contribuir para o Sports Betting Robot! Este documento fornece diretrizes e instruções para contribuir com o projeto.

## 📋 Código de Conduta

Este projeto adota um Código de Conduta para garantir um ambiente acolhedor para todos. Esperamos que todos os contribuidores sigam este código.

## 🚀 Como Contribuir

### Reportar Bugs

Antes de criar um relatório de bug, verifique se o problema já foi reportado. Se você encontrar um bug:

1. **Use um título descritivo** para o issue
2. **Descreva os passos exatos** para reproduzir o problema
3. **Forneça exemplos específicos** para demonstrar os passos
4. **Descreva o comportamento observado** e o que você esperava
5. **Inclua screenshots** se possível
6. **Mencione sua versão do Node.js** e sistema operacional

### Sugerir Melhorias

Sugestões de melhorias são sempre bem-vindas! Para sugerir uma melhoria:

1. **Use um título descritivo**
2. **Forneça uma descrição detalhada** da melhoria sugerida
3. **Liste exemplos** de como a melhoria funcionaria
4. **Explique por que** essa melhoria seria útil

### Pull Requests

1. **Fork o repositório** e crie uma branch para sua feature
   ```bash
   git checkout -b feature/AmazingFeature
   ```

2. **Faça suas mudanças** seguindo o estilo de código do projeto

3. **Adicione testes** para novas funcionalidades

4. **Commit suas mudanças**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```

5. **Push para a branch**
   ```bash
   git push origin feature/AmazingFeature
   ```

6. **Abra um Pull Request** com uma descrição clara

## 📝 Estilo de Código

- Use **TypeScript** para novo código
- Siga o estilo existente do projeto
- Use **Prettier** para formatação: `pnpm format`
- Use **ESLint** para linting (se configurado)

## 🧪 Testes

- Escreva testes para novas funcionalidades
- Execute testes antes de fazer push: `pnpm test`
- Mantenha cobertura de testes alta

## 📚 Documentação

- Atualize a documentação para novas funcionalidades
- Mantenha o README.md atualizado
- Adicione comentários em código complexo

## 🔄 Processo de Review

1. Pelo menos um mantenedor revisará seu PR
2. Mudanças podem ser solicitadas
3. Após aprovação, seu PR será mergeado
4. Seu código será deployado na próxima release

## 📦 Estrutura do Projeto

```
sports_betting_robot/
├── client/          # Frontend React
├── server/          # Backend Express
├── shared/          # Código compartilhado
├── drizzle/         # Migrações de BD
└── tests/           # Testes
```

## 🛠️ Setup de Desenvolvimento

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/sports_betting_robot.git
cd sports_betting_robot

# Instalar dependências
pnpm install

# Iniciar em desenvolvimento
pnpm dev

# Executar testes
pnpm test

# Formatar código
pnpm format
```

## 🚀 Comandos Úteis

```bash
# Desenvolvimento
pnpm dev              # Inicia servidor
pnpm dev:watch        # Modo watch

# Build
pnpm build            # Build para produção
pnpm check            # Verifica tipos

# Testes
pnpm test             # Executa testes
pnpm format           # Formata código

# Banco de Dados
pnpm db:push          # Sincroniza schema
```

## 📖 Recursos

- [Documentação do Projeto](./README.md)
- [Guia de Deploy](./DEPLOYMENT.md)
- [Documentação Técnica](./DOCUMENTACAO_TECNICA.md)

## 🎯 Áreas para Contribuição

- 🐛 Correção de bugs
- ✨ Novas funcionalidades
- 📚 Melhorias na documentação
- 🧪 Testes adicionais
- ⚡ Otimizações de performance
- 🎨 Melhorias na UI/UX

## 📞 Perguntas?

- Abra uma [Discussion](https://github.com/seu-usuario/sports_betting_robot/discussions)
- Consulte a [Documentação](./DOCUMENTACAO_TECNICA.md)
- Verifique [Issues Abertas](https://github.com/seu-usuario/sports_betting_robot/issues)

---

**Obrigado por contribuir! 🎉**
