@echo off
title Forza Horizon UZ - 3D Poyga O'yini
echo =========================================================================
echo               FORZA HORIZON: UZBEKISTAN 3D POYGA O'YINI
echo =========================================================================
echo.
echo O'yin brauzerda yuklanmoqda: http://localhost:8080
echo Iltimos, ushbu qora oynani yopmang (u o'yin serveri sifatida ishlaydi).
echo.
start "" "http://localhost:8080"
python -m http.server 8080
pause
