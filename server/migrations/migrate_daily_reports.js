const fs = require('fs')
const path = require('path')
const { query } = require('../database/connection')

async function runDailyReportsMigration() {
  try {
    console.log('🔄 Starting daily reports migration...')
    
    // Read the daily reports migration file
    const migrationPath = path.join(__dirname, '001_add_daily_fishing_reports.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && !statement.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}`)
        console.log(`SQL: ${statement.substring(0, 50)}...`)
        
        try {
          await query(statement)
          console.log(`✅ Statement ${i + 1} executed successfully`)
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`ℹ️ Statement ${i + 1} already exists, skipping...`)
          } else {
            throw error
          }
        }
      }
    }
    
    console.log('✅ Daily reports migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Run the migration
runDailyReportsMigration()
  .then(() => {
    console.log('Migration script finished')
    process.exit(0)
  })
  .catch(error => {
    console.error('Migration script error:', error)
    process.exit(1)
  })