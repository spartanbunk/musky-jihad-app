# Docker Desktop Restart Reliability Plan

## Problem Analysis

### Current Issue
When restarting development processes (frontend/backend), Docker Desktop appears to die or become unresponsive, causing database connection failures and authentication issues.

### Symptoms Observed
1. **Process Kill Impact**: Using `powershell "Stop-Process -Id [PID] -Force"` seems to affect Docker Desktop
2. **Named Pipe Errors**: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`
3. **Database Connection Failures**: `ECONNREFUSED ::1:5432` and `127.0.0.1:5432` 
4. **JWT Authentication Errors**: Backend loses environment variables

### Root Causes
1. **Docker Desktop Fragility**: Aggressive process killing may terminate Docker Desktop processes
2. **Environment Variable Loss**: Backend server not properly loading .env file after restart
3. **Port Confusion**: Backend tries port 5432 instead of 5433 (Docker container port)
4. **Docker Desktop Startup Time**: Takes 3-5 minutes to fully initialize after restart

## Implementation Strategy

### Phase 1: Gentle Process Management
Replace aggressive process killing with graceful shutdown procedures.

**Current (Problematic) Method:**
```bash
# Find and kill processes aggressively
netstat -ano | findstr :3010
powershell "Stop-Process -Id [PID] -Force"
```

**New (Gentle) Method:**
```bash
# 1. Graceful shutdown first
npm run stop  # if available
# 2. Wait for graceful shutdown
sleep 2
# 3. Only force kill if still running
netstat -ano | findstr :3010 && powershell "Stop-Process -Id [PID] -Force"
```

### Phase 2: Docker Desktop Health Checks
Add robust Docker Desktop health monitoring before restarting services.

**Docker Health Check Sequence:**
```bash
# 1. Check Docker Desktop status
docker ps > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "🚨 Docker Desktop not running - starting..."
    # 2. Start Docker Desktop (if needed)
    # 3. Wait for initialization
    # 4. Verify containers are running
fi

# 5. Start application services only after Docker is healthy
```

### Phase 3: Environment Variable Reliability
Ensure backend always loads environment variables correctly.

**Current Issue:**
- Backend started with `node index.js` may not load .env
- Environment variables get lost during restart

**Solution:**
- Always use `npm run server:dev` (should load .env via dotenv)
- Add explicit .env validation on backend startup
- Create backup environment variable loading

### Phase 4: Service Restart Procedure
Create a reliable, documented service restart workflow.

## Technical Implementation

### File Changes Required

#### 1. Update `package.json` Scripts
```json
{
  "scripts": {
    "dev": "next dev -p 3010",
    "server:dev": "node -r dotenv/config server/index.js",
    "stop": "npx kill-port 3010 3011",
    "restart": "npm run stop && sleep 2 && npm run dev & npm run server:dev",
    "docker:check": "docker ps",
    "docker:start": "docker-compose up -d",
    "services:restart": "npm run stop && npm run docker:check && npm run restart"
  }
}
```

#### 2. Create `scripts/restart-services.sh`
```bash
#!/bin/bash
echo "🔄 Starting service restart procedure..."

# Step 1: Graceful shutdown
echo "1. Stopping services gracefully..."
npm run stop 2>/dev/null || true
sleep 3

# Step 2: Force kill if still running
echo "2. Checking for remaining processes..."
FRONTEND_PID=$(netstat -ano | findstr :3010 | awk '{print $5}' | head -1)
BACKEND_PID=$(netstat -ano | findstr :3011 | awk '{print $5}' | head -1)

if [ ! -z "$FRONTEND_PID" ]; then
    echo "   Force killing frontend process $FRONTEND_PID"
    powershell "Stop-Process -Id $FRONTEND_PID -Force" 2>/dev/null || true
fi

if [ ! -z "$BACKEND_PID" ]; then
    echo "   Force killing backend process $BACKEND_PID"
    powershell "Stop-Process -Id $BACKEND_PID -Force" 2>/dev/null || true
fi

# Step 3: Check Docker Desktop health
echo "3. Checking Docker Desktop status..."
if ! docker ps >/dev/null 2>&1; then
    echo "🚨 Docker Desktop not responding - attempting recovery..."
    echo "   Please manually restart Docker Desktop and wait 3-5 minutes"
    echo "   Then run this script again"
    exit 1
