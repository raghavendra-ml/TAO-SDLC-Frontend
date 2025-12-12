#!/bin/bash
# Phase 5 Generation Test Script
# Run this to verify the generation system is working end-to-end

echo "========================================"
echo "Phase 5 Generation System Test"
echo "========================================"
echo ""

echo "Test 1: Backend Generation Function"
python test_phase5_generation.py > test_results_generation.txt 2>&1
if grep -q "✅ Test completed successfully" test_results_generation.txt; then
    echo "✅ Test 1 PASSED - Generation function works"
else
    echo "❌ Test 1 FAILED - Check test_results_generation.txt"
    cat test_results_generation.txt
fi
echo ""

echo "Test 2: Endpoint Direct Flow"
python test_endpoint_direct.py > test_results_endpoint.txt 2>&1
if grep -q "✅ Test completed" test_results_endpoint.txt; then
    echo "✅ Test 2 PASSED - Endpoint returns correct data"
else
    echo "❌ Test 2 FAILED - Check test_results_endpoint.txt"
    cat test_results_endpoint.txt
fi
echo ""

echo "Test 3: Complete Frontend Flow"
python test_full_flow.py > test_results_flow.txt 2>&1
if grep -q "✅ SUCCESS - Generation and validation complete" test_results_flow.txt; then
    echo "✅ Test 3 PASSED - Complete flow works"
else
    echo "❌ Test 3 FAILED - Check test_results_flow.txt"
    cat test_results_flow.txt
fi
echo ""

echo "========================================"
echo "All tests completed!"
echo "Check test_results_*.txt for details"
echo "========================================"
