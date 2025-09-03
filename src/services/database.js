import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from '../core/config.js';
import logger from '../core/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      logger.error('Failed to initialize database:', error);
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
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS guild_settings (
          id TEXT PRIMARY KEY,
          guild_id TEXT NOT NULL,
          setting_key TEXT NOT NULL,
          setting_value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(guild_id, setting_key),
          FOREIGN KEY (guild_id) REFERENCES guilds(discord_id)
        )
      `);

      logger.info('Database migrations completed');
    } catch (error) {
      logger.error('Failed to run migrations:', error);
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
      logger.error('Database query error:', error);
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
      logger.error('Database query error:', error);
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
      logger.error('Database execute error:', error);
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
