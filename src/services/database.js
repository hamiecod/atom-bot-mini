import { join } from 'path';

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import config from '../core/config.js';
import logger from '../core/logger.js';
import MigrationRunner from '../data/migrations/migrationRunner.js';

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
        driver: sqlite3.Database
      });

      this.isConnected = true;
      logger.info(`Connected to database: ${dbPath}`);

      // Run initial migrations
      await this.runMigrations();

      logger.info('Database initialization completed');
    } catch (error) {
      logger.critical(
        'Database initialization failed - bot cannot function without database',
        'database',
        error
      );
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      // Create core tables first (these are not in migration files)
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          discord_id TEXT UNIQUE NOT NULL,
          username TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS guilds (
          id TEXT PRIMARY KEY,
          discord_id TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Clean up old unused tables
      const commandBindingsExists = await this.db.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='command_bindings'
      `);

      if (commandBindingsExists) {
        logger.info('Removing unused command_bindings table...');
        await this.db.exec('DROP TABLE command_bindings');
      }

      // Run migration files
      const migrationRunner = new MigrationRunner(this.db);
      await migrationRunner.runPendingMigrations();

      logger.info('Database migrations completed');
    } catch (error) {
      logger.critical(
        'Database migrations failed - bot cannot function without proper schema',
        'database',
        error
      );
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
