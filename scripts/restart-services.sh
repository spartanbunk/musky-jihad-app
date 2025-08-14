#!/bin/bash
# Docker-Aware Service Restart Procedure
# Master Docker Administrator's Solution v2.0

echo "🔄 === DOCKER-AWARE SERVICE RESTART ==="
echo "🔄 Timestamp: $(date)"

# Configuration
FRONTEND_PORT=3010
BACKEND_PORT=3011
TIMEOUT_GRACEFUL=15
TIMEOUT_FORCE=30

# Initialize tracking
SERVICES_RESTARTED=false
DOCKER_PRESERVED=false

echo ""
echo "🔍 Phase 1: Docker Desktop Health Assessment"
echo "==========================================="

# Critical: Always check Docker health before manipulating services
echo "🏥 Running Docker Desktop health check..."
if ! ./scripts/check-docker.sh; then
    echo ""
    echo "❌ DOCKER DESKTOP UNHEALTHY - ABORTING SERVICE RESTART"
    echo "🚨 Docker Desktop must be healthy before service manipulation"
    echo ""
    echo "🔧 Resolution Steps:"
    echo "   1. Run: ./scripts/recover-docker.sh"
    echo "   2. Wait for Docker recovery completion"
    echo "   3. Re-run this service restart script"
    echo ""
    exit 1
fi

echo ""
echo "✅ Docker Desktop health verified - proceeding with service restart"

echo ""
echo "🛑 Phase 2: Graceful Service Shutdown"
echo "====================================="

# Check if Docker containers are running (preserve state)
echo "🐳 Checking Docker container state..."
if docker ps --format "table {{.Names}}" 2>/dev/null | grep -E "musky.*jihad|jihad.*musky" >/dev/null; then
    echo "✅ Project containers detected - preserving container state"
    DOCKER_PRESERVED=true
    
    # Document container state for recovery
    echo "📊 Container state snapshot:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "musky|jihad" | while read line; do
        echo "   $line"
    done
else
    echo "⚠️  No project containers running"
fi

# Enhanced graceful shutdown with Docker awareness
echo ""
echo "🛑 Graceful service termination..."

# Step 1: Graceful port termination with timeout
echo "📡 Terminating services on ports $FRONTEND_PORT and $BACKEND_PORT (timeout: ${TIMEOUT_GRACEFUL}s)..."
npx kill-port $FRONTEND_PORT $BACKEND_PORT --timeout $TIMEOUT_GRACEFUL 2>/dev/null &
KILL_PORT_PID=$!

# Wait for graceful termination
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT_GRACEFUL ] && kill -0 $KILL_PORT_PID 2>/dev/null; do
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo "   Graceful shutdown progress: ${ELAPSED}s/${TIMEOUT_GRACEFUL}s"
done

# Check if graceful shutdown succeeded
if kill -0 $KILL_PORT_PID 2>/dev/null; then
    echo "⚠️  Graceful shutdown taking longer than expected"
    wait $KILL_PORT_PID
fi

echo "✅ Graceful termination completed"

# Step 2: Verify port cleanup
echo ""
echo "🔍 Verifying port cleanup..."

verify_port_cleanup() {
    local port=$1
    local port_name=$2
    
    local remaining_listeners=$(netstat -ano 2>/dev/null | grep ":$port " | grep LISTENING | wc -l)
    if [ "$remaining_listeners" -gt 0 ]; then
        echo "⚠️  Port $port ($port_name): $remaining_listeners listeners still active"
        
        # Show remaining processes
        netstat -ano 2>/dev/null | grep ":$port " | grep LISTENING | while read line; do
            local pid=$(echo "$line" | awk '{print $NF}')
            local process=$(tasklist 2>/dev/null | grep "$pid" | awk '{print $1}' | head -1)
            echo "      PID $pid: $process"
        done
        
        # Force cleanup if needed
        echo "🔨 Force terminating remaining processes on port $port..."
        netstat -ano 2>/dev/null | grep ":$port " | grep LISTENING | while read line; do
            local pid=$(echo "$line" | awk '{print $NF}')
            powershell "Stop-Process -Id $pid -Force" 2>/dev/null || true
        done
        
        return 1
    else
        echo "✅ Port $port ($port_name): Clean"
        return 0
    fi
}

verify_port_cleanup $FRONTEND_PORT "Frontend"
verify_port_cleanup $BACKEND_PORT "Backend"

