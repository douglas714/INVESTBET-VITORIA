@echo off
chcp 65001 > nul
color 0A
cls

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                                                                  ║
echo ║         🤖 SPORTS BETTING ROBOT - SETUP COMPLETO 🤖             ║
echo ║                                                                  ║
echo ║     Este script vai instalar e iniciar o sistema completo       ║
echo ║                                                                  ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

REM ============================================================
REM VERIFICAR PRÉ-REQUISITOS
REM ============================================================

echo [PASSO 1] Verificando pré-requisitos...
echo.

REM Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERRO: Node.js não encontrado!
    echo.
    echo Instale o Node.js em: https://nodejs.org/
    echo Depois execute este script novamente.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js encontrado: %NODE_VERSION%

REM Verificar pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠ pnpm não encontrado. Instalando...
    npm install -g pnpm
)

for /f "tokens=*" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
echo ✓ pnpm encontrado: %PNPM_VERSION%
echo.

REM ============================================================
REM CRIAR ARQUIVO .ENV
REM ============================================================

echo [PASSO 2] Configurando arquivo .env...
echo.

if not exist ".env" (
    echo Criando arquivo .env...
    (
        echo # The Odds API Configuration
        echo THE_ODDS_API_KEY=3a50d923ce7f50b649c36ced65029efd
        echo.
        echo # Database Configuration
        echo DATABASE_URL=mysql://root:@localhost:3306/sports_betting
        echo.
        echo # OAuth Configuration
        echo OAUTH_SERVER_URL=
        echo JWT_SECRET=local-dev-secret-key-change-in-production
        echo.
        echo # Analytics
        echo VITE_ANALYTICS_ENDPOINT=
        echo VITE_ANALYTICS_WEBSITE_ID=
        echo.
        echo # App Configuration
        echo VITE_APP_ID=sports-betting-robot
        echo VITE_APP_TITLE=Sports Betting Robot
        echo VITE_APP_LOGO=
        echo.
        echo # OAuth Portal
        echo VITE_OAUTH_PORTAL_URL=
        echo.
        echo # Owner Info
        echo OWNER_OPEN_ID=
        echo OWNER_NAME=
        echo.
        echo # Forge API
        echo BUILT_IN_FORGE_API_URL=
        echo BUILT_IN_FORGE_API_KEY=
        echo VITE_FRONTEND_FORGE_API_KEY=
        echo VITE_FRONTEND_FORGE_API_URL=
    ) > .env
    echo ✓ Arquivo .env criado com sucesso!
) else (
    echo ✓ Arquivo .env já existe
)
echo.

REM ============================================================
REM INSTALAR DEPENDÊNCIAS
REM ============================================================

echo [PASSO 3] Instalando dependências...
echo.

if not exist "node_modules" (
    echo Executando: pnpm install
    call pnpm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependências
        pause
        exit /b 1
    )
    echo ✓ Dependências instaladas com sucesso!
) else (
    echo ✓ Dependências já instaladas
)
echo.

REM ============================================================
REM VERIFICAR MYSQL
REM ============================================================

echo [PASSO 4] Verificando MySQL...
echo.

REM Tentar conectar ao MySQL
mysql -u root -e "SELECT 1" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MySQL está rodando
    
    REM Verificar se o banco existe
    mysql -u root -e "USE sports_betting" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✓ Banco de dados 'sports_betting' já existe
    ) else (
        echo Criando banco de dados 'sports_betting'...
        mysql -u root -e "CREATE DATABASE IF NOT EXISTS sports_betting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        if %errorlevel% equ 0 (
            echo ✓ Banco de dados criado com sucesso!
        ) else (
            echo ⚠ Aviso: Não foi possível criar o banco automaticamente
            echo Você pode criar manualmente no phpMyAdmin
        )
    )
) else (
    echo ⚠ AVISO: MySQL não está rodando!
    echo.
    echo Se você está usando XAMPP:
    echo   1. Abra o XAMPP Control Panel
    echo   2. Clique em "Start" ao lado de "MySQL"
    echo   3. Aguarde alguns segundos
    echo   4. Execute este script novamente
    echo.
    echo Se você tem MySQL instalado:
    echo   1. Inicie o serviço MySQL
    echo   2. Execute este script novamente
    echo.
    echo Continuando mesmo assim...
)
echo.

REM ============================================================
REM CONFIGURAR BANCO DE DADOS
REM ============================================================

echo [PASSO 5] Configurando banco de dados...
echo.

call pnpm db:push
if %errorlevel% neq 0 (
    echo ⚠ Aviso: Erro ao configurar banco de dados
    echo Você pode tentar manualmente depois com: pnpm db:push
)
echo.

REM ============================================================
REM INICIAR SERVIDOR
REM ============================================================

echo [PASSO 6] Iniciando servidor...
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                                                                  ║
echo ║              ✓ SETUP COMPLETO - INICIANDO SERVIDOR              ║
echo ║                                                                  ║
echo ║  Acesse: http://localhost:3000 no seu navegador                 ║
echo ║                                                                  ║
echo ║  Pressione Ctrl+C para parar o servidor                         ║
echo ║                                                                  ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

call pnpm dev
