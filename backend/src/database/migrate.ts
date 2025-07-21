import fs from 'fs';
import path from 'path';
import pool from './connection';

interface MigrationRecord {
  id: number;
  filename: string;
  executed_at: Date;
  checksum: string;
}

// Create migrations tracking table
const createMigrationsTable = async (): Promise<void> => {
  const sql = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW(),
      checksum VARCHAR(64) NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename ON schema_migrations(filename);
  `;
  
  await pool.query(sql);
};

// Calculate checksum for migration file
const calculateChecksum = (content: string): string => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
};

// Get executed migrations
const getExecutedMigrations = async (): Promise<MigrationRecord[]> => {
  const result = await pool.query(
    'SELECT * FROM schema_migrations ORDER BY filename'
  );
  return result.rows;
};

// Record migration execution
const recordMigration = async (filename: string, checksum: string): Promise<void> => {
  await pool.query(
    'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
    [filename, checksum]
  );
};

// Validate migration integrity
const validateMigration = (filename: string, currentChecksum: string, executedMigrations: MigrationRecord[]): void => {
  const executed = executedMigrations.find(m => m.filename === filename);
  if (executed && executed.checksum !== currentChecksum) {
    throw new Error(`Migration ${filename} has been modified after execution. Checksum mismatch.`);
  }
};

export const runMigrations = async (): Promise<void> => {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Create migrations tracking table
    await createMigrationsTable();
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const executedMigrations = await getExecutedMigrations();
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.some(m => m.filename === file)
    );

    console.log(`📦 Found ${migrationFiles.length} total migrations`);
    console.log(`✅ ${executedMigrations.length} already executed`);
    console.log(`⏳ ${pendingMigrations.length} pending execution`);

    // Validate existing migrations haven't been modified
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      const checksum = calculateChecksum(sql);
      validateMigration(file, checksum, executedMigrations);
    }

    // Run pending migrations
    for (const file of pendingMigrations) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      const checksum = calculateChecksum(sql);
      
      console.log(`⚡ Running migration: ${file}`);
      await client.query(sql);
      await recordMigration(file, checksum);
      console.log(`✅ Migration completed: ${file}`);
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('🎉 All migrations completed successfully');
    
  } catch (error) {
    // Rollback transaction
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Rollback last migration (for development/staging)
export const rollbackLastMigration = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Rollback is not allowed in production environment');
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'SELECT * FROM schema_migrations ORDER BY executed_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    const lastMigration = result.rows[0];
    console.log(`🔄 Rolling back migration: ${lastMigration.filename}`);
    
    // Check if rollback file exists
    const rollbackFile = lastMigration.filename.replace('.sql', '.rollback.sql');
    const rollbackPath = path.join(__dirname, 'migrations', rollbackFile);
    
    if (fs.existsSync(rollbackPath)) {
      const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');
      await client.query(rollbackSql);
    } else {
      console.warn(`⚠️ No rollback file found for ${lastMigration.filename}`);
    }
    
    // Remove migration record
    await client.query(
      'DELETE FROM schema_migrations WHERE filename = $1',
      [lastMigration.filename]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Rollback completed: ${lastMigration.filename}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Get migration status
export const getMigrationStatus = async (): Promise<void> => {
  try {
    await createMigrationsTable();
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const executedMigrations = await getExecutedMigrations();
    
    console.log('\n📊 Migration Status:');
    console.log('==================');
    
    for (const file of migrationFiles) {
      const executed = executedMigrations.find(m => m.filename === file);
      const status = executed ? '✅ Executed' : '⏳ Pending';
      const date = executed ? executed.executed_at.toISOString() : '';
      console.log(`${status} ${file} ${date}`);
    }
    
    console.log(`\nTotal: ${migrationFiles.length}, Executed: ${executedMigrations.length}, Pending: ${migrationFiles.length - executedMigrations.length}`);
    
  } catch (error) {
    console.error('❌ Failed to get migration status:', error);
    throw error;
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'rollback':
      rollbackLastMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'status':
      getMigrationStatus()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    default:
      runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
  }
}