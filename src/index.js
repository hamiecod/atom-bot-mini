import BotClient from './discord/client.js';
import databaseService from './services/database.js';
import config from './core/config.js';
import logger from './core/logger.js';

/**
 * Validate environment variables before starting
 */
function validateEnvironment() {
  logger.info('Validating environment configuration...');
  
  const required = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error('❌ Missing required environment variables:');
    missing.forEach(key => {
      logger.error(`   - ${key}`);
    });
    logger.error('');
    logger.error('Please check your .env file and ensure all required variables are set.');
    logger.error('You can copy env.example to .env and fill in your Discord bot credentials.');
    logger.error('');
    logger.error('Required variables:');
    logger.error('  DISCORD_TOKEN - Your Discord bot token');
    logger.error('  DISCORD_CLIENT_ID - Your Discord application client ID');
    logger.error('');
    logger.error('Optional variables:');
    logger.error('  DISCORD_GUILD_ID - Guild ID for guild-specific commands (recommended for development)');
    logger.error('  DATABASE_PATH - Path to SQLite database file (defaults to ./data/bot.db)');
    logger.error('  NODE_ENV - Environment (development/production)');
    logger.error('  LOG_LEVEL - Logging level (error/warn/info/debug)');
    
    process.exit(1);
  }

  // Validate token format
  if (process.env.DISCORD_TOKEN && !process.env.DISCORD_TOKEN.match(/^[A-Za-z0-9._-]+$/)) {
    logger.error('❌ Invalid DISCORD_TOKEN format. Discord bot tokens should only contain alphanumeric characters, dots, underscores, and hyphens.');
    process.exit(1);
  }

  // Validate client ID format
  if (process.env.DISCORD_CLIENT_ID && !process.env.DISCORD_CLIENT_ID.match(/^\d{17,19}$/)) {
    logger.error('❌ Invalid DISCORD_CLIENT_ID format. Discord client IDs should be 17-19 digit numbers.');
    process.exit(1);
  }

  logger.info('✅ Environment validation passed');
}

/**
 * Main application entry point
 * Initializes all services and starts the bot
 */
async function main() {
  try {
    logger.info('Starting Atom Bot...');
    
    // Validate environment variables first
    validateEnvironment();
    
    logger.info(`Environment: ${config.app.nodeEnv}`);

    // Initialize database
    logger.info('Initializing database...');
    await databaseService.initialize();

    // Initialize Discord bot
    logger.info('Initializing Discord bot...');
    const client = new BotClient();
    await client.initialize();

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await shutdown(client);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await shutdown(client);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    logger.info('Atom Bot started successfully!');
  } catch (error) {
    logger.error('Failed to start Atom Bot:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown function
 */
async function shutdown(client) {
  try {
    if (client) {
      await client.shutdown();
    }
    
    if (databaseService.isDatabaseConnected()) {
      await databaseService.close();
    }
    
    logger.info('Shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start the application
main();
