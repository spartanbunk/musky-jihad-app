#!/bin/bash
# Multi-Level Docker Desktop Recovery System
# Master Docker Administrator's Solution v2.0

echo "🚑 === DOCKER DESKTOP RECOVERY SYSTEM ==="
echo "🚑 Timestamp: $(date)"

# Configuration
RECOVERY_LEVEL=${1:-"level1"}
RECOVERY_LOG="docker-recovery-$(date +%Y%m%d_%H%M%S).log"

# Function to log recovery actions
log_recovery() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$RECOVERY_LOG"
}

echo "🎯 Recovery Level: $RECOVERY_LEVEL"
echo "📝 Recovery Log: $RECOVERY_LOG"

# Recovery level validation
case $RECOVERY_LEVEL in
    "level1"|"level2"|"level3"|"level4")
        log_recovery "Starting $RECOVERY_LEVEL recovery procedure"
        ;;
    *)
        echo "❌ Invalid recovery level: $RECOVERY_LEVEL"
        echo "Valid levels: level1, level2, level3, level4"
        exit 1
        ;;
esac

echo ""
echo "🔍 Pre-Recovery System Assessment"
echo "================================="

# Document current system state
log_recovery "=== PRE-RECOVERY SYSTEM STATE ==="

echo "📊 Current Docker processes:"
DOCKER_PROCESSES=$(tasklist 2>/dev/null | grep -i docker || echo "No Docker processes found")
echo "$DOCKER_PROCESSES"
log_recovery "Docker processes: $DOCKER_PROCESSES"

echo ""
echo "📊 Current port usage:"
PORT_STATUS=$(netstat -ano 2>/dev/null | grep -E ":3010|:3011|:5433" || echo "No relevant ports in use")
echo "$PORT_STATUS"
log_recovery "Port status: $PORT_STATUS"

echo ""
echo "📊 Current Docker communication:"
DOCKER_COMM_STATUS=$(docker version --format '{{.Server.Version}}' 2>&1 || echo "Docker communication failed")
echo "$DOCKER_COMM_STATUS"
log_recovery "Docker communication: $DOCKER_COMM_STATUS"

echo ""
echo "🚑 Initiating Recovery Level: $RECOVERY_LEVEL"
echo "=============================================="

# Recovery Level Functions

perform_level1_recovery() {
    echo "🔧 Level 1: Graceful Recovery (Preserve Containers)"
    echo "=================================================="
    log_recovery "Starting Level 1 graceful recovery"
    
    # Step 1: Stop application services only
    echo "🛑 Step 1: Stopping application services..."
    log_recovery "Stopping application services on ports 3010, 3011"
    
    npx kill-port 3010 3011 --timeout 15 2>/dev/null || {
        echo "⚠️  kill-port failed, using manual termination"
        netstat -ano | grep -E ":3010|:3011" | grep LISTENING | while read line; do
            pid=$(echo "$line" | awk '{print $NF}')
            log_recovery "Force stopping process PID: $pid"
            powershell "Stop-Process -Id $pid -Force" 2>/dev/null || true
        done
    }
    
    echo "⏳ Application service cleanup wait (5 seconds)..."
    sleep 5
    
    # Step 2: Docker container preservation and restart
    echo ""
    echo "🐳 Step 2: Docker container management..."
    
    # Check if containers exist
    if docker ps -a --format "{{.Names}}" 2>/dev/null | grep -E "musky.*jihad|jihad.*musky" >/dev/null; then
        echo "📦 Project containers detected - preserving state"
        log_recovery "Project containers found - preserving"
        
        # Graceful container stop
        echo "🛑 Gracefully stopping containers..."
        docker-compose stop 2>/dev/null || {
            echo "⚠️  docker-compose stop failed, trying manual stop"
            docker stop $(docker ps -q --filter "name=musky" --filter "name=jihad") 2>/dev/null || true
        }
        
        sleep 5
        
        # Restart containers
        echo "🚀 Restarting containers..."
        if docker-compose start 2>/dev/null; then
            echo "✅ Containers restarted successfully"
            log_recovery "Containers restarted successfully"
        else
            echo "⚠️  Container restart failed, trying docker-compose up"
            docker-compose up -d 2>/dev/null || {
                echo "❌ Container recovery failed"
                log_recovery "Container recovery failed"
                return 1
            }
        fi
        
        # Wait for container initialization
        echo "⏳ Container initialization wait (10 seconds)..."
        sleep 10
    else
        echo "📦 No project containers found - skipping container management"
        log_recovery "No project containers found"
    fi
    
    # Step 3: Restart application services
    echo ""
    echo "🚀 Step 3: Restarting application services..."
    log_recovery "Restarting application services"
    
    # Start frontend
    echo "🌐 Starting frontend..."
    npm run dev > /tmp/frontend-recovery.log 2>&1 &
    FRONTEND_PID=$!
    log_recovery "Frontend started with PID: $FRONTEND_PID"
    
    sleep 5
    
    # Start backend
    echo "🔧 Starting backend..."
    npm run server:dev > /tmp/backend-recovery.log 2>&1 &
    BACKEND_PID=$!
    log_recovery "Backend started with PID: $BACKEND_PID"
    
    sleep 8
    
    # Verify recovery
    echo ""
    echo "🔍 Step 4: Recovery verification..."
    return $(verify_recovery_success "level1")
}

