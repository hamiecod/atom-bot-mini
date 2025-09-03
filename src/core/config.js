import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Configuration management for the bot
 * Loads and validates environment variables
 */
class Config {
  constructor() {
    this.validateConfig();
  }

  /**
   * Discord bot configuration
   */
  get discord() {
    return {
      token: process.env.DISCORD_TOKEN,
      clientId: process.env.DISCORD_CLIENT_ID,
      guildId: process.env.DISCORD_GUILD_ID,
    };
  }

  /**
   * Database configuration
   */
  get database() {
    return {
      path: process.env.DATABASE_PATH || './data/bot.db',
    };
  }

  /**
   * Application configuration
   */
  get app() {
    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',
    };
  }

  /**
   * Validate that all required configuration is present
   * Note: Main validation is done in index.js for better error messages
   */
  validateConfig() {
    // Warn about optional but recommended variables
    if (!process.env.DISCORD_GUILD_ID) {
      console.warn('⚠️  DISCORD_GUILD_ID not set. Bot will register commands globally.');
    }
  }

  /**
   * Get the project root directory
   */
  get projectRoot() {
    return join(__dirname, '..', '..');
  }

  /**
   * Get the data directory path
   */
  get dataDir() {
    return join(this.projectRoot, 'data');
  }
}

// Export singleton instance
export default new Config();
