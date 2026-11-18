@echo off
title Turing Machine Simulator
echo ========================================================
echo   Launching Turing Machine Simulator (Automata & TOC)
echo ========================================================
echo.
echo Starting local Vite preview server...
start http://localhost:4173
call node .\node_modules\vite\bin\vite.js preview --port 4173
pause
