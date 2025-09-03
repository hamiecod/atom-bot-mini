import logger from '../../core/logger.js';

/**
 * Ready event handler
 * Fired when the bot is ready and connected to Discord
 * Logs how many servers the bot is in, changes the bot's status and registers all slash commands with discord
 */
export default {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
    logger.info(`Bot is in ${client.guilds.cache.size} guild(s)`);
    
    // Set bot status
    client.user.setActivity('with clips', { type: 'PLAYING' });
    
    // Register slash commands
    try {
      await client.registerCommands();
    } catch (error) {
      logger.error('Failed to register commands on ready:', error);
    }
  },
};
