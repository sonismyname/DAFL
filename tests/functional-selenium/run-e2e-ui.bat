@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo    DAFL E2E VISUAL TEST RUNNER (UI CHROME MODE)
echo =======================================================

set "MAVEN_CMD=%~dp0.tools\apache-maven\bin\mvn.cmd"
if not exist "%MAVEN_CMD%" (
    echo [ERROR] Khong tim thay Maven tai: %MAVEN_CMD%
    pause
    exit /b 1
)

set "TARGET_TEST="

:parse_args
if "%~1"=="" goto run_tests
if /i "%~1"=="--t" (
    set "TARGET_TEST=%~2"
    shift
    shift
    goto parse_args
)
if /i "%~1"=="-t" (
    set "TARGET_TEST=%~2"
    shift
    shift
    goto parse_args
)
if not "%~1"=="" (
    set "TARGET_TEST=%~1"
    shift
    goto parse_args
)

:run_tests
if not "%TARGET_TEST%"=="" (
    echo [INFO] Che do chay don le: %TARGET_TEST%
    echo [INFO] Lenh thuc thi: mvn test -Dtest=%TARGET_TEST%
    echo =======================================================
    "%MAVEN_CMD%" test "-Dtest=%TARGET_TEST%" "-DsuiteXmlFile=" "-Dheadless=false" "-Dapp.url=http://localhost:3000"
) else (
    echo [INFO] Che do chay toan bo Test Suite (testng.xml)
    echo =======================================================
    "%MAVEN_CMD%" test "-Dheadless=false" "-Dapp.url=http://localhost:3000"
)

echo.
echo [DONE] Hoan tat kiem thu E2E!
pause
