@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================================
REM SPORTS BETTING ROBOT - INICIAR SERVIDOR
REM ============================================================

color 0A
cls

echo.
echo ============================================================
echo  SPORTS BETTING ROBOT - INICIANDO SERVIDOR
echo ============================================================
echo.

REM ============================================================
REM VERIFICAR DEPENDENCIAS
REM ============================================================

echo [VERIFICACAO] Checando dependencias...
echo.

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo ERRO: Dependencias nao encontradas!
    echo.
    echo Execute primeiro: install.bat
    echo.
    pause
    exit /b 1
)

echo OK - Dependencias encontradas
echo.

REM Verificar se arquivo .env existe
if not exist ".env" (
    echo AVISO: Arquivo .env nao encontrado!
    echo Criando com configuracoes padrao...
    (
        echo # The Odds API Configuration
        echo THE_ODDS_API_KEY=3a50d923ce7f50b649c36ced65029efd
        echo.
        echo # Database Configuration
        echo DATABASE_URL=mysql://root:@localhost:3306/sports_betting
        echo.
        echo # OAuth Configuration (opcional)
        echo OAUTH_SERVER_URL=
        echo JWT_SECRET=local-dev-secret-key-change-in-production
        echo.
        echo # Analytics (opcional)
        echo VITE_ANALYTICS_ENDPOINT=
        echo VITE_ANALYTICS_WEBSITE_ID=
        echo.
        echo # App Configuration
        echo VITE_APP_ID=sports-betting-robot
        echo VITE_APP_TITLE=Sports Betting Robot
        echo VITE_APP_LOGO=
        echo.
        echo # OAuth Portal (opcional)
        echo VITE_OAUTH_PORTAL_URL=
        echo.
        echo # Owner Info (opcional)
        echo OWNER_OPEN_ID=
        echo OWNER_NAME=
        echo.
        echo # Forge API (opcional)
        echo BUILT_IN_FORGE_API_URL=
        echo BUILT_IN_FORGE_API_KEY=
        echo VITE_FRONTEND_FORGE_API_KEY=
        echo VITE_FRONTEND_FORGE_API_URL=
    ) > .env
    echo OK - Arquivo .env criado
    echo.
)

echo OK - Arquivo .env encontrado
echo.

REM ============================================================
REM INICIAR SERVIDOR
REM ============================================================

echo [SERVIDOR] Iniciando servidor de desenvolvimento...
echo.
echo ============================================================
echo  SERVIDOR INICIANDO
echo ============================================================
echo.
echo Acesse: http://localhost:3000 no seu navegador
echo.
echo Aguarde 15-30 segundos para o servidor estar pronto
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

REM Abrir navegador
start http://localhost:3000

REM Aguardar um pouco
timeout /t 2 /nobreak

REM Iniciar servidor
call pnpm dev
