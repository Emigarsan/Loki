param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$repoRoot = "d:\Usuarios\Emilio\Documentos\GitHub\Loki"
$frontendDir = Join-Path $repoRoot "frontend"
$backendDir = Join-Path $repoRoot "backend"

if (-not (Test-Path $frontendDir)) {
    throw "No se encontro la carpeta frontend en $frontendDir"
}

if (-not (Test-Path $backendDir)) {
    throw "No se encontro la carpeta backend en $backendDir"
}

if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
    throw "No se encontro 'mvn' en PATH. Instala Java/Maven o abre una consola con mvn disponible."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "No se encontro 'npm' en PATH. Instala Node.js o abre una consola con npm disponible."
}

if (-not $SkipInstall) {
    Write-Host "Instalando dependencias del frontend..."
    Push-Location $frontendDir
    try {
        npm install
    }
    finally {
        Pop-Location
    }
}

Write-Host "Arrancando backend (Spring Boot)..."
Start-Process -FilePath "powershell" -WorkingDirectory $backendDir -ArgumentList @(
    "-NoExit",
    "-Command",
    "mvn spring-boot:run"
)

Write-Host "Arrancando frontend (Vite)..."
Start-Process -FilePath "powershell" -WorkingDirectory $frontendDir -ArgumentList @(
    "-NoExit",
    "-Command",
    "npm run dev"
)

Write-Host "Listo. Backend en http://localhost:8080 y frontend en http://localhost:5173"
Write-Host "Usa -SkipInstall si no quieres ejecutar npm install."
