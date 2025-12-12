#!/usr/bin/env pwsh
# Add dummy stakeholders via API

$BaseUrl = "http://localhost:8000/api/users"

$stakeholders = @(
    @{ email = "demo.pm1@example.com"; username = "demo_pm1"; full_name = "Alice Johnson - Product Manager"; role = "Product Manager" },
    @{ email = "demo.pm2@example.com"; username = "demo_pm2"; full_name = "Bob Smith - Senior Product Manager"; role = "Product Manager" },
    @{ email = "demo.ba1@example.com"; username = "demo_ba1"; full_name = "Carol Davis - Business Analyst"; role = "Business Analyst" },
    @{ email = "demo.ba2@example.com"; username = "demo_ba2"; full_name = "David Wilson - Senior Business Analyst"; role = "Business Analyst" },
    @{ email = "demo.tl1@example.com"; username = "demo_tl1"; full_name = "Emma Taylor - Technical Lead"; role = "Technical Lead" },
    @{ email = "demo.tl2@example.com"; username = "demo_tl2"; full_name = "Frank Miller - Architect"; role = "Technical Lead" },
    @{ email = "demo.pm3@example.com"; username = "demo_pm3"; full_name = "Grace Lee - Project Manager"; role = "Project Manager" },
    @{ email = "demo.pm4@example.com"; username = "demo_pm4"; full_name = "Henry Brown - Program Manager"; role = "Project Manager" },
    @{ email = "demo.sh1@example.com"; username = "demo_sh1"; full_name = "Iris Martinez - Stakeholder"; role = "Stakeholder" },
    @{ email = "demo.sh2@example.com"; username = "demo_sh2"; full_name = "Jack Anderson - Executive Sponsor"; role = "Stakeholder" },
    @{ email = "demo.qa1@example.com"; username = "demo_qa1"; full_name = "Karen White - QA Lead"; role = "QA Lead" },
    @{ email = "demo.qa2@example.com"; username = "demo_qa2"; full_name = "Leo Thompson - Test Engineer"; role = "QA Lead" },
    @{ email = "demo.ops1@example.com"; username = "demo_ops1"; full_name = "Monica Garcia - Operations Manager"; role = "Operations Manager" },
    @{ email = "demo.ops2@example.com"; username = "demo_ops2"; full_name = "Nathan Clark - DevOps Engineer"; role = "Operations Manager" }
)

$addedCount = 0
$skippedCount = 0

foreach ($stakeholder in $stakeholders) {
    try {
        $body = @{
            email = $stakeholder.email
            username = $stakeholder.username
            full_name = $stakeholder.full_name
            password = "demo@123"
            role = $stakeholder.role
        } | ConvertTo-Json

        $response = Invoke-WebRequest -Uri $BaseUrl -Method POST -ContentType "application/json" -Body $body -ErrorAction SilentlyContinue
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Added: $($stakeholder.full_name) ($($stakeholder.role))" -ForegroundColor Green
            $addedCount++
        }
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            # Already exists
            Write-Host "⏭️  Skipping $($stakeholder.full_name) - already exists" -ForegroundColor Yellow
            $skippedCount++
        }
        else {
            Write-Host "❌ Error adding $($stakeholder.full_name): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "✨ Summary:" -ForegroundColor Cyan
Write-Host "  Added: $addedCount users" -ForegroundColor Green
Write-Host "  Skipped: $skippedCount users (already exist)" -ForegroundColor Yellow
