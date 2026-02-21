@echo off
chcp 65001 > nul
color 0B
cls

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                                                                  ║
echo ║              📦 INSTALADOR XAMPP - SPORTS BETTING 📦             ║
echo ║                                                                  ║
echo ║     Este script vai baixar e instalar o XAMPP automaticamente    ║
echo ║                                                                  ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

REM ============================================================
REM VERIFICAR SE XAMPP JÁ ESTÁ INSTALADO
REM ============================================================

echo [VERIFICAÇÃO] Procurando por XAMPP instalado...
echo.

if exist "C:\xampp\mysql\bin\mysql.exe" (
    echo ✓ XAMPP já está instalado em: C:\xampp
    echo.
    echo Iniciando MySQL...
    cd /d "C:\xampp"
    call "C:\xampp\mysql_start.bat"
    echo.
    echo ✓ MySQL iniciado com sucesso!
    echo.
    pause
    exit /b 0
)

REM ============================================================
REM CRIAR PASTA DE DOWNLOAD
REM ============================================================

echo [PASSO 1] Preparando download...
echo.

set DOWNLOAD_DIR=%USERPROFILE%\Downloads
set XAMPP_INSTALLER=%DOWNLOAD_DIR%\xampp-windows-x64-installer.exe
set XAMPP_VERSION=8.2.12

if exist "%XAMPP_INSTALLER%" (
    echo ✓ Instalador XAMPP já foi baixado
) else (
    echo Baixando XAMPP %XAMPP_VERSION%...
    echo.
    
    REM Usar PowerShell para baixar o arquivo
    powershell -Command "& {
        $url = 'https://sourceforge.net/projects/xampp/files/XAMPP%%20Windows/8.2.12/xampp-windows-x64-8.2.12-0-VS16-installer.exe/download'
        $output = '%XAMPP_INSTALLER%'
        $ProgressPreference = 'SilentlyContinue'
        try {
            Invoke-WebRequest -Uri $url -OutFile $output
            Write-Host '✓ Download concluído com sucesso!'
        } catch {
            Write-Host '❌ Erro ao baixar: ' $_
            exit 1
        }
    }"
    
    if %errorlevel% neq 0 (
        echo.
        echo ❌ Erro ao baixar XAMPP
        echo.
        echo Você pode baixar manualmente em:
        echo https://www.apachefriends.org/download.html
        echo.
        echo Depois execute este script novamente
        pause
        exit /b 1
    )
)
echo.

REM ============================================================
REM INSTALAR XAMPP
REM ============================================================

echo [PASSO 2] Instalando XAMPP...
echo.
echo ⚠ Uma janela de instalação vai aparecer
echo ⚠ Clique em "Next" e aceite as opções padrão
echo ⚠ Deixe a pasta padrão: C:\xampp
echo.
pause

echo Iniciando instalador...
start /wait "%XAMPP_INSTALLER%" --mode unattended --installpath "C:\xampp"

if %errorlevel% neq 0 (
    echo.
    echo ⚠ A instalação pode ter sido interativa
    echo Verifique se o XAMPP foi instalado em C:\xampp
    echo.
)

REM ============================================================
REM VERIFICAR INSTALAÇÃO
REM ============================================================

echo.
echo [PASSO 3] Verificando instalação...
echo.

if exist "C:\xampp\mysql\bin\mysql.exe" (
    echo ✓ XAMPP instalado com sucesso!
    echo ✓ MySQL encontrado em: C:\xampp\mysql\bin\mysql.exe
) else (
    echo ❌ Erro: XAMPP não foi encontrado em C:\xampp
    echo.
    echo Verifique se a instalação foi bem-sucedida
    pause
    exit /b 1
)
echo.

REM ============================================================
REM INICIAR MYSQL
REM ============================================================

echo [PASSO 4] Iniciando MySQL...
echo.

cd /d "C:\xampp"

REM Verificar se o serviço MySQL já está rodando
tasklist | find /i "mysqld.exe" >nul
if %errorlevel% equ 0 (
    echo ✓ MySQL já está rodando
) else (
    echo Iniciando serviço MySQL...
    
    REM Tentar iniciar via batch script
    if exist "mysql_start.bat" (
        call mysql_start.bat
    ) else (
        REM Tentar iniciar o executável diretamente
        start "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini"
    )
    
    REM Aguardar MySQL iniciar
    timeout /t 3 /nobreak
    
    tasklist | find /i "mysqld.exe" >nul
    if %errorlevel% equ 0 (
        echo ✓ MySQL iniciado com sucesso!
    ) else (
        echo ⚠ Aviso: MySQL pode não ter iniciado
        echo Você pode iniciar manualmente via XAMPP Control Panel
    )
)
echo.

REM ============================================================
REM CRIAR BANCO DE DADOS
REM ============================================================

echo [PASSO 5] Criando banco de dados...
echo.

REM Aguardar um pouco para MySQL ficar pronto
timeout /t 2 /nobreak

REM Tentar criar o banco
"C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS sports_betting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul

if %errorlevel% equ 0 (
    echo ✓ Banco de dados 'sports_betting' criado com sucesso!
) else (
    echo ⚠ Aviso: Não foi possível criar o banco automaticamente
    echo Você pode criar manualmente no phpMyAdmin
)
echo.

REM ============================================================
REM CONCLUSÃO
REM ============================================================

echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                                                                  ║
echo ║                    ✓ XAMPP INSTALADO COM SUCESSO!               ║
echo ║                                                                  ║
echo ║  Próximos passos:                                               ║
echo ║                                                                  ║
echo ║  1. Abra a pasta do Sports Betting Robot                        ║
echo ║  2. Duplo clique em: setup.bat                                  ║
echo ║  3. Aguarde a instalação completa                               ║
echo ║  4. Acesse http://localhost:3000                                ║
echo ║                                                                  ║
echo ║  MySQL está rodando em: C:\xampp\mysql                          ║
echo ║  phpMyAdmin: http://localhost/phpmyadmin                        ║
echo ║                                                                  ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

pause
