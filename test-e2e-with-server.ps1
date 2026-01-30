# PowerShell script to run E2E tests with automatic server management
# Usage: .\test-e2e-with-server.ps1

Write-Host "🧪 10xFacts E2E Test Runner" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if port 4321 is in use
Write-Host "🔍 Checking if port 4321 is available..." -ForegroundColor Yellow
$portCheck = netstat -ano | Select-String ":4321"

if ($portCheck) {
    Write-Host "⚠️  Port 4321 is already in use:" -ForegroundColor Yellow
    Write-Host $portCheck
    Write-Host ""
    $continue = Read-Host "Do you want to continue anyway? (y/n)"
    if ($continue -ne 'y') {
        Write-Host "❌ Aborted." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Port 4321 is available or you chose to continue." -ForegroundColor Green
Write-Host ""

# Start dev server in background
Write-Host "🚀 Starting dev server..." -ForegroundColor Yellow
$devServer = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden

Write-Host "⏳ Waiting for server to be ready (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check if server is running
try {
    Write-Host "🔍 Testing server connection..." -ForegroundColor Yellow
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:4321" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Server is responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not responding!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Try running the server manually in another terminal:" -ForegroundColor Yellow
    Write-Host "   npm run dev" -ForegroundColor Cyan
    Stop-Process -Id $devServer.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "🧪 Running E2E tests..." -ForegroundColor Yellow
Write-Host ""

# Run tests
npm run test:e2e

$testExitCode = $LASTEXITCODE

Write-Host ""
Write-Host "🛑 Stopping dev server..." -ForegroundColor Yellow
Stop-Process -Id $devServer.Id -Force -ErrorAction SilentlyContinue

Write-Host ""
if ($testExitCode -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed (exit code: $testExitCode)" -ForegroundColor Red
}

exit $testExitCode
