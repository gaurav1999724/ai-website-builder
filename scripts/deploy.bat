@echo off
REM AI Website Builder - Deployment Script for Windows
REM This script handles the complete deployment process

setlocal enabledelayedexpansion

REM Colors (Windows doesn't support colors in batch, but we can use echo)
set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

REM Function to print status
:print_status
echo %INFO% %~1
goto :eof

:print_success
echo %SUCCESS% %~1
goto :eof

:print_warning
echo %WARNING% %~1
goto :eof

:print_error
echo %ERROR% %~1
goto :eof

REM Function to check if command exists
:command_exists
where %1 >nul 2>&1
if %errorlevel% equ 0 (
    exit /b 0
) else (
    exit /b 1
)

REM Function to check prerequisites
:check_prerequisites
call :print_status "Checking prerequisites..."

call :command_exists node
if %errorlevel% neq 0 (
    call :print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit /b 1
)

call :command_exists npm
if %errorlevel% neq 0 (
    call :print_error "npm is not installed. Please install npm first."
    exit /b 1
)

REM Check Node.js version (simplified check)
node --version >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Node.js is not working properly."
    exit /b 1
)

call :print_success "Prerequisites check passed"
goto :eof

REM Function to install dependencies
:install_dependencies
call :print_status "Installing dependencies..."

if exist package-lock.json (
    npm ci
) else (
    npm install
)

if %errorlevel% neq 0 (
    call :print_error "Failed to install dependencies"
    exit /b 1
)

call :print_success "Dependencies installed successfully"
goto :eof

REM Function to setup environment
:setup_environment
call :print_status "Setting up environment..."

if not exist .env (
    if exist .env.example (
        call :print_warning ".env file not found. Copying from .env.example..."
        copy .env.example .env
        call :print_warning "Please update .env file with your actual values before deployment!"
    ) else (
        call :print_error ".env file not found and no .env.example available"
        exit /b 1
    )
)

call :print_success "Environment setup completed"
goto :eof

REM Function to setup database
:setup_database
call :print_status "Setting up database..."

REM Generate Prisma client
npm run db:generate
if %errorlevel% neq 0 (
    call :print_error "Failed to generate Prisma client"
    exit /b 1
)

REM Push database schema
npm run db:push
if %errorlevel% neq 0 (
    call :print_error "Failed to push database schema"
    exit /b 1
)

call :print_success "Database setup completed"
goto :eof

REM Function to run seeds
:run_seeds
call :print_status "Running database seeds..."

REM Run the comprehensive deployment seed
npm run seed
if %errorlevel% neq 0 (
    call :print_error "Failed to run database seeds"
    exit /b 1
)

call :print_success "Database seeds completed"
goto :eof

REM Function to build the application
:build_application
call :print_status "Building application..."

npm run build
if %errorlevel% neq 0 (
    call :print_error "Failed to build application"
    exit /b 1
)

call :print_success "Application built successfully"
goto :eof

REM Function to start the application
:start_application
call :print_status "Starting application..."

npm start
goto :eof

REM Function to run tests
:run_tests
call :print_status "Running tests..."

REM Run linting
npm run lint
if %errorlevel% neq 0 (
    call :print_error "Linting failed"
    exit /b 1
)

REM Run any other tests if they exist
findstr /C:"\"test\"" package.json >nul 2>&1
if %errorlevel% equ 0 (
    npm test
    if %errorlevel% neq 0 (
        call :print_error "Tests failed"
        exit /b 1
    )
)

call :print_success "Tests completed successfully"
goto :eof

REM Function to show deployment info
:show_deployment_info
call :print_success "Deployment completed successfully!"
echo.
echo 🎯 NEXT STEPS:
echo 1. Your application is ready for production!
echo 2. Admin user has been created/verified
echo 3. AI prompts have been seeded
echo 4. Database is set up and ready
echo.
echo 🔐 ADMIN ACCESS:
echo    Email: %ADMIN_EMAIL%
if "%ADMIN_EMAIL%"=="" echo    Email: admin@example.com
echo    Password: %ADMIN_PASSWORD%
if "%ADMIN_PASSWORD%"=="" echo    Password: admin123
echo.
echo 🌐 ACCESS URLS:
echo    - Main App: /
echo    - Admin Dashboard: /admin
echo    - Logs Management: /admin/logs
echo.
echo 📊 MONITORING:
echo    - Check logs: npm run logs
echo    - View admin panel: /admin
echo    - Monitor system: /admin/logs
goto :eof

REM Main deployment function
:deploy
set "mode=%~1"
if "%mode%"=="" set "mode=full"

call :print_status "Starting AI Website Builder deployment (mode: %mode%)..."
echo.

if "%mode%"=="full" (
    call :check_prerequisites
    if %errorlevel% neq 0 exit /b 1
    call :install_dependencies
    if %errorlevel% neq 0 exit /b 1
    call :setup_environment
    if %errorlevel% neq 0 exit /b 1
    call :setup_database
    if %errorlevel% neq 0 exit /b 1
    call :run_seeds
    if %errorlevel% neq 0 exit /b 1
    call :build_application
    if %errorlevel% neq 0 exit /b 1
    call :show_deployment_info
) else if "%mode%"=="quick" (
    call :check_prerequisites
    if %errorlevel% neq 0 exit /b 1
    call :install_dependencies
    if %errorlevel% neq 0 exit /b 1
    call :setup_database
    if %errorlevel% neq 0 exit /b 1
    call :run_seeds
    if %errorlevel% neq 0 exit /b 1
    call :build_application
    if %errorlevel% neq 0 exit /b 1
    call :show_deployment_info
) else if "%mode%"=="seed-only" (
    call :check_prerequisites
    if %errorlevel% neq 0 exit /b 1
    call :run_seeds
    if %errorlevel% neq 0 exit /b 1
) else if "%mode%"=="build-only" (
    call :check_prerequisites
    if %errorlevel% neq 0 exit /b 1
    call :install_dependencies
    if %errorlevel% neq 0 exit /b 1
    call :build_application
    if %errorlevel% neq 0 exit /b 1
) else if "%mode%"=="start" (
    call :start_application
) else if "%mode%"=="test" (
    call :check_prerequisites
    if %errorlevel% neq 0 exit /b 1
    call :install_dependencies
    if %errorlevel% neq 0 exit /b 1
    call :run_tests
    if %errorlevel% neq 0 exit /b 1
) else (
    call :print_error "Unknown deployment mode: %mode%"
    echo.
    echo Available modes:
    echo   full       - Complete deployment (default)
    echo   quick      - Quick deployment (skip env setup)
    echo   seed-only  - Run seeds only
    echo   build-only - Build application only
    echo   start      - Start application only
    echo   test       - Run tests only
    echo.
    echo Usage: %0 [mode]
    exit /b 1
)

goto :eof

REM Main execution
if "%~1"=="" (
    call :deploy "full"
) else (
    call :deploy "%~1"
)
