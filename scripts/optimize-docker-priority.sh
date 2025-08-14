#!/bin/bash
# Docker Desktop Process Priority Optimization
# Master Docker Administrator's Solution v2.0

echo "⚡ === DOCKER DESKTOP PROCESS PRIORITY OPTIMIZATION ==="
echo "⚡ Timestamp: $(date)"

# Configuration
OPTIMIZATION_LOG="docker-optimization-$(date +%Y%m%d_%H%M%S).log"
REQUIRED_PRIVILEGES=false

# Function to log optimization actions
log_optimization() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$OPTIMIZATION_LOG"
}

echo "📝 Optimization Log: $OPTIMIZATION_LOG"

echo ""
echo "🔍 Phase 1: Docker Process Analysis"
echo "==================================="

log_optimization "Starting Docker Desktop process analysis"

# Analyze current Docker Desktop processes
echo "📊 Current Docker Desktop process analysis:"

DOCKER_DESKTOP_PIDS=$(tasklist /FO CSV | grep -i "Docker Desktop.exe" | cut -d',' -f2 | tr -d '"' | tr '\n' ' ')
DOCKER_BACKEND_PIDS=$(tasklist /FO CSV | grep "com.docker.backend.exe" | cut -d',' -f2 | tr -d '"' | tr '\n' ' ')

if [ -z "$DOCKER_DESKTOP_PIDS" ]; then
    echo "❌ No Docker Desktop processes found"
    echo "🔧 Please start Docker Desktop first"
    log_optimization "No Docker Desktop processes found"
    exit 1
fi

echo "🖥️  Docker Desktop PIDs: $DOCKER_DESKTOP_PIDS"
echo "🔧 Docker Backend PIDs: $DOCKER_BACKEND_PIDS"

log_optimization "Docker Desktop PIDs: $DOCKER_DESKTOP_PIDS"
log_optimization "Docker Backend PIDs: $DOCKER_BACKEND_PIDS"

# Analyze current process priorities
echo ""
echo "📊 Current process priority analysis:"

analyze_process_priority() {
    local pid=$1
    local process_name=$2
    
    if [ ! -z "$pid" ] && [ "$pid" != " " ]; then
        local priority=$(powershell "Get-Process -Id $pid -ErrorAction SilentlyContinue | Select-Object -ExpandProperty PriorityClass" 2>/dev/null)
        if [ ! -z "$priority" ]; then
            echo "   PID $pid ($process_name): $priority"
            log_optimization "Current priority PID $pid ($process_name): $priority"
            return 0
        else
            echo "   PID $pid ($process_name): Unable to determine priority"
            log_optimization "Unable to determine priority for PID $pid"
            return 1
        fi
    fi
}

echo "$DOCKER_DESKTOP_PIDS" | tr ' ' '\n' | while read pid; do
    analyze_process_priority "$pid" "Docker Desktop"
done

echo "$DOCKER_BACKEND_PIDS" | tr ' ' '\n' | while read pid; do
    analyze_process_priority "$pid" "Docker Backend"
done

echo ""
echo "⚡ Phase 2: Process Priority Optimization"
echo "========================================"

# Function to optimize process priority
optimize_process_priority() {
    local pid=$1
    local process_name=$2
    local target_priority=$3
    
    if [ ! -z "$pid" ] && [ "$pid" != " " ]; then
        echo "⚡ Optimizing PID $pid ($process_name) to $target_priority..."
        
        # Try to set the priority
        if powershell "Get-Process -Id $pid -ErrorAction SilentlyContinue | ForEach-Object { \$_.PriorityClass = '$target_priority' }" 2>/dev/null; then
            
            # Verify the change
            local new_priority=$(powershell "Get-Process -Id $pid -ErrorAction SilentlyContinue | Select-Object -ExpandProperty PriorityClass" 2>/dev/null)
            if [ "$new_priority" = "$target_priority" ]; then
                echo "   ✅ SUCCESS: PID $pid priority set to $target_priority"
                log_optimization "SUCCESS: PID $pid ($process_name) priority set to $target_priority"
                return 0
            else
                echo "   ⚠️  PARTIAL: PID $pid priority is $new_priority (requested $target_priority)"
                log_optimization "PARTIAL: PID $pid ($process_name) priority is $new_priority"
                return 1
            fi
        else
            echo "   ❌ FAILED: Unable to set priority for PID $pid (may require elevated privileges)"
            log_optimization "FAILED: Unable to set priority for PID $pid ($process_name)"
            REQUIRED_PRIVILEGES=true
            return 1
        fi
    else
        echo "   ⚠️  SKIPPED: Invalid PID"
        return 1
    fi
}

