@echo off
title StudyDeck HCI Server
echo ========================================================
echo   Starting StudyDeck HCI Multimodal Flashcard Server
echo ========================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Python detected. Starting python server...
    start http://localhost:8000
    python server.py
    goto end
)

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Node.js detected. Starting node server...
    start http://localhost:8000
    node server.js
    goto end
)

echo [ERROR] Neither Python nor Node.js was found in PATH.
echo Please install Python 3 or Node.js to run the local server.
pause

:end

