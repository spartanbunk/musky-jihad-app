#!/bin/bash
# Enhanced Docker Desktop Health Check with Instance Monitoring
# Master Docker Administrator's Solution v2.0

echo "🔍 === ENHANCED DOCKER DESKTOP HEALTH CHECK ==="
echo "🔍 Timestamp: $(date)"

# Initialize status flags
DOCKER_HEALTHY=true
ISSUES_FOUND=()

# Function to add issues to tracking array
add_issue() {
    ISSUES_FOUND+=("$1")
    DOCKER_HEALTHY=false
}

echo ""
echo "📊 Phase 1: Docker Desktop Instance Analysis"
echo "==========================================="

# Check Docker Desktop instance count
DESKTOP_INSTANCES=$(tasklist 2>/dev/null | grep -i "Docker Desktop.exe" | wc -l)
echo "🖥️  Docker Desktop processes: $DESKTOP_INSTANCES"

if [ "$DESKTOP_INSTANCES" -eq 0 ]; then
    add_issue "CRITICAL: No Docker Desktop processes found - Docker not running"
    echo "❌ Status: Docker Desktop not running"
elif [ "$DESKTOP_INSTANCES" -gt 5 ]; then
    add_issue "WARNING: Excessive Docker Desktop instances ($DESKTOP_INSTANCES) - Multiple instance conflict likely"
    echo "⚠️  Status: Multiple instance conflict detected"
    echo "   Normal count: 3-4 processes"
    echo "   Current count: $DESKTOP_INSTANCES processes"
    echo "   Recommendation: Clean Docker Desktop restart required"
elif [ "$DESKTOP_INSTANCES" -ge 3 ] && [ "$DESKTOP_INSTANCES" -le 4 ]; then
    echo "✅ Status: Normal Docker Desktop instance count"
else
    add_issue "WARNING: Unusual Docker Desktop instance count ($DESKTOP_INSTANCES)"
    echo "⚠️  Status: Unusual instance count (expected 3-4)"
fi

# Check Docker backend processes
BACKEND_INSTANCES=$(tasklist 2>/dev/null | grep "com.docker.backend.exe" | wc -l)
echo "🔧 Docker backend processes: $BACKEND_INSTANCES"

if [ "$BACKEND_INSTANCES" -eq 0 ]; then
    add_issue "CRITICAL: No Docker backend processes - Docker engine not running"
    echo "❌ Status: Docker engine not running"
elif [ "$BACKEND_INSTANCES" -gt 2 ]; then
    add_issue "WARNING: Excessive Docker backend instances ($BACKEND_INSTANCES) - Resource conflict likely"
    echo "⚠️  Status: Excessive backend processes"
    echo "   Expected: 1-2 processes"
    echo "   Current: $BACKEND_INSTANCES processes"
else
    echo "✅ Status: Normal Docker backend process count"
fi

echo ""
echo "🌐 Phase 2: Docker Communication Test"
echo "====================================="

# Test Docker daemon communication with timing
echo "🔗 Testing Docker daemon communication..."
start_time=$(date +%s%N)
DOCKER_COMM_TEST=$(docker version --format '{{.Server.Version}}' 2>/dev/null)
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds

if [ $? -eq 0 ] && [ ! -z "$DOCKER_COMM_TEST" ]; then
    echo "✅ Docker daemon communication: SUCCESS"
    echo "📊 Response time: ${response_time}ms"
    echo "🏷️  Docker version: $DOCKER_COMM_TEST"
    
    # Check for performance degradation
    if [ "$response_time" -gt 5000 ]; then
        add_issue "WARNING: Docker command response degraded (${response_time}ms > 5000ms threshold)"
        echo "⚠️  Performance: DEGRADED (${response_time}ms)"
        echo "   Normal response: <1000ms"
        echo "   Recommendation: Preventive Docker Desktop restart"
    elif [ "$response_time" -gt 2000 ]; then
        echo "⚠️  Performance: SLOW (${response_time}ms)"
        echo "   Consider Docker Desktop optimization"
    else
        echo "✅ Performance: OPTIMAL (${response_time}ms)"
    fi