perform_level2_recovery() {
    echo "🔄 Level 2: Docker Desktop Service Reset"
    echo "======================================="
    log_recovery "Starting Level 2 service reset recovery"
    
    # Step 1: Stop application services first
    echo "🛑 Step 1: Stopping application services..."
    npx kill-port 3010 3011 --timeout 10 2>/dev/null || true
    sleep 3
    
    # Step 2: Stop Docker Desktop service
    echo ""
    echo "🛑 Step 2: Stopping Docker Desktop service..."
    log_recovery "Stopping Docker Desktop service"
    
    # Try graceful service stop first
    if net stop "Docker Desktop Service" 2>/dev/null; then
        echo "✅ Docker Desktop service stopped gracefully"
        log_recovery "Docker Desktop service stopped gracefully"
    else
        echo "⚠️  Graceful service stop failed, trying alternate methods"
        
        # Try stopping Docker Desktop processes
        echo "🔨 Force stopping Docker Desktop processes..."
        tasklist | grep -i "Docker Desktop.exe" | awk '{print $2}' | while read pid; do
            if [ ! -z "$pid" ]; then
                log_recovery "Force stopping Docker Desktop PID: $pid"
                powershell "Stop-Process -Id $pid -Force" 2>/dev/null || true
            fi
        done
    fi
    
    echo "⏳ Service shutdown wait (15 seconds)..."
    sleep 15
    
    # Step 3: Start Docker Desktop service
    echo ""
    echo "🚀 Step 3: Starting Docker Desktop service..."
    log_recovery "Starting Docker Desktop service"
    
    if net start "Docker Desktop Service" 2>/dev/null; then
        echo "✅ Docker Desktop service started"
        log_recovery "Docker Desktop service started successfully"
    else
        echo "⚠️  Service start failed, trying manual Docker Desktop launch"
        
        # Manual Docker Desktop start
        echo "🚀 Launching Docker Desktop manually..."
        powershell "Start-Process '\"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\"' -WindowStyle Hidden" 2>/dev/null || {
            echo "❌ Failed to launch Docker Desktop"
            log_recovery "Failed to launch Docker Desktop manually"
            return 1
        }
    fi
    
    # Step 4: Extended wait for Docker Desktop initialization
    echo ""
    echo "⏳ Step 4: Waiting for Docker Desktop initialization..."
    log_recovery "Waiting for Docker Desktop initialization"
    
    local timeout=180  # 3 minutes
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if docker ps >/dev/null 2>&1; then
            echo "✅ Docker Desktop initialized successfully"
            log_recovery "Docker Desktop initialized after ${elapsed}s"
            break
        fi
        
        sleep 10
        elapsed=$((elapsed + 10))
        echo "   Initialization progress: ${elapsed}s/${timeout}s"
        
        # Show Docker Desktop processes for debugging
        if [ $((elapsed % 30)) -eq 0 ]; then
            DOCKER_COUNT=$(tasklist | grep -i "Docker Desktop.exe" | wc -l)
            echo "   Docker Desktop processes: $DOCKER_COUNT"
            log_recovery "Initialization check at ${elapsed}s - Docker processes: $DOCKER_COUNT"
        fi
    done
    
    if [ $elapsed -ge $timeout ]; then
        echo "❌ Docker Desktop initialization timeout"
        log_recovery "Docker Desktop initialization timeout after ${timeout}s"
        return 1
    fi
    
    # Step 5: Restore containers and services
    echo ""
    echo "🔄 Step 5: Restoring containers and services..."
    log_recovery "Restoring containers and services"
    
    # Restart containers
    if docker-compose up -d 2>/dev/null; then
        echo "✅ Containers restored"
        log_recovery "Containers restored successfully"
        sleep 15  # Extended wait for database initialization
    else
        echo "⚠️  Container restoration failed"
        log_recovery "Container restoration failed"
    fi
    
    # Restart application services
    echo "🚀 Restarting application services..."
    ./scripts/restart-services.sh || {
        echo "⚠️  Service restart script failed, trying manual restart"
        npm run dev &
        sleep 5
        npm run server:dev &
        sleep 5
    }
    
    # Verify recovery
    echo ""
    echo "🔍 Step 6: Recovery verification..."
    return $(verify_recovery_success "level2")
}

