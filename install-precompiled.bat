@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM INVESTBET - INSTALADOR VERSAO PRE-COMPILADA
REM ============================================================

color 0A
cls

echo.
echo ============================================================
echo  INVESTBET - INSTALADOR PRE-COMPILADO
echo ============================================================
echo.
echo Esta versao nao precisa compilar - muito mais rapida!
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
    echo Por favor, instale em: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo OK - Node.js encontrado: %NODE_VERSION%
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
        echo OK - Arquivo .env criado com sucesso!
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

echo [FASE 3] Instalando dependencias...
echo.

if not exist "node_modules" (
    echo Instalando dependencias (pode levar 1-2 minutos)...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao instalar dependencias
        pause
        exit /b 1
    )
    echo OK - Dependencias instaladas com sucesso!
) else (
    echo OK - Dependencias ja instaladas
)
echo.

REM ============================================================
REM FASE 4: INICIAR SERVIDOR PRE-COMPILADO
REM ============================================================

echo [FASE 4] Iniciando servidor...
echo.
echo ============================================================
echo  INSTALACAO CONCLUIDA COM SUCESSO!
echo ============================================================
echo.
echo O servidor sera iniciado em: http://localhost:3000
echo.
echo Aguarde 5-10 segundos para o servidor iniciar...
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

REM Iniciar servidor em background e abrir navegador
start http://localhost:3000

REM Aguardar um pouco para o servidor iniciar
timeout /t 3 /nobreak

REM Iniciar servidor pré-compilado
call node dist/index.js