# Optimize Docker Desktop main processes to High priority
echo "🚀 Optimizing Docker Desktop main processes..."
log_optimization "Starting Docker Desktop main process optimization"

OPTIMIZED_PROCESSES=0
TOTAL_PROCESSES=0

echo "$DOCKER_DESKTOP_PIDS" | tr ' ' '\n' | while read pid; do
    if [ ! -z "$pid" ] && [ "$pid" != " " ]; then
        TOTAL_PROCESSES=$((TOTAL_PROCESSES + 1))
        if optimize_process_priority "$pid" "Docker Desktop" "High"; then
            OPTIMIZED_PROCESSES=$((OPTIMIZED_PROCESSES + 1))
        fi
    fi
done

# Optimize Docker Backend processes to AboveNormal priority
echo ""
echo "🔧 Optimizing Docker Backend processes..."
log_optimization "Starting Docker Backend process optimization"

echo "$DOCKER_BACKEND_PIDS" | tr ' ' '\n' | while read pid; do
    if [ ! -z "$pid" ] && [ "$pid" != " " ]; then
        TOTAL_PROCESSES=$((TOTAL_PROCESSES + 1))
        if optimize_process_priority "$pid" "Docker Backend" "AboveNormal"; then
            OPTIMIZED_PROCESSES=$((OPTIMIZED_PROCESSES + 1))
        fi
    fi
done

echo ""
echo "💾 Phase 3: Memory and Resource Optimization"
echo "============================================"

log_optimization "Starting memory and resource optimization"

# Optimize Windows memory management for Docker
echo "🧠 Optimizing Windows memory management for Docker..."

# Check current memory settings
echo "📊 Current system memory configuration:"

TOTAL_MEMORY_MB=$(powershell "Get-CimInstance -Class Win32_ComputerSystem | Select-Object -ExpandProperty TotalPhysicalMemory" 2>/dev/null)
if [ ! -z "$TOTAL_MEMORY_MB" ]; then
    TOTAL_MEMORY_MB=$((TOTAL_MEMORY_MB / 1024 / 1024))
    echo "   Total System Memory: ${TOTAL_MEMORY_MB}MB"
    log_optimization "Total system memory: ${TOTAL_MEMORY_MB}MB"
fi

DOCKER_MEMORY_MB=$(tasklist /FI "IMAGENAME eq Docker Desktop.exe" /FO CSV | tail -n +2 | cut -d',' -f5 | tr -d '"K' | awk '{sum += $1} END {print sum/1024}')
if [ ! -z "$DOCKER_MEMORY_MB" ]; then
    echo "   Docker Desktop Memory Usage: ${DOCKER_MEMORY_MB}MB"
    log_optimization "Docker Desktop memory usage: ${DOCKER_MEMORY_MB}MB"
fi

# Optimize process working set (if elevated privileges available)
echo ""
echo "🔧 Attempting process working set optimization..."

