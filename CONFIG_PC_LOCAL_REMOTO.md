# 🏠 Guia: Usar Robô no PC e Acessar pelo Netlify

Este guia ensina como rodar o robô no seu computador e acessá-lo de qualquer lugar (celular, outro PC) usando o site hospedado no Netlify.

## 🚀 Passo 1: Instalar Dependências no PC
Abra o terminal na pasta do projeto no seu computador e execute:
```bash
pnpm install
# OU
npm install
```

## 🌐 Passo 2: Criar um Túnel com Ngrok
O Ngrok permite que o Netlify converse com o seu computador.
1. Baixe o Ngrok em [ngrok.com](https://ngrok.com/download).
2. No terminal, execute:
   ```bash
   ngrok http 3000
   ```
3. Copie o endereço que aparecer (ex: `https://abcd-123.ngrok-free.app`).

## ⚙️ Passo 3: Configurar o Netlify
1. Abra o arquivo `netlify.toml` no seu código.
2. Na linha onde diz `to = "https://SEU_ENDERECO_NGROK.ngrok-free.app/api/trpc/:splat"`, substitua pelo endereço que você copiou no Passo 2.
3. Faça o **Push** para o GitHub:
   ```bash
   git add .
   git commit -m "Config: Endereço remoto do PC local"
   git push origin main
   ```

## 🤖 Passo 4: Iniciar o Robô no PC
No seu computador, inicie o servidor:
```bash
pnpm dev
# OU
npm run dev
```

---

### ✅ Como funciona agora?
- O **Frontend** (site) roda no Netlify.
- Quando você clica em "Analisar", o Netlify manda a ordem para o seu **PC local**.
- O seu PC faz o trabalho pesado (análise, chamadas de API) e devolve o resultado para o site.
- **Vantagem:** Sem erros de timeout do Netlify e você pode usar do celular!

### ⚠️ Importante
- O seu computador precisa estar **ligado** e com o comando `npm run dev` rodando.
- O Ngrok precisa estar aberto. Se você fechar e abrir o Ngrok, o endereço vai mudar e você precisará atualizar o `netlify.toml` e fazer push novamente.
