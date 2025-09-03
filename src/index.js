import BotClient from './discord/client.js';
import databaseService from './services/database.js';
import emailService from './services/email.js';
import config from './core/config.js';
import logger from './core/logger.js';
import healthMonitor from './core/healthMonitor.js';

/**
 * Validate environment variables before starting
 */
async function validateEnvironment() {
  logger.info('Validating environment configuration...');

  const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error('❌ Missing required environment variables:');
    missing.forEach(key => {
      logger.error(`   - ${key}`);
    });
    logger.error('');
    logger.error(
      'Please check your .env file and ensure all required variables are set.'
    );
    logger.error(
      'You can copy env.example to .env and fill in your Discord bot credentials.'
    );
    logger.error('');
    logger.error('Required variables:');
    logger.error('  DISCORD_TOKEN - Your Discord bot token');
    logger.error('  DISCORD_CLIENT_ID - Your Discord application client ID');
    logger.error('');
    logger.error('Optional variables:');
    logger.error(
      '  DISCORD_GUILD_ID - Guild ID for guild-specific commands (recommended for development)'
    );
    logger.error(
      '  DATABASE_PATH - Path to SQLite database file (defaults to ./data/bot.db)'
    );
    logger.error('  NODE_ENV - Environment (development/production)');
    logger.error('  LOG_LEVEL - Logging level (error/warn/info/debug)');
    logger.error('  EMAIL - Email address for notifications');
    logger.error('  EMAIL_PASSWORD - Email password for notifications');

    // Try to send email notification
    try {
      emailService.initialize();
      if (emailService.isEmailConfigured()) {
        logger.info(
          '📧 Sending email notification about missing environment variables...'
        );
        await emailService.sendEnvValidationFailure(missing);
      } else {
        logger.warn('📧 Email service not configured, skipping notification');
      }
    } catch (error) {
      logger.error('Failed to send email notification:', error);
    }

    process.exit(1);
  }

  // Validate token format
  if (
    process.env.DISCORD_TOKEN &&
    !process.env.DISCORD_TOKEN.match(/^[A-Za-z0-9._-]+$/)
  ) {
    logger.error(
      '❌ Invalid DISCORD_TOKEN format. Discord bot tokens should only contain alphanumeric characters, dots, underscores, and hyphens.'
    );
    process.exit(1);
  }

  // Validate client ID format
  if (
    process.env.DISCORD_CLIENT_ID &&
    !process.env.DISCORD_CLIENT_ID.match(/^\d{17,19}$/)
  ) {
    logger.error(
      '❌ Invalid DISCORD_CLIENT_ID format. Discord client IDs should be 17-19 digit numbers.'
    );
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
    await validateEnvironment();

    logger.info(`Environment: ${config.app.nodeEnv}`);

    // Initialize database
    logger.info('Initializing database...');
    await databaseService.initialize();

    // Initialize email service
    logger.info('Initializing email service...');
    const emailInitialized = emailService.initialize();
    if (emailInitialized) {
      logger.info('✅ Email service initialized successfully');
      // Test email connection
      const connectionTest = await emailService.testConnection();
      if (!connectionTest) {
        logger.warn('⚠️  Email connection test failed - notifications may not work');
      }
    } else {
      logger.warn('⚠️  Email service not configured - notifications will be disabled');
      logger.warn('   To enable email notifications, set EMAIL and EMAIL_PASSWORD in your .env file');
    }

    // Initialize Discord bot
    logger.info('Initializing Discord bot...');
    const client = new BotClient();
    await client.initialize();

    // Initialize health monitoring
    logger.info('Initializing health monitoring...');
    await healthMonitor.initialize(client);

    // Graceful shutdown handling
    process.on('SIGINT', async() => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await shutdown(client);
    });

    process.on('SIGTERM', async() => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await shutdown(client);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async error => {
      logger.critical('Uncaught Exception - bot will crash', 'process', error);
      
      // Send email notification for critical error
      if (emailService.isEmailConfigured()) {
        try {
          await emailService.sendCriticalErrorNotification(error, 'uncaughtException');
        } catch (emailError) {
          logger.error('Failed to send critical error notification:', emailError);
        }
      }
      
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      logger.critical(
        'Unhandled Promise Rejection - bot will crash',
        'process',
        reason
      );
      
      // Send email notification for critical error
      if (emailService.isEmailConfigured()) {
        try {
          await emailService.sendCriticalErrorNotification(reason, 'unhandledRejection');
        } catch (emailError) {
          logger.error('Failed to send critical error notification:', emailError);
        }
      }
      
      process.exit(1);
    });

    logger.info('Atom Bot started successfully!');

    // Send startup notification if email is configured
    if (emailService.isEmailConfigured()) {
      try {
        await emailService.sendStartupNotification();
        logger.info('📧 Startup notification sent');
      } catch (error) {
        logger.warn('Failed to send startup notification:', error);
      }
    }
  } catch (error) {
    logger.critical(
      'Failed to start Atom Bot - startup failure',
      'startup',
      error
    );
    
    // Send email notification for startup failure
    if (emailService.isEmailConfigured()) {
      try {
        await emailService.sendCriticalErrorNotification(error, 'startup');
      } catch (emailError) {
        logger.error('Failed to send startup failure notification:', emailError);
      }
    }
    
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
    logger.critical(
      'Error during shutdown - graceful shutdown failed',
      'shutdown',
      error
    );
    process.exit(1);
  }
}

// Start the application
main();
