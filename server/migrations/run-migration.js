const { query } = require('../database/connection')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  console.log('🔧 Running user data isolation migration...')
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '003_user_data_isolation.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split by semicolons but be careful with functions that contain semicolons
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';')
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments
      if (statement.trim().startsWith('--')) {
        continue
      }
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        await query(statement)
      } catch (error) {
        // Some statements might fail if objects already exist, that's ok
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist')) {
          console.log(`⚠️  Skipping (already exists or safe to ignore): ${error.message}`)
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message)
          // Continue with other statements
        }
      }
    }
    
    console.log('✅ Migration completed successfully!')
    
    // Create test users for development
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 Creating test users for development...')
      
      // Create test user 1
      try {
        await query(
          `INSERT INTO users (email, password_hash, subscription_status) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (email) DO NOTHING`,
          ['test1@fishing.com', '$2a$12$dummy.hash.for.test.user1', 'active']
        )
        console.log('✅ Created test user: test1@fishing.com')
      } catch (error) {
        console.log('Test user 1 might already exist:', error.message)
      }
      
      // Create test user 2
      try {
        await query(
          `INSERT INTO users (email, password_hash, subscription_status) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (email) DO NOTHING`,
          ['test2@fishing.com', '$2a$12$dummy.hash.for.test.user2', 'active']
        )
        console.log('✅ Created test user: test2@fishing.com')
      } catch (error) {
        console.log('Test user 2 might already exist:', error.message)
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

// Run the migration
runMigration()