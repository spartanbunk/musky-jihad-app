# Daily Fishing Report Database Storage Plan

## 🎯 **Objective**
Implement database storage for daily fishing reports to minimize token usage by serving cached reports and only refreshing once per day at 12:01 AM.

## 🗄️ **Database Design**

### **Daily Reports Table**
```sql
CREATE TABLE daily_fishing_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(50) DEFAULT 'perplexity-ai',
  location VARCHAR(100) DEFAULT 'Lake St. Clair, MI',
  cache_status VARCHAR(20) DEFAULT 'fresh',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_daily_reports_date ON daily_fishing_reports(report_date);
```

## 📋 **Implementation Steps**

### 1. **Database Setup** (`server/models/DailyReport.js`)
```javascript
class DailyReport {
  static async getTodaysReport() {
    // Get today's report from database
  }
  
  static async createOrUpdateReport(reportData) {
    // Insert or update today's report
  }
  
  static async needsRefresh() {
    // Check if report exists for today
  }
}
```

### 2. **Scheduled Report Generation** (`server/services/reportScheduler.js`)
```javascript
class ReportScheduler {
  static startScheduler() {
    // Schedule daily report generation at 12:01 AM
    cron.schedule('1 0 * * *', generateDailyReport)
  }
  
  static async generateDailyReport() {
    // Call Perplexity API once per day
    // Save to database
  }
}
```

### 3. **Updated API Endpoints** (`server/routes/fishingReports.js`)
```javascript
router.get('/daily-fishing-report', async (req, res) => {
  // 1. Check database for today's report
  // 2. If exists, return immediately (no API call)
  // 3. If missing, generate and save
  // 4. Always serve from database
})
```

### 4. **Frontend Changes** (`src/components/FishingDashboard.js`)
```javascript
// Re-enable automatic fetching (now database-backed)
fetchDailyReport() // Safe to call - no API costs
```

## ⏰ **Scheduling Strategy**

### **Daily Refresh Schedule**
- **Time**: 12:01 AM Eastern Time
- **Frequency**: Once per day
- **Fallback**: Manual refresh endpoint for emergencies

### **Cron Job Implementation**
```javascript
// 12:01 AM every day
cron.schedule('1 0 * * *', async () => {
  console.log('🌙 Generating daily fishing report...')
  await generateAndStoreDailyReport()
})
```

## 🔄 **Request Flow**

### **Page Load/Refresh**
```
User Request → Check Database → Return Cached Report
                     ↓
              No API Call (0 tokens)
```

### **Daily Generation (12:01 AM)**
```
Cron Job → Perplexity API → Database Storage
              ↓
         (~1200 tokens once/day)
```

## 💾 **Database Benefits**

1. **Token Efficiency**: 1 API call per day vs 100s of calls
2. **Fast Loading**: Instant database retrieval vs 15-25 second API calls
3. **Reliability**: Always available, no API timeouts for users
4. **Consistency**: Same report all day, professional appearance
5. **Cost Control**: Predictable daily token usage

## 🛠️ **Technical Implementation**

### **Database Connection** (PostgreSQL/SQLite)
- Use existing database connection
- Add migration for new table
- Include proper indexing

### **Error Handling**
```javascript
// If Perplexity fails at midnight
- Retry 3 times with exponential backoff  
- Keep previous day's report if all retries fail
- Log errors for monitoring
```

### **Manual Override**
```javascript
// Emergency refresh endpoint
router.post('/daily-fishing-report/refresh', async (req, res) => {
  // Admin endpoint to force regeneration
})
```

## 📊 **Performance Metrics**

### **Before (Current)**
- **API Calls**: ~50-100 per day (user-triggered)
- **Load Time**: 15-25 seconds
- **Token Usage**: ~60,000-120,000 per day
- **Reliability**: 60% (timeouts)

### **After (Database)**
- **API Calls**: 1 per day (scheduled)
- **Load Time**: <500ms
- **Token Usage**: ~1,200 per day
- **Reliability**: 99%+ (database)

## 🚀 **Deployment Steps**

1. **Create database migration**
2. **Implement DailyReport model**
3. **Set up cron scheduler**
4. **Update API endpoints**
5. **Re-enable frontend fetching**
6. **Test scheduled generation**
7. **Monitor token usage**

## 🔧 **Configuration**

### **Environment Variables**
```env
# Scheduler settings
REPORT_GENERATION_TIME="1 0 * * *"  # 12:01 AM
REPORT_TIMEZONE="America/New_York"  # Eastern Time
REPORT_RETRY_ATTEMPTS=3
```

## ✅ **Success Criteria**

1. **✅ Single daily API call** at 12:01 AM
2. **✅ Instant page loads** from database
3. **✅ 95%+ token reduction** vs current usage
4. **✅ Reliable report availability** for users
5. **✅ Automatic refresh** without user intervention

This approach provides massive token savings while ensuring users always have access to fresh daily fishing reports!