import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { join } from 'path';
import config from '../core/config.js';
import logger from '../core/logger.js';

/**
 * Database service for SQLite operations
 * Provides a clean interface for database interactions
 */
class DatabaseService {
  constructor() {
    this.db = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection and run migrations
   */
  async initialize() {
    try {
      // Ensure data directory exists
      const fs = await import('fs');
      const dataDir = config.dataDir;
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        logger.info(`Created data directory: ${dataDir}`);
      }

      // Open database connection
      const dbPath = join(dataDir, 'bot.db');
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });

      this.isConnected = true;
      logger.info(`Connected to database: ${dbPath}`);

      // Run initial migrations
      await this.runMigrations();

      logger.info('Database initialization completed');
    } catch (error) {
      logger.critical('Database initialization failed - bot cannot function without database', 'database', error);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      // Create users table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          discord_id TEXT UNIQUE NOT NULL,
          username TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create guilds table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS guilds (
          id TEXT PRIMARY KEY,
          discord_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create settings table for guild-specific configurations
      // First, check if old schema exists and migrate if needed
      const oldSchemaExists = await this.db.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='guild_settings' AND sql LIKE '%setting_key%'
      `);

      if (oldSchemaExists) {
        logger.info('Detected old guild_settings schema, migrating...');
        
        // Create new table with correct schema
        await this.db.exec(`
          CREATE TABLE IF NOT EXISTS guild_settings_new (
            guild_id TEXT PRIMARY KEY,
            stats_channel_id TEXT,
            leaderboard_channel_id TEXT,
            admin_role_id TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guild_id) REFERENCES guilds(discord_id)
          )
        `);

        // Migrate data from old schema to new schema
        const oldSettings = await this.db.all(`SELECT * FROM guild_settings`);
        for (const setting of oldSettings) {
          const newSettings = {
            guild_id: setting.guild_id,
            stats_channel_id: null,
            leaderboard_channel_id: null,
            admin_role_id: null,
            updated_at: setting.updated_at
          };

          // Map old setting_key values to new columns
          if (setting.setting_key === 'stats_channel_id') {
            newSettings.stats_channel_id = setting.setting_value;
          } else if (setting.setting_key === 'leaderboard_channel_id') {
            newSettings.leaderboard_channel_id = setting.setting_value;
          } else if (setting.setting_key === 'admin_role_id') {
            newSettings.admin_role_id = setting.setting_value;
          }

          await this.db.run(`
            INSERT OR REPLACE INTO guild_settings_new 
            (guild_id, stats_channel_id, leaderboard_channel_id, admin_role_id, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `, [newSettings.guild_id, newSettings.stats_channel_id, newSettings.leaderboard_channel_id, newSettings.admin_role_id, newSettings.updated_at]);
        }

        // Drop old table and rename new table
        await this.db.exec(`DROP TABLE guild_settings`);
        await this.db.exec(`ALTER TABLE guild_settings_new RENAME TO guild_settings`);
        
        logger.info('Guild settings schema migration completed');
      } else {
        // Create new table with correct schema
        await this.db.exec(`
          CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id TEXT PRIMARY KEY,
            stats_channel_id TEXT,
            leaderboard_channel_id TEXT,
            admin_role_id TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guild_id) REFERENCES guilds(discord_id)
          )
        `);
      }

      // Clean up old unused tables
      const commandBindingsExists = await this.db.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='command_bindings'
      `);
      
      if (commandBindingsExists) {
        logger.info('Removing unused command_bindings table...');
        await this.db.exec(`DROP TABLE command_bindings`);
      }

      logger.info('Database migrations completed');
    } catch (error) {
      logger.critical('Database migrations failed - bot cannot function without proper schema', 'database', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDatabase() {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Execute a query with parameters
   */
  async query(sql, params = []) {
    try {
      const db = this.getDatabase();
      return await db.all(sql, params);
    } catch (error) {
      logger.critical('Database query failed', 'database', error);
      throw error;
    }
  }

  /**
   * Execute a single row query
   */
  async queryOne(sql, params = []) {
    try {
      const db = this.getDatabase();
      return await db.get(sql, params);
    } catch (error) {
      logger.critical('Database single query failed', 'database', error);
      throw error;
    }
  }

  /**
   * Execute an insert/update/delete query
   */
  async execute(sql, params = []) {
    try {
      const db = this.getDatabase();
      const result = await db.run(sql, params);
      return result;
    } catch (error) {
      logger.critical('Database execute operation failed', 'database', error);
      throw error;
    }
  }

  /**
   * Begin a transaction
   */
  async beginTransaction() {
    const db = this.getDatabase();
    await db.exec('BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  async commitTransaction() {
    const db = this.getDatabase();
    await db.exec('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction() {
    const db = this.getDatabase();
    await db.exec('ROLLBACK');
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.isConnected = false;
      logger.info('Database connection closed');
    }
  }

  /**
   * Check if database is connected
   */
  isDatabaseConnected() {
    return this.isConnected;
  }
}

// Export singleton instance
export default new DatabaseService();