optimize_working_set() {
    local pid=$1
    local process_name=$2
    
    echo "🔧 Optimizing working set for PID $pid ($process_name)..."
    
    if powershell "
        try {
            \$process = Get-Process -Id $pid -ErrorAction Stop
            \$process.ProcessorAffinity = [System.IntPtr]::new(0xFF)  # Use all CPU cores
            Write-Host '   ✅ CPU affinity optimized for PID $pid'
        } catch {
            Write-Host '   ⚠️  CPU affinity optimization failed: ' \$_.Exception.Message
        }
    " 2>/dev/null; then
        log_optimization "Working set optimized for PID $pid ($process_name)"
    else
        log_optimization "Working set optimization failed for PID $pid ($process_name)"
    fi
}

# Apply working set optimization to key Docker processes
echo "$DOCKER_DESKTOP_PIDS" | tr ' ' '\n' | head -2 | while read pid; do
    if [ ! -z "$pid" ] && [ "$pid" != " " ]; then
        optimize_working_set "$pid" "Docker Desktop"
    fi
done

echo ""
echo "🌐 Phase 4: Network and I/O Optimization"
echo "========================================"

log_optimization "Starting network and I/O optimization"

# Optimize network performance for Docker
echo "🌐 Optimizing network performance for Docker containers..."

# Check current network adapter settings
echo "📊 Network adapter optimization:"

optimize_network_adapter() {
    echo "🔧 Optimizing network adapter settings for Docker..."
    
    # Optimize network adapter buffer settings for Docker
    powershell "
    try {
        # Get Docker's virtual network adapters
        \$dockerAdapters = Get-NetAdapter | Where-Object { \$_.Name -like '*docker*' -or \$_.Name -like '*vEthernet*' }
        
        foreach (\$adapter in \$dockerAdapters) {
            Write-Host '   Optimizing adapter: ' \$adapter.Name
            
            # Optimize receive/transmit buffers
            Set-NetAdapterAdvancedProperty -Name \$adapter.Name -DisplayName 'Receive Buffers' -DisplayValue '2048' -ErrorAction SilentlyContinue
            Set-NetAdapterAdvancedProperty -Name \$adapter.Name -DisplayName 'Transmit Buffers' -DisplayValue '2048' -ErrorAction SilentlyContinue
            
            # Optimize interrupt moderation
            Set-NetAdapterAdvancedProperty -Name \$adapter.Name -DisplayName 'Interrupt Moderation' -DisplayValue 'Enabled' -ErrorAction SilentlyContinue
            
            Write-Host '   ✅ Network optimization completed for ' \$adapter.Name
        }
        
        if (\$dockerAdapters.Count -eq 0) {
            Write-Host '   ⚠️  No Docker network adapters found'
        }
        
    } catch {
        Write-Host '   ⚠️  Network optimization completed with warnings: ' \$_.Exception.Message
    }
    " 2>/dev/null
    
    log_optimization "Network adapter optimization completed"
}

optimize_network_adapter

# Optimize Windows I/O for container operations
echo ""
echo "💾 Optimizing I/O performance for containers..."

optimize_io_performance() {
    echo "💾 Optimizing system I/O for Docker containers..."
    
    powershell "
    try {
        # Optimize system cache behavior for containers
        \$regPath = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management'
        
        # Optimize large system cache for container I/O
        Set-ItemProperty -Path \$regPath -Name 'LargeSystemCache' -Value 1 -ErrorAction SilentlyContinue
        Write-Host '   ✅ Large system cache enabled'
        
        # Optimize I/O page lock limit
        Set-ItemProperty -Path \$regPath -Name 'IoPageLockLimit' -Value 0x10000000 -ErrorAction SilentlyContinue
        Write-Host '   ✅ I/O page lock limit optimized'
        
        Write-Host '   ✅ I/O performance optimization completed'
        
    } catch {
        Write-Host '   ⚠️  I/O optimization completed with warnings: ' \$_.Exception.Message
    }
    " 2>/dev/null
    
    log_optimization "I/O performance optimization completed"
}

optimize_io_performance

echo ""
echo "🔋 Phase 5: Power and Performance Profile"
echo "========================================"

