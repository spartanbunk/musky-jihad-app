# Database Backups

## Current Backups

### db_backup_20250813_122654.sql
- **Date:** August 13, 2025 at 12:26:54 PM
- **Size:** 45KB
- **Contains:**
  - Complete schema with all tables
  - User data (including spartanbunk@gmail.com with working password hash)
  - Fish catches data (20 catches)
  - All supporting data (species, analytics, etc.)
- **Status:** ✅ Verified working backup after session fixes

## How to Restore

### Restore to Docker Container
```bash
# Stop current containers
docker-compose down

# Remove old volume (WARNING: destroys current data)
docker volume rm musky_jihad_postgres_data

# Start containers fresh
docker-compose up db -d

# Wait for DB to be ready, then restore
docker-compose exec db psql -U fishing_user -d lake_st_clair_fishing < backups/db_backup_20250813_122654.sql
```

### Create New Backup
```bash
# Create timestamped backup
docker-compose exec db pg_dump -U fishing_user -d lake_st_clair_fishing > backups/db_backup_$(date +%Y%m%d_%H%M%S).sql
```

## Backup Contents Verified
- ✅ Schema structure
- ✅ User accounts (4 users total)
- ✅ Working password hash for spartanbunk@gmail.com
- ✅ Fish catches data (26 references in backup)
- ✅ Species configuration
- ✅ All database extensions (uuid-ossp)

This backup was created immediately after successful session fixes ensuring authentication and data integrity.