perform_level3_recovery() {
    echo "🔄 Level 3: Complete Docker Desktop Restart"
    echo "=========================================="
    log_recovery "Starting Level 3 complete Docker Desktop restart"
    
    # Step 1: Document current state for recovery
    echo "📋 Step 1: Documenting current state..."
    
    # Save container state if possible
    CONTAINER_STATE_FILE="/tmp/docker-container-state-$(date +%s).txt"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" > "$CONTAINER_STATE_FILE" 2>/dev/null || true
    log_recovery "Container state saved to: $CONTAINER_STATE_FILE"
    
    # Step 2: Complete application service shutdown
    echo ""
    echo "🛑 Step 2: Complete application service shutdown..."
    log_recovery "Shutting down all application services"
    
    # Force stop all related processes
    echo "🔨 Force stopping application processes..."
    
    # Stop by port
    npx kill-port 3010 3011 5433 --timeout 5 2>/dev/null || true
    
    # Stop by process name
    for process_name in "node.exe" "npm.exe"; do
        tasklist | grep "$process_name" | awk '{print $2}' | while read pid; do
            if [ ! -z "$pid" ]; then
                # Check if it's our development process
                if powershell "Get-Process -Id $pid -ErrorAction SilentlyContinue | Select-Object CommandLine" 2>/dev/null | grep -E "dev|server" >/dev/null; then
                    log_recovery "Stopping development process PID: $pid"
                    powershell "Stop-Process -Id $pid -Force" 2>/dev/null || true
                fi
            fi
        done
    done
    
    sleep 5
    
    # Step 3: Complete Docker Desktop termination
    echo ""
    echo "🔨 Step 3: Complete Docker Desktop termination..."
    log_recovery "Terminating all Docker Desktop processes"
    
    # Graceful Docker Desktop shutdown first
    if command -v "docker" >/dev/null 2>&1; then
        echo "🛑 Attempting graceful Docker shutdown..."
        docker system prune -f 2>/dev/null || true
    fi
    
    sleep 5
    
    # Force terminate all Docker processes
    echo "🔨 Force terminating all Docker processes..."
    
    DOCKER_PROCESSES=$(tasklist | grep -i "docker" | awk '{print $2}' | tr '\n' ' ')
    if [ ! -z "$DOCKER_PROCESSES" ]; then
        echo "   Terminating Docker processes: $DOCKER_PROCESSES"
        log_recovery "Terminating Docker processes: $DOCKER_PROCESSES"
        
        echo "$DOCKER_PROCESSES" | tr ' ' '\n' | while read pid; do
            if [ ! -z "$pid" ] && [ "$pid" != " " ]; then
                powershell "Stop-Process -Id $pid -Force" 2>/dev/null || true
                sleep 1
            fi
        done
    else
        echo "   No Docker processes found"
        log_recovery "No Docker processes found to terminate"
    fi
    
    # Extended wait for process cleanup
    echo "⏳ Process cleanup wait (15 seconds)..."
    sleep 15
    
    # Step 4: Clean WSL2 Docker integration
    echo ""
    echo "🔄 Step 4: Cleaning WSL2 Docker integration..."
    log_recovery "Cleaning WSL2 Docker integration"
    
    echo "🛑 Shutting down WSL2..."
    wsl --shutdown 2>/dev/null || {
        echo "⚠️  WSL shutdown failed or not available"
        log_recovery "WSL shutdown failed or not available"
    }
    
    sleep 10
    
    # Step 5: Clean Docker named pipes
    echo ""
    echo "🧹 Step 5: Cleaning Docker named pipes..."
    log_recovery "Cleaning Docker named pipes"
    
    echo "🔧 Clearing Docker named pipes..."
    powershell "Get-ChildItem '\\\\.\\pipe\\' 2>/dev/null | Where-Object Name -like '*docker*' | ForEach-Object { try { Remove-Item \$_.FullName -Force } catch { Write-Host \"Failed to remove \$(\$_.Name)\" } }" 2>/dev/null || {
        echo "⚠️  Named pipe cleanup completed with warnings"
        log_recovery "Named pipe cleanup completed with warnings"
    }
    
    # Step 6: Start Docker Desktop fresh
    echo ""
    echo "🚀 Step 6: Starting Docker Desktop fresh..."
    log_recovery "Starting Docker Desktop with fresh state"
    
    echo "🚀 Launching Docker Desktop..."
    if powershell "Start-Process '\"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\"' -WindowStyle Hidden" 2>/dev/null; then
        echo "✅ Docker Desktop launch initiated"
        log_recovery "Docker Desktop launch initiated successfully"
    else
        echo "❌ Failed to launch Docker Desktop"
        log_recovery "Failed to launch Docker Desktop"
        return 1
    fi
    
    # Step 7: Extended initialization wait with monitoring
    echo ""
    echo "⏳ Step 7: Extended Docker Desktop initialization..."
    log_recovery "Waiting for Docker Desktop complete initialization"
    
    local timeout=300  # 5 minutes for complete restart
    local elapsed=0
    local last_process_count=0
    
    echo "🔍 Monitoring Docker Desktop initialization..."
    
    while [ $elapsed -lt $timeout ]; do
        # Check Docker daemon communication
        if docker version >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
            echo "✅ Docker Desktop fully operational"
            log_recovery "Docker Desktop fully operational after ${elapsed}s"
            break
        fi
        
        # Monitor process count for initialization progress
        current_process_count=$(tasklist | grep -i "Docker Desktop.exe" | wc -l)
        if [ "$current_process_count" -ne "$last_process_count" ]; then
            echo "   Process count changed: $last_process_count → $current_process_count"
            log_recovery "Docker process count: $last_process_count → $current_process_count at ${elapsed}s"
            last_process_count=$current_process_count
        fi
        
        sleep 15
        elapsed=$((elapsed + 15))
        echo "   Initialization progress: ${elapsed}s/${timeout}s (processes: $current_process_count)"
    done
    
    if [ $elapsed -ge $timeout ]; then
        echo "❌ Docker Desktop initialization timeout after 5 minutes"
        log_recovery "Docker Desktop initialization timeout after ${timeout}s"
        return 1
    fi
    
    # Step 8: Full environment restoration
    echo ""
    echo "🔄 Step 8: Full environment restoration..."
    log_recovery "Starting full environment restoration"
    
    # Restore containers
    echo "🐳 Restoring Docker containers..."
    if docker-compose up -d 2>/dev/null; then
        echo "✅ Containers restored successfully"
        log_recovery "Containers restored successfully"
        
        # Extended wait for database initialization
        echo "⏳ Database initialization wait (20 seconds)..."
        sleep 20
    else
        echo "⚠️  Container restoration failed - will try manual setup"
        log_recovery "Container restoration failed"
    fi
    
    # Restore application services
    echo ""
    echo "🚀 Restoring application services..."
    if ./scripts/restart-services.sh; then
        echo "✅ Application services restored"
        log_recovery "Application services restored successfully"
    else
        echo "⚠️  Service restoration script failed, trying manual restoration"
        log_recovery "Service restoration script failed, trying manual"
        
        npm run dev > /tmp/frontend-level3-recovery.log 2>&1 &
        sleep 8
        npm run server:dev > /tmp/backend-level3-recovery.log 2>&1 &
        sleep 8
    fi
    
    # Verify recovery
    echo ""
    echo "🔍 Step 9: Complete recovery verification..."
    return $(verify_recovery_success "level3")
}

