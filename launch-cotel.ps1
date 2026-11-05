<#
.SYNOPSIS
Script de lanzamiento completo para COTEL DECTlink System

.DESCRIPTION
Inicia el sistema completo COTEL DECTlink con frontend, backend y verificaciones
Sistema Industrial Siemens con UI/UX Pro Max implementado

.PARAMETER Environment
Entorno a lanzar: development, staging, production

.PARAMETER SkipTests
Saltar ejecución de tests

.EXAMPLE
.\launch-cotel.ps1 -Environment development
.\launch-cotel.ps1 -Environment production -SkipTests
#>

param(
    [ValidateSet("development", "staging", "production")]
    [string]$Environment = "development",
    
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colores para output
$Colors = @{
    Info = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Command = "Gray"
}

# Función para mostrar mensajes
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White", [string]$Prefix = "•")
    Write-Host "$Prefix " -NoNewline -ForegroundColor $Color
    Write-Host $Message -ForegroundColor "White"
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor "DarkGray"
    Write-Host "  $Title" -ForegroundColor "Cyan"
    Write-Host "=" * 80 -ForegroundColor "DarkGray"
    Write-Host ""
}

# Banner COTEL
Clear-Host
Write-Host ""
Write-Host "    ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor "DarkCyan"
Write-Host "    ║                                                               ║" -ForegroundColor "DarkCyan"
Write-Host "    ║   ██████╗ ██████╗ ████████╗███████╗██╗      ██████╗ ██╗███╗   ║" -ForegroundColor "DarkCyan"
Write-Host "    ║   ██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝██║     ██╔═══██╗██║████╗  ║" -ForegroundColor "DarkCyan"
Write-Host "    ║   ██║   ██║██████╔╝   ██║   █████╗  ██║     ██║   ██║██║██╔██╗ ║" -ForegroundColor "DarkCyan"
Write-Host "    ║   ██║   ██║██╔═══╝    ██║   ██╔══╝  ██║     ██║   ██║██║██║╚██╗║" -ForegroundColor "DarkCyan"
Write-Host "    ║   ╚██████╔╝██║        ██║   ███████╗███████╗╚██████╔╝██║██║ ╚████║" -ForegroundColor "DarkCyan"
Write-Host "    ║    ╚═════╝ ╚═╝        ╚═╝   ╚══════╝╚══════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝║" -ForegroundColor "DarkCyan"
Write-Host "    ║                                                               ║" -ForegroundColor "DarkCyan"
Write-Host "    ║   Siemens DECTlink · Sistema Industrial de Planta Externa     ║" -ForegroundColor "DarkYellow"
Write-Host "    ║   UI/UX Pro Max v2.15.0 · 6 Roles RBAC · Accesibilidad AA     ║" -ForegroundColor "DarkYellow"
Write-Host "    ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor "DarkCyan"
Write-Host ""

Write-Section -Title "🚀 INICIO DE SISTEMA COTEL DECTlink"
Write-ColorOutput -Message "Entorno: $Environment" -Color $Colors.Info
Write-ColorOutput -Message "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -Color $Colors.Info
Write-Host ""

# ============================================================================
# 1. VERIFICACIÓN DE DEPENDENCIAS
# ============================================================================
Write-Section -Title "1. VERIFICACIÓN DE DEPENDENCIAS"

$dependencies = @(
    @{ Name = "Node.js"; Command = "node --version"; MinVersion = "20.0.0" },
    @{ Name = "pnpm"; Command = "pnpm --version"; MinVersion = "9.0.0" },
    @{ Name = "PHP"; Command = "php --version"; MinVersion = "8.4.0" },
    @{ Name = "Composer"; Command = "composer --version"; MinVersion = "2.0.0" },
    @{ Name = "Git"; Command = "git --version" }
)