fi

# Step 4: Verify database containers
echo "4. Checking database containers..."
if ! docker ps | grep -q "musky_jihad-db-1"; then
    echo "   Starting database containers..."
    docker-compose up -d
    echo "   Waiting for database to be ready..."
    sleep 10
fi

# Step 5: Start services
echo "5. Starting services..."
npm run dev &
sleep 2
npm run server:dev &

echo "✅ Service restart complete!"
echo "Frontend: http://localhost:3010"
echo "Backend: http://localhost:3011"
```

#### 3. Backend Environment Validation
Add to `server/index.js`:
```javascript
// Environment validation on startup
const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'PORT'
];

console.log('🔧 Validating environment variables...');
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error('💡 Make sure .env file exists and is properly loaded');
    process.exit(1);
}

console.log('✅ Environment variables validated');
console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@'));
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');
```

### Phase 5: Docker Desktop Monitoring
Add proactive Docker Desktop health monitoring.

#### 1. Create `scripts/check-docker.sh`
```bash
#!/bin/bash
echo "🐳 Checking Docker Desktop health..."

# Check if Docker Desktop is running
if ! docker ps >/dev/null 2>&1; then
    echo "❌ Docker Desktop not responding"
    echo "🔍 Common issues:"
    echo "   - Docker Desktop service stopped"
    echo "   - WSL2 integration broken"
    echo "   - Named pipe connection failed"
    echo ""
    echo "🔧 Suggested fixes:"
    echo "   1. Restart Docker Desktop manually"
    echo "   2. Wait 3-5 minutes for full initialization"
    echo "   3. Check WSL2 integration in Docker settings"
    exit 1
fi

# Check database container
if ! docker ps | grep -q "musky_jihad-db-1"; then
    echo "⚠️  Database container not running"
    echo "🔧 Starting database containers..."
    docker-compose up -d
    exit 2
fi

echo "✅ Docker Desktop is healthy"
echo "✅ Database container is running"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## Updated CLAUDE.md Section

### Service Restart Procedure (Updated)

#### ✅ RELIABLE RESTART PROCEDURE:

**1. Check Docker Desktop First**
```bash
# Always verify Docker Desktop health before restarting
npm run docker:check
# If fails: manually restart Docker Desktop, wait 5 minutes
```

**2. Graceful Service Restart**
```bash
# Use gentle restart procedure
./scripts/restart-services.sh

# OR manual steps:
npm run stop                    # Graceful shutdown
sleep 3                        # Wait for cleanup
netstat -ano | findstr :3010   # Check if processes remain
powershell "Stop-Process -Id [PID] -Force"  # Only if needed
npm run dev &                  # Start frontend
npm run server:dev &           # Start backend (loads .env)
```

**3. Verification Steps**
```bash
# Check all services are running
netstat -ano | findstr :3010   # Frontend
netstat -ano | findstr :3011   # Backend
docker ps                      # Database containers
curl http://localhost:3011/api/health  # Backend health
```

#### ❌ PROBLEMATIC METHODS (AVOID):
- **Aggressive process killing without Docker health checks**
- **Starting backend with `node index.js` (misses .env loading)**
- **Restarting services while Docker Desktop is unhealthy**

## Testing Strategy

### Test Scenarios
1. **Normal Restart**: Services running → graceful restart → all working
2. **Docker Desktop Down**: Services running → Docker dies → recovery procedure
3. **Process Stuck**: Services hanging → force kill → gentle restart
4. **Environment Loss**: Backend restart → .env not loaded → validation catches it

### Success Metrics
- Services restart without affecting Docker Desktop
- Database connections maintain reliability  
- Environment variables consistently loaded
- Authentication works immediately after restart
- Recovery time under 30 seconds (when Docker healthy)

## Implementation Priority
1. **High**: Create reliable restart script with Docker health checks
2. **High**: Add backend environment variable validation
3. **High**: Update CLAUDE.md with new procedures
4. **Medium**: Add proactive Docker Desktop monitoring
5. **Low**: Create automated health check alerts

This plan should eliminate the Docker Desktop restart issues and provide a robust service restart procedure.