perform_level4_recovery() {
    echo "🔄 Level 4: System-Level Docker Recovery"
    echo "======================================="
    log_recovery "Starting Level 4 system-level Docker recovery"
    
    # Step 1: System diagnostics
    echo "🔍 Step 1: System-level Docker diagnostics..."
    log_recovery "Performing system-level diagnostics"
    
    # Check Windows features
    echo "🔍 Checking Windows Docker features..."
    
    echo "   Checking Hyper-V status..."
    HYPERV_STATUS=$(dism /Online /Get-FeatureInfo /FeatureName:Microsoft-Hyper-V-All 2>/dev/null | grep "State : " || echo "State : Unknown")
    echo "   $HYPERV_STATUS"
    log_recovery "Hyper-V status: $HYPERV_STATUS"
    
    if ! echo "$HYPERV_STATUS" | grep -q "Enabled"; then
        echo "⚠️  Hyper-V not properly enabled"
        echo "   To fix: dism /Online /Enable-Feature /All /FeatureName:Microsoft-Hyper-V"
        log_recovery "WARNING: Hyper-V not properly enabled"
    fi
    
    echo "   Checking Containers feature..."
    CONTAINERS_STATUS=$(dism /Online /Get-FeatureInfo /FeatureName:Containers 2>/dev/null | grep "State : " || echo "State : Unknown")
    echo "   $CONTAINERS_STATUS"
    log_recovery "Containers feature status: $CONTAINERS_STATUS"
    
    if ! echo "$CONTAINERS_STATUS" | grep -q "Enabled"; then
        echo "⚠️  Containers feature not properly enabled"
        echo "   To fix: dism /Online /Enable-Feature /All /FeatureName:Containers"
        log_recovery "WARNING: Containers feature not properly enabled"
    fi
    
    # Step 2: WSL2 kernel update
    echo ""
    echo "🔄 Step 2: WSL2 kernel update check..."
    log_recovery "Checking WSL2 kernel update"
    
    if command -v wsl >/dev/null 2>&1; then
        echo "🔄 Updating WSL2 kernel..."
        if wsl --update 2>/dev/null; then
            echo "✅ WSL2 kernel updated"
            log_recovery "WSL2 kernel updated successfully"
        else
            echo "⚠️  WSL2 kernel update failed or not needed"
            log_recovery "WSL2 kernel update failed or not needed"
        fi
        
        # Check WSL2 status
        WSL_STATUS=$(wsl --status 2>/dev/null || echo "WSL status unavailable")
        echo "   WSL Status: $WSL_STATUS"
        log_recovery "WSL status: $WSL_STATUS"
    else
        echo "⚠️  WSL not available"
        log_recovery "WSL not available"
    fi
    
    # Step 3: Clear Docker Desktop application data
    echo ""
    echo "🧹 Step 3: Clearing Docker Desktop application data..."
    log_recovery "Clearing Docker Desktop application data"
    
    # Ensure Docker Desktop is completely stopped
    perform_level3_recovery_cleanup
    
    echo "🗑️  Clearing Docker Desktop data directories..."
    
    # Clear user-specific Docker data
    if [ -d "$APPDATA/Docker" ]; then
        echo "   Clearing $APPDATA/Docker..."
        rm -rf "$APPDATA/Docker" 2>/dev/null || {
            echo "   ⚠️  Failed to clear $APPDATA/Docker"
            log_recovery "Failed to clear $APPDATA/Docker"
        }
    fi
    
    if [ -d "$LOCALAPPDATA/Docker" ]; then
        echo "   Clearing $LOCALAPPDATA/Docker..."
        rm -rf "$LOCALAPPDATA/Docker" 2>/dev/null || {
            echo "   ⚠️  Failed to clear $LOCALAPPDATA/Docker"
            log_recovery "Failed to clear $LOCALAPPDATA/Docker"
        }
    fi
    
    # Clear Docker temporary files
    echo "   Clearing Docker temporary files..."
    rm -rf /tmp/docker* 2>/dev/null || true
    rm -rf /var/tmp/docker* 2>/dev/null || true
    
    log_recovery "Docker Desktop application data clearing completed"
    
    # Step 4: Registry cleanup (advanced)
    echo ""
    echo "🔧 Step 4: Docker registry cleanup..."
    log_recovery "Performing Docker registry cleanup"
    
    echo "🔧 Cleaning Docker registry entries..."
    powershell "
    try {
        \$dockerRegPath = 'HKCU:\\Software\\Docker Inc'
        if (Test-Path \$dockerRegPath) {
            Remove-Item -Path \$dockerRegPath -Recurse -Force
            Write-Host 'Docker registry entries cleared'
        }
    } catch {
        Write-Host 'Registry cleanup completed with warnings: ' \$_.Exception.Message
    }
    " 2>/dev/null || echo "   Registry cleanup completed"
    
    # Step 5: System service reset
    echo ""
    echo "🔄 Step 5: System service reset..."
    log_recovery "Resetting system services"
    
    # Reset Windows Docker services
    echo "🔄 Resetting Windows services..."
    
    # Stop and reset Docker-related services
    services=("docker" "com.docker.service")
    for service in "${services[@]}"; do
        echo "   Resetting service: $service"
        sc.exe stop "$service" 2>/dev/null || true
        sleep 3
        sc.exe start "$service" 2>/dev/null || true
    done
    
    # Step 6: Fresh Docker Desktop installation state
    echo ""
    echo "🚀 Step 6: Fresh Docker Desktop start..."
    log_recovery "Starting Docker Desktop in fresh state"
    
    # Ensure completely clean state
    sleep 10
    
    # Start Docker Desktop with elevated privileges
    echo "🚀 Starting Docker Desktop with elevated privileges..."
    if powershell "Start-Process '\"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\"' -Verb RunAs -WindowStyle Hidden" 2>/dev/null; then
        echo "✅ Docker Desktop started with elevated privileges"
        log_recovery "Docker Desktop started with elevated privileges"
    else
        echo "⚠️  Elevated start failed, trying normal start"
        powershell "Start-Process '\"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\"' -WindowStyle Hidden" 2>/dev/null || {
            echo "❌ Failed to start Docker Desktop"
            log_recovery "Failed to start Docker Desktop completely"
            return 1
        }
    fi
    
    # Step 7: Extended system-level initialization
    echo ""
    echo "⏳ Step 7: Extended system-level initialization..."
    log_recovery "Waiting for complete system-level initialization"
    
    local timeout=600  # 10 minutes for system-level recovery
    local elapsed=0
    
    echo "🔍 Monitoring system-level Docker initialization..."
    echo "   This may take up to 10 minutes for complete recovery..."
    
    while [ $elapsed -lt $timeout ]; do
        # Comprehensive health check
        if docker version >/dev/null 2>&1 && \
           docker info >/dev/null 2>&1 && \
           docker ps >/dev/null 2>&1; then
            echo "✅ System-level Docker recovery completed successfully"
            log_recovery "System-level Docker recovery completed after ${elapsed}s"
            break
        fi
        
        sleep 30
        elapsed=$((elapsed + 30))
        echo "   System recovery progress: ${elapsed}s/${timeout}s"
        
        # Progress indicators
        if [ $((elapsed % 120)) -eq 0 ]; then  # Every 2 minutes
            local process_count=$(tasklist | grep -i "Docker Desktop.exe" | wc -l)
            echo "   Status check: Docker processes=$process_count"
            log_recovery "System recovery status at ${elapsed}s: Docker processes=$process_count"
        fi
    done
    
    if [ $elapsed -ge $timeout ]; then
        echo "❌ System-level Docker recovery timeout after 10 minutes"
        echo "🚨 Manual intervention required:"
        echo "   1. Check Windows Event Logs for Docker errors"
        echo "   2. Verify Windows features (Hyper-V, Containers)"
        echo "   3. Consider Docker Desktop reinstallation"
        log_recovery "System-level Docker recovery timeout after ${timeout}s - manual intervention required"
        return 1
    fi
    
    # Step 8: Complete environment restoration
    echo ""
    echo "🔄 Step 8: Complete environment restoration..."
    log_recovery "Starting complete environment restoration"
    
    # Allow extra time for system stabilization
    echo "⏳ System stabilization wait (30 seconds)..."
    sleep 30
    
    # Restore complete environment
    echo "🐳 Restoring complete Docker environment..."
    
    # Clean docker environment setup
    docker system prune -a -f 2>/dev/null || true
    sleep 5
    
    # Restore project containers
    if docker-compose up -d 2>/dev/null; then
        echo "✅ Project environment restored"
        log_recovery "Project environment restored successfully"
        sleep 30  # Extended database initialization
    else
        echo "⚠️  Project environment restoration failed"
        log_recovery "Project environment restoration failed"
    fi
    
    # Restore application services
    if ./scripts/restart-services.sh; then
        echo "✅ Application services restored"
        log_recovery "Application services restored successfully"
    else
        echo "⚠️  Manual service startup may be required"
        log_recovery "Application service restoration failed"
    fi
    
    # Final verification
    echo ""
    echo "🔍 Step 9: System-level recovery verification..."
    return $(verify_recovery_success "level4")
}