# Step 3: Extended cleanup wait for Docker integration
echo ""
echo "⏳ Docker integration cleanup wait (5 seconds)..."
sleep 5

# Step 4: Post-shutdown Docker health verification
echo ""
echo "🏥 Post-shutdown Docker health verification..."
if ! docker ps >/dev/null 2>&1; then
    echo "🚨 CRITICAL: Docker Desktop degraded during service shutdown"
    echo "🔧 Initiating Docker recovery..."
    
    if ! ./scripts/recover-docker.sh level1; then
        echo "❌ Docker recovery failed - aborting service restart"
        exit 1
    fi
    
    echo "✅ Docker Desktop recovered"
fi

echo ""
echo "🚀 Phase 3: Intelligent Service Startup"
echo "======================================"

# Step 1: Pre-startup environment verification
echo "🔍 Pre-startup environment verification..."

# Verify Docker containers (restart if needed and were running before)
if [ "$DOCKER_PRESERVED" = true ]; then
    echo "🐳 Restoring Docker container state..."
    
    # Check if containers are still running
    CURRENT_CONTAINERS=$(docker ps --format "table {{.Names}}" 2>/dev/null | grep -E "musky.*jihad|jihad.*musky" | wc -l)
    if [ "$CURRENT_CONTAINERS" -eq 0 ]; then
        echo "🔧 Restarting project containers..."
        if docker-compose up -d 2>/dev/null; then
            echo "✅ Project containers restarted"
            # Allow containers to initialize
            sleep 10
        else
            echo "⚠️  Failed to restart containers - continuing without database"
        fi
    else
        echo "✅ Project containers already running"
    fi
fi

# Step 2: Staggered service startup with health monitoring
echo ""
echo "🎯 Starting services with staggered timing..."

# Start frontend first (lighter service)
echo "🌐 Starting frontend service (port $FRONTEND_PORT)..."
npm run dev > frontend-startup.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Frontend initialization wait
echo "⏳ Frontend initialization wait (8 seconds)..."
sleep 8

# Verify frontend started
if kill -0 $FRONTEND_PID 2>/dev/null && netstat -ano | grep ":$FRONTEND_PORT " | grep LISTENING >/dev/null; then
    echo "✅ Frontend service started successfully"
else
    echo "⚠️  Frontend service may have failed - check frontend-startup.log"
fi

# Start backend service with database dependency check
echo ""
echo "🔧 Starting backend service (port $BACKEND_PORT)..."

# Pre-backend database connectivity check
if [ "$DOCKER_PRESERVED" = true ]; then
    echo "🗄️  Verifying database connectivity..."
    DB_READY=false
    for i in {1..6}; do
        if docker exec $(docker ps --format "{{.Names}}" | grep -E "db|postgres" | head -1) pg_isready -U fishing_user -d lake_st_clair_fishing >/dev/null 2>&1; then
            echo "✅ Database ready for connections"
            DB_READY=true
            break
        else
            echo "   Database check $i/6 - waiting..."
            sleep 5
        fi
    done
    
    if [ "$DB_READY" = false ]; then
        echo "⚠️  Database not ready - backend may experience connection issues"
    fi
fi

npm run server:dev > backend-startup.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Backend initialization wait
echo "⏳ Backend initialization wait (5 seconds)..."
sleep 5

# Verify backend started
if kill -0 $BACKEND_PID 2>/dev/null && netstat -ano | grep ":$BACKEND_PORT " | grep LISTENING >/dev/null; then
    echo "✅ Backend service started successfully"
else
    echo "⚠️  Backend service may have failed - check backend-startup.log"
fi

echo ""
echo "🔍 Phase 4: Service Health Verification"
echo "======================================"

# Extended verification period for service stabilization
echo "⏳ Service stabilization wait (10 seconds)..."
sleep 10

echo "🩺 Comprehensive service health check..."

# Health check function
check_service_health() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    
    echo "🔍 Checking $service_name health..."
    
    # Port availability check
    if netstat -ano | grep ":$port " | grep LISTENING >/dev/null; then
        echo "✅ $service_name: Port $port is active"
        
        # HTTP endpoint check (if provided)
        if [ ! -z "$endpoint" ]; then
            if curl -sf "$endpoint" >/dev/null 2>&1; then
                echo "✅ $service_name: HTTP endpoint responsive"
                return 0
            else
                echo "⚠️  $service_name: Port active but HTTP endpoint not responding"
                return 1
            fi
        else
            return 0
        fi
    else
        echo "❌ $service_name: Port $port not active"
        return 1
    fi
}