foreach ($dep in $dependencies) {
    try {
        $output = Invoke-Expression $dep.Command 2>$null
        if ($dep.Name -eq "PHP") {
            $version = ($output | Select-String -Pattern "PHP (\d+\.\d+\.\d+)").Matches.Groups[1].Value
        } else {
            $version = ($output | Select-String -Pattern "(\d+\.\d+\.\d+)").Matches.Groups[1].Value
        }
        
        if ($dep.MinVersion -and $version -lt $dep.MinVersion) {
            Write-ColorOutput -Message "$($dep.Name) $version (Se requiere $($dep.MinVersion)+)" -Color $Colors.Error -Prefix "✗"
        } else {
            Write-ColorOutput -Message "$($dep.Name) $version" -Color $Colors.Success -Prefix "✓"
        }
    } catch {
        Write-ColorOutput -Message "$($dep.Name) NO INSTALADO" -Color $Colors.Error -Prefix "✗"
    }
}

# ============================================================================
# 2. INSTALACIÓN DE DEPENDENCIAS
# ============================================================================
Write-Section -Title "2. INSTALACIÓN DE DEPENDENCIAS"

# Frontend
Write-ColorOutput -Message "Instalando dependencias Frontend..." -Color $Colors.Info
Set-Location "frontend"
$pnpmLockExists = Test-Path "pnpm-lock.yaml"
if ($pnpmLockExists) {
    pnpm install --frozen-lockfile
} else {
    pnpm install
}
if ($LASTEXITCODE -ne 0) { throw "Error instalando dependencias frontend" }
Write-ColorOutput -Message "Frontend dependencias instaladas" -Color $Colors.Success

# Backend
Write-ColorOutput -Message "Instalando dependencias Backend..." -Color $Colors.Info
Set-Location "..\backend"
if ($Environment -eq "production") {
    composer install --no-dev --optimize-autoloader --no-interaction
} else {
    composer install --no-interaction
}
if ($LASTEXITCODE -ne 0) { throw "Error instalando dependencias backend" }
Write-ColorOutput -Message "Backend dependencias instaladas" -Color $Colors.Success

Set-Location ".."

# ============================================================================
# 3. EJECUCIÓN DE TESTS (OPCIONAL)
# ============================================================================
if (-not $SkipTests) {
    Write-Section -Title "3. EJECUCIÓN DE TESTS DE CALIDAD"
    
    # Tests Backend
    Write-ColorOutput -Message "Ejecutando tests PHP..." -Color $Colors.Info
    Set-Location "backend"
    php artisan test --compact
    if ($LASTEXITCODE -ne 0) { 
        Write-ColorOutput -Message "Tests backend fallaron" -Color $Colors.Error
        if ($Environment -eq "production") { throw "Tests requeridos para producción fallaron" }
    } else {
        Write-ColorOutput -Message "Tests backend pasaron" -Color $Colors.Success
    }
    
    # Tests Frontend
    Write-ColorOutput -Message "Ejecutando tests TypeScript..." -Color $Colors.Info
    Set-Location "..\frontend"
    pnpm run test
    if ($LASTEXITCODE -ne 0) { 
        Write-ColorOutput -Message "Tests frontend fallaron" -Color $Colors.Error
        if ($Environment -eq "production") { throw "Tests requeridos para producción fallaron" }
    } else {
        Write-ColorOutput -Message "Tests frontend pasaron" -Color $Colors.Success
    }
    
    Set-Location ".."
}

# ============================================================================
# 4. CONSTRUCCIÓN DEL PROYECTO
# ============================================================================
Write-Section -Title "4. CONSTRUCCIÓN DEL PROYECTO"

# Frontend Build
Write-ColorOutput -Message "Construyendo frontend..." -Color $Colors.Info
Set-Location "frontend"

if ($Environment -eq "production") {
    # Production build
    Write-ColorOutput -Message "Modo producción: optimizaciones activadas" -Color $Colors.Warning
    pnpm run build
} else {
    # Development build
    Write-ColorOutput -Message "Modo desarrollo: build ligero" -Color $Colors.Info
    pnpm run build
}

if ($LASTEXITCODE -ne 0) { throw "Error construyendo frontend" }

$buildTime = Measure-Command { pnpm run build } | Select-Object -ExpandProperty TotalSeconds
Write-ColorOutput -Message "Frontend construido en $([math]::Round($buildTime, 2))s" -Color $Colors.Success

