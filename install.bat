@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM SPORTS BETTING ROBOT - INSTALADOR COMPLETO E UNIFICADO
REM ============================================================

color 0A
cls

echo.
echo ============================================================
echo  SPORTS BETTING ROBOT - INSTALADOR COMPLETO
echo ============================================================
echo.

REM ============================================================
REM FASE 1: VERIFICACAO DE PRE-REQUISITOS
REM ============================================================

echo [FASE 1] Verificando pre-requisitos...
echo.

REM Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo.
    echo Por favor, instale o Node.js 18+ em: https://nodejs.org/
    echo Depois execute este script novamente.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo OK - Node.js encontrado: %NODE_VERSION%

REM Verificar se a versao do Node.js eh 18+
for /f "tokens=1,2,3 delims=." %%a in ("%NODE_VERSION:v=%") do (
    set NODE_MAJOR=%%a
)

if %NODE_MAJOR% lss 18 (
    echo ERRO: Node.js versao 18+ eh obrigatorio!
    echo Versao encontrada: %NODE_VERSION%
    echo.
    echo Por favor, instale o Node.js 18+ em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo.

REM Verificar pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo Instalando pnpm globalmente...
    call npm install -g pnpm
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao instalar pnpm
        echo.
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
echo OK - pnpm encontrado: %PNPM_VERSION%
echo.

REM ============================================================
REM FASE 2: CRIAR ARQUIVO .ENV
REM ============================================================

echo [FASE 2] Configurando arquivo .env...
echo.

if not exist ".env" (
    if exist ".env.template" (
        echo Copiando .env.template para .env...
        copy .env.template .env >nul
        if %errorlevel% equ 0 (
            echo OK - Arquivo .env criado com sucesso!
        ) else (
            echo ERRO: Falha ao copiar .env.template
            echo.
            echo Criando .env manualmente...
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
            echo OK - Arquivo .env criado manualmente!
        )
    ) else (
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
        echo OK - Arquivo .env criado com sucesso!
    )
) else (
    echo OK - Arquivo .env ja existe
)
echo.

REM ============================================================
REM FASE 3: INSTALAR DEPENDENCIAS
REM ============================================================

echo [FASE 3] Instalando dependencias do projeto...
echo.
echo Isso pode levar 2-5 minutos. Por favor, aguarde...
echo.

if not exist "node_modules" (
    call pnpm install
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao instalar dependencias
        echo.
        echo Tente executar manualmente:
        echo   pnpm install
        echo.
        pause
        exit /b 1
    )
    echo OK - Dependencias instaladas com sucesso!
) else (
    echo OK - Dependencias ja instaladas
    echo.
    echo Atualizando dependencias...
    call pnpm install
    if %errorlevel% neq 0 (
        echo AVISO: Erro ao atualizar dependencias
        echo Continuando com versao existente...
    )
)
echo.

REM ============================================================
REM FASE 4: VERIFICAR MYSQL
REM ============================================================

echo [FASE 4] Verificando MySQL/Banco de Dados...
echo.

REM Tentar conectar ao MySQL
mysql -u root -e "SELECT 1" >nul 2>&1
if %errorlevel% equ 0 (
    echo OK - MySQL esta rodando
    
    REM Verificar se o banco existe
    mysql -u root -e "USE sports_betting" >nul 2>&1
    if %errorlevel% equ 0 (
        echo OK - Banco de dados 'sports_betting' ja existe
    ) else (
        echo Criando banco de dados 'sports_betting'...
        mysql -u root -e "CREATE DATABASE IF NOT EXISTS sports_betting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        if %errorlevel% equ 0 (
            echo OK - Banco de dados criado com sucesso!
        ) else (
            echo AVISO: Nao foi possivel criar o banco automaticamente
            echo Voce pode criar manualmente no phpMyAdmin
        )
    )
) else (
    echo AVISO: MySQL nao esta rodando!
    echo.
    echo Se voce esta usando XAMPP:
    echo   1. Abra o XAMPP Control Panel
    echo   2. Clique em "Start" ao lado de "MySQL"
    echo   3. Aguarde alguns segundos
    echo   4. Execute este script novamente
    echo.
    echo Se voce tem MySQL instalado:
    echo   1. Inicie o servico MySQL
    echo   2. Execute este script novamente
    echo.
    echo Continuando mesmo assim...
)
echo.

REM ============================================================
REM FASE 5: CONFIGURAR BANCO DE DADOS
REM ============================================================

echo [FASE 5] Configurando banco de dados...
echo.

call pnpm db:push
if %errorlevel% neq 0 (
    echo AVISO: Erro ao configurar banco de dados
    echo.
    echo Voce pode tentar manualmente depois com:
    echo   pnpm db:push
    echo.
    echo Continuando mesmo assim...
)
echo.

REM ============================================================
REM FASE 6: INICIAR SERVIDOR
REM ============================================================

echo [FASE 6] Iniciando servidor...
echo.
echo ============================================================
echo  INSTALACAO CONCLUIDA COM SUCESSO!
echo ============================================================
echo.
echo O servidor sera iniciado em: http://localhost:3000
echo.
echo Aguarde 15-30 segundos para o servidor iniciar...
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

REM Iniciar servidor em background e abrir navegador
start http://localhost:3000

REM Aguardar um pouco para o servidor iniciar
timeout /t 3 /nobreak

REM Iniciar servidor de desenvolvimento
call pnpm dev