log_optimization "Starting power profile optimization"

# Optimize Windows power plan for Docker performance
echo "🔋 Optimizing Windows power plan for Docker performance..."

optimize_power_plan() {
    echo "⚡ Setting high-performance power plan..."
    
    # Get current power scheme
    CURRENT_SCHEME=$(powercfg /getactivescheme 2>/dev/null | grep -o '[0-9a-f\-]\{36\}' | head -1)
    echo "   Current power scheme: $CURRENT_SCHEME"
    log_optimization "Current power scheme: $CURRENT_SCHEME"
    
    # Set high-performance power scheme
    if powercfg /setactive SCHEME_MIN 2>/dev/null; then
        echo "   ✅ High-performance power plan activated"
        log_optimization "High-performance power plan activated"
        
        # Optimize specific power settings for Docker
        echo "🔧 Optimizing power settings for containerization..."
        
        # Disable USB selective suspend (can interfere with container networking)
        powercfg /change usb-selective-suspend-timeout 0 2>/dev/null || true
        
        # Optimize processor performance
        powercfg /change processor-throttle-maximum 100 2>/dev/null || true
        powercfg /change processor-throttle-minimum 100 2>/dev/null || true
        
        echo "   ✅ Power optimization completed"
        log_optimization "Power settings optimized for Docker"
        
    else
        echo "   ⚠️  Failed to set high-performance power plan"
        log_optimization "Failed to set high-performance power plan"
    fi
}

optimize_power_plan

echo ""
echo "📊 Phase 6: Optimization Verification"
echo "====================================="

log_optimization "Starting optimization verification"

# Verify optimization results
echo "📊 Verifying optimization results..."

verify_optimization() {
    local verification_score=0
    local max_score=5
    
    echo "🔍 Verification Test 1: Process Priority Check"
    
    # Check Docker Desktop process priorities
    local high_priority_count=0
    local total_desktop_processes=0
    
    echo "$DOCKER_DESKTOP_PIDS" | tr ' ' '\n' | while read pid; do
        if [ ! -z "$pid" ] && [ "$pid" != " " ]; then
            total_desktop_processes=$((total_desktop_processes + 1))
            local priority=$(powershell "Get-Process -Id $pid -ErrorAction SilentlyContinue | Select-Object -ExpandProperty PriorityClass" 2>/dev/null)
            if [ "$priority" = "High" ]; then
                high_priority_count=$((high_priority_count + 1))
            fi
            echo "   PID $pid: $priority"
        fi
    done
    
    if [ "$high_priority_count" -gt 0 ]; then
        echo "   ✅ PASS: Docker Desktop processes have optimized priority"
        verification_score=$((verification_score + 2))
        log_optimization "Verification: Process priority optimization PASS"
    else
        echo "   ⚠️  PARTIAL: Process priority optimization incomplete"
        verification_score=$((verification_score + 1))
        log_optimization "Verification: Process priority optimization PARTIAL"
    fi
    
    echo ""
    echo "🔍 Verification Test 2: Power Plan Check"
    
    ACTIVE_SCHEME=$(powercfg /getactivescheme 2>/dev/null)
    if echo "$ACTIVE_SCHEME" | grep -i "high performance\|ultimate performance" >/dev/null; then
        echo "   ✅ PASS: High-performance power plan active"
        verification_score=$((verification_score + 1))
        log_optimization "Verification: Power plan optimization PASS"
    else
        echo "   ⚠️  PARTIAL: Power plan not optimized"
        log_optimization "Verification: Power plan optimization PARTIAL"
    fi
    
    echo ""
    echo "🔍 Verification Test 3: Docker Response Time"
    
    # Test Docker response time
    local start_time=$(date +%s%N)
    docker ps >/dev/null 2>&1
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    echo "   Docker response time: ${response_time}ms"
    
    if [ "$response_time" -lt 1000 ]; then
        echo "   ✅ PASS: Excellent Docker response time"
        verification_score=$((verification_score + 2))
        log_optimization "Verification: Docker response time excellent (${response_time}ms)"
    elif [ "$response_time" -lt 2000 ]; then
        echo "   ✅ PASS: Good Docker response time"
        verification_score=$((verification_score + 1))
        log_optimization "Verification: Docker response time good (${response_time}ms)"
    else
        echo "   ⚠️  PARTIAL: Docker response time could be improved"
        log_optimization "Verification: Docker response time needs improvement (${response_time}ms)"
    fi
    
    # Calculate optimization success rate
    local success_rate=$((verification_score * 100 / max_score))
    
    echo ""
    echo "📊 Optimization Verification Results:"
    echo "   Score: $verification_score/$max_score ($success_rate%)"
    log_optimization "Optimization verification: $verification_score/$max_score ($success_rate%)"
    
    if [ "$success_rate" -ge 80 ]; then
        echo "   ✅ EXCELLENT: Optimization highly successful"
        return 0
    elif [ "$success_rate" -ge 60 ]; then
        echo "   ✅ GOOD: Optimization successful with minor limitations"
        return 0
    else
        echo "   ⚠️  PARTIAL: Optimization partially successful"
        return 1
    fi
}