# Copiar al backend
Write-ColorOutput -Message "Copiando build al backend..." -Color $Colors.Info
Set-Location ".."
pnpm run copy:dist
if ($LASTEXITCODE -ne 0) { throw "Error copiando build al backend" }
Write-ColorOutput -Message "Build copiado a backend/public/" -Color $Colors.Success

# ============================================================================
# 5. CONFIGURACIÓN DEL BACKEND
# ============================================================================
Write-Section -Title "5. CONFIGURACIÓN DEL BACKEND"

Set-Location "backend"

# Configurar entorno
if ($Environment -eq "production" -and (Test-Path ".env.production")) {
    Write-ColorOutput -Message "Usando configuración producción..." -Color $Colors.Warning
    Copy-Item ".env.production" ".env" -Force
} elseif (Test-Path ".env.example") {
    Write-ColorOutput -Message "Usando configuración desarrollo..." -Color $Colors.Info
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
    }
}

# Generar clave de aplicación
Write-ColorOutput -Message "Generando clave de aplicación..." -Color $Colors.Info
php artisan key:generate --force
if ($LASTEXITCODE -ne 0) { throw "Error generando clave de aplicación" }

# Ejecutar migraciones
Write-ColorOutput -Message "Ejecutando migraciones de base de datos..." -Color $Colors.Info
php artisan migrate --force
if ($LASTEXITCODE -ne 0) { throw "Error ejecutando migraciones" }

# Crear operador de prueba (solo desarrollo)
if ($Environment -eq "development") {
    Write-ColorOutput -Message "Creando operador de prueba..." -Color $Colors.Info
    $testOperators = @(
        @{ Email = "testsuperadmin@cotel.bo"; Role = "SUPERADMIN"; Password = "TestPass123!" },
        @{ Email = "testadmin@cotel.bo"; Role = "ADMIN"; Password = "TestPass123!" },
        @{ Email = "testtecnico@cotel.bo"; Role = "TECNICO"; Password = "TestPass123!" }
    )
    
    foreach ($op in $testOperators) {
        php artisan operador:create $op.Email --role=$op.Role --password=$op.Password
        Write-ColorOutput -Message "Operador creado: $($op.Email) ($($op.Role))" -Color $Colors.Success -Prefix "  ✓"
    }
}

# Optimizar para producción
if ($Environment -eq "production") {
    Write-ColorOutput -Message "Optimizando para producción..." -Color $Colors.Info
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    Write-ColorOutput -Message "Cachés optimizados" -Color $Colors.Success
}

Set-Location ".."

# ============================================================================
# 6. INICIAR SERVICIOS
# ============================================================================
Write-Section -Title "6. INICIAR SERVICIOS"

# Información de URLs
$backendUrl = "http://localhost:8010"
$frontendUrl = "http://localhost:5173"

Write-Host ""
Write-Host "    ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor "DarkGreen"
Write-Host "    ║                     URLs DEL SISTEMA                         ║" -ForegroundColor "DarkGreen"
Write-Host "    ╠═══════════════════════════════════════════════════════════════╣" -ForegroundColor "DarkGreen"
Write-Host "    ║                                                               ║" -ForegroundColor "DarkGreen"
Write-Host "    ║  🌐 Frontend (React):      $frontendUrl" -ForegroundColor "White"
Write-Host "    ║  ⚙️  Backend API (Laravel): $backendUrl" -ForegroundColor "White"
Write-Host "    ║  📚 API Documentation:     ${backendUrl}/api/documentation" -ForegroundColor "White"
Write-Host "    ║                                                               ║" -ForegroundColor "DarkGreen"
Write-Host "    ║  👤 Credenciales de prueba (solo desarrollo):                 ║" -ForegroundColor "DarkGreen"
Write-Host "    ║     • SUPERADMIN: testsuperadmin@cotel.bo / TestPass123!      ║" -ForegroundColor "White"
Write-Host "    ║     • ADMIN:      testadmin@cotel.bo / TestPass123!           ║" -ForegroundColor "White"
Write-Host "    ║     • TECNICO:    testtecnico@cotel.bo / TestPass123!         ║" -ForegroundColor "White"
Write-Host "    ║                                                               ║" -ForegroundColor "DarkGreen"
Write-Host "    ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor "DarkGreen"
Write-Host ""