else
    add_issue "CRITICAL: Docker daemon communication FAILED - Named pipe issue likely"
    echo "❌ Docker daemon communication: FAILED"
    echo "🔍 Error details: dockerDesktopLinuxEngine pipe unavailable"
    echo "🔧 Solution: Docker Desktop restart required"
fi

echo ""
echo "📦 Phase 3: Container and Service Analysis"
echo "========================================="

# Check container status (if Docker communication works)
if [ "$DOCKER_COMM_TEST" ]; then
    echo "🐳 Checking container status..."
    CONTAINER_COUNT=$(docker ps -q 2>/dev/null | wc -l)
    echo "📊 Running containers: $CONTAINER_COUNT"
    
    # Check for project-specific containers
    PROJECT_CONTAINERS=$(docker ps --format "table {{.Names}}" 2>/dev/null | grep -E "musky.*jihad|jihad.*musky" | wc -l)
    echo "🎣 Project containers: $PROJECT_CONTAINERS"
    
    if [ "$PROJECT_CONTAINERS" -eq 0 ]; then
        echo "⚠️  No project containers running - may need docker-compose up -d"
    else
        echo "✅ Project containers running"
    fi
    
    # Check for container health
    UNHEALTHY_CONTAINERS=$(docker ps --filter "health=unhealthy" -q 2>/dev/null | wc -l)
    if [ "$UNHEALTHY_CONTAINERS" -gt 0 ]; then
        add_issue "WARNING: $UNHEALTHY_CONTAINERS unhealthy containers detected"
        echo "⚠️  Unhealthy containers: $UNHEALTHY_CONTAINERS"
    fi
else
    echo "⏭️  Skipping container analysis (Docker communication failed)"
fi

echo ""
echo "🌐 Phase 4: Port Conflict Analysis"
echo "================================="

# Check for port conflicts on critical ports
echo "🔌 Checking port conflicts..."

check_port_conflicts() {
    local port=$1
    local port_name=$2
    
    # Count listening processes on this port
    local listen_count=$(netstat -ano 2>/dev/null | grep ":$port " | grep LISTENING | wc -l)
    echo "📊 Port $port ($port_name): $listen_count listeners"
    
    if [ "$listen_count" -gt 1 ]; then
        add_issue "CRITICAL: Multiple services listening on port $port - Port conflict detected"
        echo "❌ Status: PORT CONFLICT"
        echo "🔍 Active listeners on port $port:"
        netstat -ano 2>/dev/null | grep ":$port " | grep LISTENING | while read line; do
            local pid=$(echo "$line" | awk '{print $NF}')
            local process=$(tasklist 2>/dev/null | grep "$pid" | awk '{print $1}' | head -1)
            echo "   PID $pid: $process"
        done
        echo "🔧 Solution: Clean service restart required"
    elif [ "$listen_count" -eq 1 ]; then
        echo "✅ Status: Normal (single listener)"
    else
        echo "⚠️  Status: No listeners (service may be down)"
    fi
    
    # Check for hanging connections
    local close_wait_count=$(netstat -ano 2>/dev/null | grep ":$port " | grep CLOSE_WAIT | wc -l)
    local fin_wait_count=$(netstat -ano 2>/dev/null | grep ":$port " | grep FIN_WAIT | wc -l)
    
    if [ "$close_wait_count" -gt 0 ] || [ "$fin_wait_count" -gt 0 ]; then
        echo "⚠️  Hanging connections: CLOSE_WAIT($close_wait_count) FIN_WAIT($fin_wait_count)"
        if [ "$close_wait_count" -gt 5 ] || [ "$fin_wait_count" -gt 5 ]; then
            add_issue "WARNING: Excessive hanging connections on port $port"
        fi
    fi
}