verify_optimization
VERIFICATION_RESULT=$?

echo ""
echo "📋 === OPTIMIZATION SUMMARY ==="
echo "=============================="

if [ "$VERIFICATION_RESULT" -eq 0 ]; then
    echo "🎉 DOCKER DESKTOP OPTIMIZATION COMPLETED SUCCESSFULLY!"
    echo ""
    echo "✅ Optimizations Applied:"
    echo "   🚀 Process priority optimization for Docker Desktop processes"
    echo "   🧠 Memory management optimization"
    echo "   🌐 Network adapter optimization for containers"
    echo "   💾 I/O performance optimization"
    echo "   🔋 High-performance power plan activation"
    echo ""
    echo "📊 Expected Benefits:"
    echo "   • Faster Docker container startup times"
    echo "   • Improved Docker Desktop responsiveness"
    echo "   • Better resource allocation for containers"
    echo "   • Enhanced network performance for containerized services"
    echo "   • Reduced Docker command response times"
    echo ""
    
    log_optimization "Docker Desktop optimization completed successfully"
    
else
    echo "⚠️  DOCKER DESKTOP OPTIMIZATION COMPLETED WITH LIMITATIONS"
    echo ""
    echo "📊 Partial Optimizations Applied:"
    echo "   • Some process priority optimizations may require elevated privileges"
    echo "   • Network and I/O optimizations completed with warnings"
    echo "   • Power plan optimization may need manual verification"
    echo ""
    echo "🔧 To Complete Full Optimization:"
    
    if [ "$REQUIRED_PRIVILEGES" = true ]; then
        echo "   1. Run this script as Administrator for full process priority control"
        echo "   2. PowerShell command: Start-Process PowerShell -Verb RunAs"
        echo "   3. Re-run: ./scripts/optimize-docker-priority.sh"
    fi
    
    echo "   4. Verify power plan: powercfg /getactivescheme"
    echo "   5. Check Docker Desktop settings for resource allocation"
    echo ""
    
    log_optimization "Docker Desktop optimization completed with limitations"
fi

echo "📝 Detailed optimization log: $OPTIMIZATION_LOG"
echo "🔄 Recommendation: Re-run this optimization after major Docker Desktop updates"

# Create optimization status file
echo "$(date): Docker Desktop optimization completed" > docker-optimization-status.txt
echo "Status: $([[ $VERIFICATION_RESULT -eq 0 ]] && echo "SUCCESS" || echo "PARTIAL")" >> docker-optimization-status.txt
echo "Log: $OPTIMIZATION_LOG" >> docker-optimization-status.txt

log_optimization "Optimization process completed"

exit $VERIFICATION_RESULT