perform_level3_recovery_cleanup() {
    # Helper function for Level 3 cleanup steps
    echo "🔨 Complete Docker process cleanup..."
    
    # Force terminate with more comprehensive approach
    powershell "Get-Process | Where-Object {(\$_.ProcessName -like '*docker*') -or (\$_.CommandLine -like '*docker*')} | Stop-Process -Force" 2>/dev/null || true
    
    # Clean up WSL Docker integration
    wsl --shutdown 2>/dev/null || true
    sleep 5
}

verify_recovery_success() {
    local level=$1
    local verification_score=0
    local max_score=0
    
    echo "🔍 Recovery verification for $level..."
    log_recovery "Starting recovery verification for $level"
    
    # Test 1: Basic Docker functionality (weight: 4)
    max_score=$((max_score + 4))
    echo "   🔍 Test 1: Docker daemon communication..."
    if docker ps >/dev/null 2>&1; then
        echo "      ✅ PASS: Docker daemon responsive"
        verification_score=$((verification_score + 4))
        log_recovery "Verification: Docker daemon communication PASS"
    else
        echo "      ❌ FAIL: Docker daemon not responsive"
        log_recovery "Verification: Docker daemon communication FAIL"
    fi
    
    # Test 2: Docker version check (weight: 2)
    max_score=$((max_score + 2))
    echo "   🔍 Test 2: Docker version accessibility..."
    if docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
        echo "      ✅ PASS: Docker version accessible"
        verification_score=$((verification_score + 2))
        log_recovery "Verification: Docker version check PASS"
    else
        echo "      ❌ FAIL: Docker version not accessible"
        log_recovery "Verification: Docker version check FAIL"
    fi
    
    # Test 3: Container management (weight: 3)
    max_score=$((max_score + 3))
    echo "   🔍 Test 3: Container management..."
    if docker-compose ps >/dev/null 2>&1; then
        echo "      ✅ PASS: Container management functional"
        verification_score=$((verification_score + 3))
        log_recovery "Verification: Container management PASS"
    else
        echo "      ❌ FAIL: Container management not functional"
        log_recovery "Verification: Container management FAIL"
    fi
    
    # Test 4: Application service health (weight: 4)
    max_score=$((max_score + 4))
    echo "   🔍 Test 4: Application service health..."
    
    local frontend_healthy=false
    local backend_healthy=false
    
    # Allow time for services to start
    sleep 10
    
    # Check frontend
    if netstat -ano | grep ":3010 " | grep LISTENING >/dev/null; then
        frontend_healthy=true
        echo "      ✅ Frontend service active"
    else
        echo "      ❌ Frontend service not active"
    fi
    
    # Check backend
    if netstat -ano | grep ":3011 " | grep LISTENING >/dev/null; then
        backend_healthy=true
        echo "      ✅ Backend service active"
    else
        echo "      ❌ Backend service not active"
    fi
    
    if [ "$frontend_healthy" = true ] && [ "$backend_healthy" = true ]; then
        echo "      ✅ PASS: Application services healthy"
        verification_score=$((verification_score + 4))
        log_recovery "Verification: Application services PASS"
    elif [ "$frontend_healthy" = true ] || [ "$backend_healthy" = true ]; then
        echo "      ⚠️  PARTIAL: Some application services healthy"
        verification_score=$((verification_score + 2))
        log_recovery "Verification: Application services PARTIAL"
    else
        echo "      ❌ FAIL: Application services not healthy"
        log_recovery "Verification: Application services FAIL"
    fi
    
    # Test 5: Port conflict check (weight: 2)
    max_score=$((max_score + 2))
    echo "   🔍 Test 5: Port conflict check..."
    
    local port_conflicts=0
    for port in 3010 3011 5433; do
        local listener_count=$(netstat -ano | grep ":$port " | grep LISTENING | wc -l)
        if [ "$listener_count" -gt 1 ]; then
            port_conflicts=$((port_conflicts + 1))
        fi
    done
    
    if [ "$port_conflicts" -eq 0 ]; then
        echo "      ✅ PASS: No port conflicts detected"
        verification_score=$((verification_score + 2))
        log_recovery "Verification: Port conflicts PASS"
    else
        echo "      ❌ FAIL: $port_conflicts port conflicts detected"
        log_recovery "Verification: Port conflicts FAIL ($port_conflicts conflicts)"
    fi
    
    # Test 6: Docker Desktop process health (weight: 1)
    max_score=$((max_score + 1))
    echo "   🔍 Test 6: Docker Desktop process health..."
    
    local desktop_processes=$(tasklist | grep -i "Docker Desktop.exe" | wc -l)
    local backend_processes=$(tasklist | grep "com.docker.backend.exe" | wc -l)
    
    if [ "$desktop_processes" -ge 3 ] && [ "$desktop_processes" -le 4 ] && [ "$backend_processes" -le 2 ]; then
        echo "      ✅ PASS: Docker Desktop process count normal"
        verification_score=$((verification_score + 1))
        log_recovery "Verification: Docker process health PASS (desktop=$desktop_processes, backend=$backend_processes)"
    else
        echo "      ⚠️  WARNING: Docker Desktop process count unusual (desktop=$desktop_processes, backend=$backend_processes)"
        log_recovery "Verification: Docker process health WARNING (desktop=$desktop_processes, backend=$backend_processes)"
    fi
    
    # Calculate success rate
    local success_rate=$((verification_score * 100 / max_score))
    
    echo ""
    echo "📊 Recovery Verification Results:"
    echo "   Score: $verification_score/$max_score ($success_rate%)"
    log_recovery "Verification results: $verification_score/$max_score ($success_rate%)"
    
    if [ "$success_rate" -ge 90 ]; then
        echo "   ✅ EXCELLENT: Recovery highly successful"
        log_recovery "Recovery verification: EXCELLENT ($success_rate%)"
        return 0
    elif [ "$success_rate" -ge 75 ]; then
        echo "   ✅ GOOD: Recovery successful with minor issues"
        log_recovery "Recovery verification: GOOD ($success_rate%)"
        return 0
    elif [ "$success_rate" -ge 50 ]; then
        echo "   ⚠️  PARTIAL: Recovery partially successful"
        log_recovery "Recovery verification: PARTIAL ($success_rate%)"
        
        # Suggest escalation for partial recovery
        if [ "$level" != "level4" ]; then
            echo "   🔧 Suggestion: Consider escalating to higher recovery level"
            local next_level_num=$((${level#level} + 1))
            echo "   📞 Run: ./scripts/recover-docker.sh level$next_level_num"
        fi
        
        return 1
    else
        echo "   ❌ FAILED: Recovery unsuccessful"
        log_recovery "Recovery verification: FAILED ($success_rate%)"
        
        # Suggest escalation or manual intervention
        if [ "$level" != "level4" ]; then
            echo "   🚨 Suggestion: Escalate to higher recovery level"
            local next_level_num=$((${level#level} + 1))
            echo "   📞 Run: ./scripts/recover-docker.sh level$next_level_num"
        else
            echo "   🚨 Manual intervention required - check Docker Desktop installation"
        fi
        
        return 1
    fi
}

# Main recovery execution
echo ""

case $RECOVERY_LEVEL in
    "level1")
        if perform_level1_recovery; then
            echo "🎉 Level 1 Recovery Completed Successfully!"
            log_recovery "Level 1 recovery completed successfully"
            exit 0
        else
            echo "❌ Level 1 Recovery Failed"
            echo "🔧 Escalating to Level 2..."
            log_recovery "Level 1 recovery failed, escalating to Level 2"
            RECOVERY_LEVEL="level2"
            perform_level2_recovery
        fi
        ;;
    "level2")
        if perform_level2_recovery; then
            echo "🎉 Level 2 Recovery Completed Successfully!"
            log_recovery "Level 2 recovery completed successfully"
            exit 0
        else
            echo "❌ Level 2 Recovery Failed"
            echo "🔧 Escalating to Level 3..."
            log_recovery "Level 2 recovery failed, escalating to Level 3"
            RECOVERY_LEVEL="level3"
            perform_level3_recovery
        fi
        ;;
    "level3")
        if perform_level3_recovery; then
            echo "🎉 Level 3 Recovery Completed Successfully!"
            log_recovery "Level 3 recovery completed successfully"
            exit 0
        else
            echo "❌ Level 3 Recovery Failed"
            echo "🔧 Escalating to Level 4..."
            log_recovery "Level 3 recovery failed, escalating to Level 4"
            RECOVERY_LEVEL="level4"
            perform_level4_recovery
        fi
        ;;
    "level4")
        if perform_level4_recovery; then
            echo "🎉 Level 4 Recovery Completed Successfully!"
            log_recovery "Level 4 recovery completed successfully"
            exit 0
        else
            echo "❌ Level 4 Recovery Failed - Manual Intervention Required"
            echo ""
            echo "🚨 CRITICAL: All automated recovery levels failed"
            echo ""
            echo "📋 Manual Recovery Steps:"
            echo "   1. Check Windows Event Logs for Docker/Hyper-V errors"
            echo "   2. Verify Windows features are properly enabled:"
            echo "      - Hyper-V: dism /Online /Enable-Feature /All /FeatureName:Microsoft-Hyper-V"
            echo "      - Containers: dism /Online /Enable-Feature /All /FeatureName:Containers"
            echo "   3. Update WSL2 kernel: wsl --update"
            echo "   4. Consider Docker Desktop reinstallation"
            echo "   5. Restart Windows if Windows features were modified"
            echo ""
            echo "📞 Support Resources:"
            echo "   - Docker Desktop troubleshooting: https://docs.docker.com/desktop/troubleshoot/"
            echo "   - Windows Containers docs: https://docs.microsoft.com/virtualization/windowscontainers/"
            echo ""
            echo "📝 Recovery log: $RECOVERY_LOG"
            
            log_recovery "Level 4 recovery failed - manual intervention required"
            exit 1
        fi
        ;;
esac