# Check critical ports
check_port_conflicts 3010 "Frontend"
check_port_conflicts 3011 "Backend"
check_port_conflicts 5433 "Database"

echo ""
echo "💾 Phase 5: Resource Usage Analysis"
echo "==================================="

# Docker Desktop memory usage
echo "🧠 Checking Docker Desktop memory usage..."
DOCKER_MEMORY_KB=$(tasklist /FI "IMAGENAME eq Docker Desktop.exe" /FO CSV 2>/dev/null | tail -n +2 | cut -d',' -f5 | tr -d '"K' | awk '{sum += $1} END {print sum}')
if [ ! -z "$DOCKER_MEMORY_KB" ] && [ "$DOCKER_MEMORY_KB" -gt 0 ]; then
    DOCKER_MEMORY_MB=$((DOCKER_MEMORY_KB / 1024))
    echo "📊 Docker Desktop memory usage: ${DOCKER_MEMORY_MB}MB"
    
    if [ "$DOCKER_MEMORY_MB" -gt 2048 ]; then
        add_issue "WARNING: High Docker Desktop memory usage (${DOCKER_MEMORY_MB}MB > 2GB threshold)"
        echo "⚠️  Status: HIGH MEMORY USAGE"
        echo "🔧 Recommendation: Resource cleanup or restart needed"
    elif [ "$DOCKER_MEMORY_MB" -gt 1024 ]; then
        echo "⚠️  Status: Elevated memory usage (${DOCKER_MEMORY_MB}MB)"
    else
        echo "✅ Status: Normal memory usage (${DOCKER_MEMORY_MB}MB)"
    fi
else
    echo "⚠️  Unable to determine Docker Desktop memory usage"
fi

echo ""
echo "📋 === HEALTH CHECK SUMMARY ==="
echo "================================"

# Final status report
if [ "$DOCKER_HEALTHY" = true ]; then
    echo "✅ DOCKER DESKTOP STATUS: HEALTHY"
    echo "🎯 All systems operational"
    echo "⚡ Ready for development work"
    exit 0
else
    echo "❌ DOCKER DESKTOP STATUS: UNHEALTHY"
    echo "🚨 Issues detected: ${#ISSUES_FOUND[@]}"
    echo ""
    echo "📝 Issue Details:"
    for i in "${!ISSUES_FOUND[@]}"; do
        echo "   $((i+1)). ${ISSUES_FOUND[i]}"
    done
    
    echo ""
    echo "🔧 Recommended Actions:"
    
    # Provide specific recommendations based on issues
    if [[ " ${ISSUES_FOUND[*]} " =~ "Multiple instance conflict" ]] || [[ " ${ISSUES_FOUND[*]} " =~ "Excessive Docker" ]]; then
        echo "   1. Run: ./scripts/recover-docker.sh level3 (Complete Docker restart)"
    elif [[ " ${ISSUES_FOUND[*]} " =~ "Named pipe" ]] || [[ " ${ISSUES_FOUND[*]} " =~ "daemon communication FAILED" ]]; then
        echo "   1. Run: ./scripts/recover-docker.sh level2 (Service restart)"
    elif [[ " ${ISSUES_FOUND[*]} " =~ "Port conflict" ]]; then
        echo "   1. Run: ./scripts/restart-services.sh (Clean service restart)"
    elif [[ " ${ISSUES_FOUND[*]} " =~ "Docker not running" ]]; then
        echo "   1. Manually start Docker Desktop from Start menu"
        echo "   2. Wait 3-5 minutes for initialization"
        echo "   3. Re-run this health check"
    else
        echo "   1. Run: ./scripts/recover-docker.sh level1 (Graceful recovery)"
    fi
    
    echo "   2. If issues persist: ./scripts/recover-docker.sh level4 (System recovery)"
    echo "   3. Check logs: docker-health.log"
    
    exit 1
fi