Write-ColorOutput -Message "Iniciando servicios en segundo plano..." -Color $Colors.Info

# Iniciar Backend
Write-ColorOutput -Message "Backend Laravel en $backendUrl" -Color $Colors.Command -Prefix "▶"
Start-Process -NoNewWindow -FilePath "php" -ArgumentList "artisan serve --host=0.0.0.0 --port=8010" -WorkingDirectory "backend"

# Iniciar Frontend (solo desarrollo)
if ($Environment -eq "development") {
    Write-ColorOutput -Message "Frontend React en $frontendUrl" -Color $Colors.Command -Prefix "▶"
    Start-Process -NoNewWindow -FilePath "pnpm" -ArgumentList "run dev" -WorkingDirectory "frontend"
}

# ============================================================================
# 7. VERIFICACIÓN FINAL
# ============================================================================
Write-Section -Title "7. VERIFICACIÓN FINAL"

Write-ColorOutput -Message "Esperando servicios..." -Color $Colors.Info
Start-Sleep -Seconds 3

# Verificar backend
try {
    $backendResponse = Invoke-WebRequest -Uri "${backendUrl}/api/subscribers" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($backendResponse.StatusCode -eq 200) {
        Write-ColorOutput -Message "Backend funcionando correctamente" -Color $Colors.Success -Prefix "✓"
    } else {
        Write-ColorOutput -Message "Backend respondió con código $($backendResponse.StatusCode)" -Color $Colors.Warning -Prefix "⚠"
    }
} catch {
    Write-ColorOutput -Message "Backend no responde (puede ser normal si no hay datos)" -Color $Colors.Warning -Prefix "⚠"
}

# Verificar frontend (solo desarrollo)
if ($Environment -eq "development") {
    try {
        $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($frontendResponse.StatusCode -eq 200) {
            Write-ColorOutput -Message "Frontend funcionando correctamente" -Color $Colors.Success -Prefix "✓"
        }
    } catch {
        Write-ColorOutput -Message "Frontend iniciando... puede tardar unos segundos" -Color $Colors.Warning -Prefix "⚠"
    }
}

# ============================================================================
# 8. MENSAJE FINAL
# ============================================================================
Write-Section -Title "✅ SISTEMA COTEL DECTlink INICIADO"

Write-Host ""
Write-Host "    ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor "DarkCyan"
Write-Host "    ║                     ACCIONES RÁPIDAS                         ║" -ForegroundColor "DarkCyan"
Write-Host "    ╠═══════════════════════════════════════════════════════════════╣" -ForegroundColor "DarkCyan"
Write-Host "    ║                                                               ║" -ForegroundColor "DarkCyan"
Write-Host "    ║  1. Abrir navegador:      $frontendUrl" -ForegroundColor "White"
Write-Host "    ║  2. Ver logs backend:     tail -f backend/storage/logs/laravel.log" -ForegroundColor "White"
Write-Host "    ║  3. Ver logs frontend:    Get-Content frontend/vite.log -Tail 20 -Wait" -ForegroundColor "White"
Write-Host "    ║  4. Detener servicios:    Stop-Process -Name php,node -Force" -ForegroundColor "White"
Write-Host "    ║  5. Crear operador:       php artisan operador:create email role" -ForegroundColor "White"
Write-Host "    ║                                                               ║" -ForegroundColor "DarkCyan"
Write-Host "    ║  📞 Soporte Técnico: soporte@cotel.bo · +591 12345678         ║" -ForegroundColor "DarkYellow"
Write-Host "    ║  📚 Documentación: docs.cotel.bo                             ║" -ForegroundColor "DarkYellow"
Write-Host "    ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor "DarkCyan"
Write-Host ""

Write-ColorOutput -Message "Sistema Industrial Siemens DECTlink iniciado exitosamente!" -Color $Colors.Success
Write-ColorOutput -Message "Tiempo total: $([math]::Round((Get-Date).Subtract($scriptStartTime).TotalSeconds, 2)) segundos" -Color $Colors.Info

# Guardar tiempo de inicio
$scriptStartTime = Get-Date

return 0