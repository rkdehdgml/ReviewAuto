@echo off
setlocal

cd /d "%~dp0"

if not exist node_modules (
  echo [ReviewAuto] 처음 실행이네요. 의존성을 설치합니다...
  call npm install
  if errorlevel 1 (
    echo [ReviewAuto] npm install 실패. 로그를 확인해주세요.
    pause
    exit /b 1
  )
)

echo [ReviewAuto] 서버를 시작합니다... (창을 닫으면 서버도 함께 종료됩니다)
start "" http://localhost:3000

call npm run dev

echo.
echo [ReviewAuto] 서버가 종료되었습니다.
pause
