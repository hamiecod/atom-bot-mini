import logger from '../../core/logger.js';
import guildSettings from '../../services/guildSettings.js';

/**
 * Check and notify about missing leaderboard channel bindings
 * @param {Client} client - Discord client instance
 */
async function checkLeaderboardBindings(client) {
  try {
    logger.info('Checking leaderboard channel bindings for all guilds...');
    
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const settings = await guildSettings.getGuildSettings(guildId);
        
        // Check if leaderboard channel is not bound
        if (!settings || !settings.leaderboard_channel_id) {
          logger.info(`Leaderboard channel not bound for guild: ${guild.name} (${guildId})`);
          
          // Check if admin role is set
          if (settings && settings.admin_role_id) {
            // Send DM to admin role members
            const adminRole = guild.roles.cache.get(settings.admin_role_id);
            if (adminRole) {
              const adminMembers = adminRole.members;
              logger.info(`Notifying ${adminMembers.size} admin role members in ${guild.name}`);
              
              for (const [memberId, member] of adminMembers) {
                try {
                  await member.send(
                    `🔔 **Configuration Notice**\n\n` +
                    `The leaderboard channel is not set up for **${guild.name}**.\n\n` +
                    `To set up the leaderboard channel, use the \`/bind\` command in your server.\n\n` +
                    `This will ensure the leaderboard command works properly in your server.`
                  );
                  logger.debug(`Sent leaderboard notification to admin: ${member.user.tag}`);
                } catch (dmError) {
                  logger.warn(`Failed to send DM to admin ${member.user.tag}: ${dmError.message}`);
                }
              }
            } else {
              logger.warn(`Admin role ${settings.admin_role_id} not found in guild ${guild.name}`);
            }
          } else {
            // Send DM to server owner
            try {
              const owner = await guild.fetchOwner();
              await owner.send(
                `🔔 **Configuration Notice**\n\n` +
                `The leaderboard channel is not set up for **${guild.name}**.\n\n` +
                `To set up the leaderboard channel, use the \`/bind\` command in your server.\n\n` +
                `This will ensure the leaderboard command works properly in your server.`
              );
              logger.info(`Sent leaderboard notification to server owner: ${owner.user.tag}`);
            } catch (ownerError) {
              logger.warn(`Failed to send DM to server owner: ${ownerError.message}`);
            }
          }
        }
      } catch (guildError) {
        logger.warn(`Failed to check leaderboard binding for guild ${guild.name}: ${guildError.message}`);
      }
    }
    
    logger.info('Finished checking leaderboard channel bindings');
  } catch (error) {
    logger.error('Failed to check leaderboard bindings:', error);
  }
}

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

    // Check leaderboard channel bindings and notify if needed
    try {
      await checkLeaderboardBindings(client);
    } catch (error) {
      logger.error('Failed to check leaderboard bindings on ready:', error);
    }
  }
};
