@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Proje dizinine gidiliyor...
echo.
echo Cache temizleniyor...
if exist .next (
    echo .next klasoru siliniyor...
    rmdir /s /q .next
    echo Cache temizlendi.
) else (
    echo .next klasoru bulunamadi, cache zaten temiz.
)
echo.
echo Sunucu baslatiliyor...
echo Tarayicida http://localhost:3000 adresine gidin
echo.
echo Sunucuyu durdurmak icin Ctrl+C tuslarina basin
echo.
npm run dev
pause
