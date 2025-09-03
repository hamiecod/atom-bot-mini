import BotClient from './discord/client.js';
import databaseService from './services/database.js';
import config from './core/config.js';
import logger from './core/logger.js';

/**
 * Main application entry point
 * Initializes all services and starts the bot
 */
async function main() {
  try {
    logger.info('Starting Atom Bot...');
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