# Check individual services
FRONTEND_HEALTHY=false
BACKEND_HEALTHY=false

if check_service_health "Frontend" $FRONTEND_PORT "http://localhost:$FRONTEND_PORT"; then
    FRONTEND_HEALTHY=true
fi

if check_service_health "Backend" $BACKEND_PORT "http://localhost:$BACKEND_PORT/api/health"; then
    BACKEND_HEALTHY=true
fi

# Docker container health (if applicable)
CONTAINERS_HEALTHY=true
if [ "$DOCKER_PRESERVED" = true ]; then
    echo "🐳 Checking container health..."
    UNHEALTHY_CONTAINERS=$(docker ps --filter "health=unhealthy" -q 2>/dev/null | wc -l)
    if [ "$UNHEALTHY_CONTAINERS" -gt 0 ]; then
        echo "⚠️  $UNHEALTHY_CONTAINERS containers are unhealthy"
        CONTAINERS_HEALTHY=false
    else
        echo "✅ All containers healthy"
    fi
fi

# Final Docker health check
echo "🏥 Final Docker Desktop health verification..."
DOCKER_FINAL_HEALTHY=true
if ! docker ps >/dev/null 2>&1; then
    echo "⚠️  Docker Desktop communication issues detected"
    DOCKER_FINAL_HEALTHY=false
fi

echo ""
echo "📊 === SERVICE RESTART SUMMARY ==="
echo "=================================="

# Overall status assessment
ALL_HEALTHY=true

echo "🎯 Service Status Report:"
if [ "$FRONTEND_HEALTHY" = true ]; then
    echo "   ✅ Frontend (port $FRONTEND_PORT): HEALTHY"
else
    echo "   ❌ Frontend (port $FRONTEND_PORT): UNHEALTHY"
    ALL_HEALTHY=false
fi

if [ "$BACKEND_HEALTHY" = true ]; then
    echo "   ✅ Backend (port $BACKEND_PORT): HEALTHY"
else
    echo "   ❌ Backend (port $BACKEND_PORT): UNHEALTHY"
    ALL_HEALTHY=false
fi

if [ "$DOCKER_PRESERVED" = true ]; then
    if [ "$CONTAINERS_HEALTHY" = true ]; then
        echo "   ✅ Docker Containers: HEALTHY"
    else
        echo "   ⚠️  Docker Containers: DEGRADED"
    fi
fi

if [ "$DOCKER_FINAL_HEALTHY" = true ]; then
    echo "   ✅ Docker Desktop: HEALTHY"
else
    echo "   ❌ Docker Desktop: UNHEALTHY"
    ALL_HEALTHY=false
fi

echo ""
if [ "$ALL_HEALTHY" = true ]; then
    echo "🎉 SERVICE RESTART COMPLETED SUCCESSFULLY"
    echo "⚡ All services operational"
    echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
    echo "🔧 Backend: http://localhost:$BACKEND_PORT"
    if [ "$DOCKER_PRESERVED" = true ]; then
        echo "🐳 Database: localhost:5433"
    fi
    echo ""
    echo "✅ Ready for development work!"
    SERVICES_RESTARTED=true
    exit 0
else
    echo "⚠️  SERVICE RESTART COMPLETED WITH ISSUES"
    echo "🚨 Some services may not be fully operational"
    echo ""
    echo "🔧 Troubleshooting Steps:"
    
    if [ "$FRONTEND_HEALTHY" = false ]; then
        echo "   Frontend Issues:"
        echo "     - Check: frontend-startup.log"
        echo "     - Verify: Port $FRONTEND_PORT not in use by other processes"
        echo "     - Restart: npm run dev"
    fi
    
    if [ "$BACKEND_HEALTHY" = false ]; then
        echo "   Backend Issues:"
        echo "     - Check: backend-startup.log"
        echo "     - Verify: Database connectivity"
        echo "     - Restart: npm run server:dev"
    fi
    
    if [ "$DOCKER_FINAL_HEALTHY" = false ]; then
        echo "   Docker Issues:"
        echo "     - Run: ./scripts/recover-docker.sh"
        echo "     - Check: Docker Desktop status in system tray"
    fi
    
    echo ""
    echo "🔄 For complete service recovery, run:"
    echo "   ./scripts/recover-docker.sh level1"
    
    exit 1
fi