$ErrorActionPreference = 'Stop'

Write-Host 'AURA local setup' -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker Desktop is required. Install it and run this script again.'
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker Engine is not running. Start Docker Desktop and rerun .\setup.ps1.'
}

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    Write-Host 'Created .env. Add Azure service-principal values before running Terraform.' -ForegroundColor Yellow
}

docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    throw 'AURA services did not start. Inspect with: docker compose logs -f'
}

$ollamaCommand = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollamaCommand) {
    throw 'Install Ollama on Windows, or set OLLAMA_BASE_URL=http://ollama:11434 and start with docker compose --profile ollama-local up -d.'
}

Write-Host 'Checking the Ollama service on this PC...'
$ollamaReady = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    try { Invoke-RestMethod -Uri 'http://localhost:11434/api/tags' -TimeoutSec 2 *> $null; $ollamaReady = $true; break } catch { Start-Sleep -Seconds 3 }
}
if (-not $ollamaReady) {
    throw 'Ollama is installed but its local service did not respond. Start Ollama and rerun .\setup.ps1.'
}

$model = 'llama3.2'
$modelSetting = Get-Content '.env' | Where-Object { $_ -match '^OLLAMA_MODEL=' } | Select-Object -First 1
if ($modelSetting) { $model = $modelSetting.Split('=', 2)[1].Trim() }
$installedModels = ollama list | Out-String
if ($installedModels -notmatch [regex]::Escape($model)) {
    Write-Host "Downloading $model into the local Ollama installation; this can take a few minutes." -ForegroundColor Yellow
    ollama pull $model
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Installed local model: $model" -ForegroundColor Green
    } else {
        Write-Host 'Model download failed. You can retry later with: ollama pull ' $model -ForegroundColor DarkYellow
    }
}

Write-Host ''
Write-Host 'AURA local services are starting:' -ForegroundColor Green
Write-Host '  Frontend:      http://localhost:3000'
Write-Host '  Backend docs:  http://localhost:8000/docs'
Write-Host '  ChromaDB:      http://localhost:8001'
Write-Host '  Prometheus:    http://localhost:9090'
Write-Host '  Grafana:       http://localhost:3001'
Write-Host '  Elasticsearch: http://localhost:9200'
Write-Host '  Kibana:        http://localhost:5601'
Write-Host ''
Write-Host 'Stop services with: docker compose down'
