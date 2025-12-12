# Phase 5 Generation Test Script for Windows PowerShell
# Run this to verify the generation system is working end-to-end

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phase 5 Generation System Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Backend Generation Function
Write-Host "Test 1: Backend Generation Function" -ForegroundColor Yellow
$output1 = & python test_phase5_generation.py 2>&1
$output1 | Out-File -FilePath test_results_generation.txt
if ($output1 -match "✅ Test completed successfully") {
    Write-Host "✅ Test 1 PASSED - Generation function works" -ForegroundColor Green
} else {
    Write-Host "❌ Test 1 FAILED - Check test_results_generation.txt" -ForegroundColor Red
    $output1 | Select-Object -Last 50 | Write-Host
}
Write-Host ""

# Test 2: Endpoint Direct Flow
Write-Host "Test 2: Endpoint Direct Flow" -ForegroundColor Yellow
$output2 = & python test_endpoint_direct.py 2>&1
$output2 | Out-File -FilePath test_results_endpoint.txt
if ($output2 -match "✅ Test completed") {
    Write-Host "✅ Test 2 PASSED - Endpoint returns correct data" -ForegroundColor Green
} else {
    Write-Host "❌ Test 2 FAILED - Check test_results_endpoint.txt" -ForegroundColor Red
    $output2 | Select-Object -Last 50 | Write-Host
}
Write-Host ""

# Test 3: Complete Frontend Flow
Write-Host "Test 3: Complete Frontend Flow" -ForegroundColor Yellow
$output3 = & python test_full_flow.py 2>&1
$output3 | Out-File -FilePath test_results_flow.txt
if ($output3 -match "✅ SUCCESS - Generation and validation complete") {
    Write-Host "✅ Test 3 PASSED - Complete flow works" -ForegroundColor Green
} else {
    Write-Host "❌ Test 3 FAILED - Check test_results_flow.txt" -ForegroundColor Red
    $output3 | Select-Object -Last 50 | Write-Host
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All tests completed!" -ForegroundColor Cyan
Write-Host "Check test_results_*.txt for details" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
