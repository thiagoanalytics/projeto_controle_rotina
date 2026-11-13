
@echo off
title Ops Control Center

cd /d "%~dp0"

echo ========================================
echo       OPS CONTROL CENTER
echo ========================================
echo.

if not exist ".venv\Scripts\python.exe" (
    echo Ambiente virtual nao encontrado.
    echo Criando ambiente virtual...
    python -m venv .venv
)

echo.
echo Ativando ambiente virtual...
call .venv\Scripts\activate.bat

echo.
echo Verificando dependencias...
python -m pip install -r requirements.txt

echo.
echo Iniciando aplicacao...
echo.

start "" http://127.0.0.1:8000

python -m uvicorn app:app --host 127.0.0.1 --port 8000

echo.
echo Aplicacao encerrada.
pause
