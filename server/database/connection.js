const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection
pool.on('connect', () => {
  console.log('🐘 Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err)
  process.exit(-1)
})

// Helper function to execute queries
const query = async (text, params = []) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Query executed:', { text: text.substring(0, 50), duration, rows: res.rowCount })
    return res
  } catch (error) {
    const duration = Date.now() - start
    console.error('Query error:', { text: text.substring(0, 50), duration, error: error.message })
    throw error
  }
}

// Helper function to get a client for transactions
const getClient = async () => {
  const client = await pool.connect()
  const query = client.query
  const release = client.release
  
  // Set a timeout of 5 seconds for transactions
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!')
    console.error('The last executed query on this client was:', client.lastQuery)
  }, 5000)
  
  client.query = (...args) => {
    client.lastQuery = args
    return query.apply(client, args)
  }
  
  client.release = () => {
    clearTimeout(timeout)
    client.query = query
    client.release = release
    return release.apply(client)
  }
  
  return client
}

module.exports = {
  pool,
  query,
  getClient
}