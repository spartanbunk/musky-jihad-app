const fs = require('fs')
const path = require('path')
const { query } = require('../database/connection')

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...')
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    
    // Split by semicolons and filter out empty statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.startsWith('--') || statement.length === 0) continue
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}`)
        await query(statement)
      } catch (error) {
        // Ignore "already exists" errors for development
        if (error.message.includes('already exists')) {
          console.log(`Skipping: ${error.message}`)
          continue
        }
        throw error
      }
    }
    
    console.log('✅ Database migrations completed successfully')
    
    // Verify tables exist
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log('📋 Created tables:')
    tableCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
}

module.exports = runMigrations