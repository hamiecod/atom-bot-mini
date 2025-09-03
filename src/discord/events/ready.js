import logger from '../../core/logger.js';

/**
 * Ready event handler
 * Fired when the bot is ready and connected to Discord
 */
export default {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
    logger.info(`Bot is in ${client.guilds.cache.size} guild(s)`);
    
    // Set bot status
    client.user.setActivity('with atoms', { type: 'PLAYING' });
    
    // Register slash commands
    try {
      await client.registerCommands();
    } catch (error) {
      logger.error('Failed to register commands on ready:', error);
    }
  },
};
