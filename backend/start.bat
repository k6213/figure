@echo off
cd /d "%~dp0"
call venv\Scripts\activate
venv\Scripts\uvicorn.exe app.main:socket_app --reload --port 8000
