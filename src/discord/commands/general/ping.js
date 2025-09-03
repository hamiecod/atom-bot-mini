import { SlashCommandBuilder, MessageFlags } from 'discord.js';

import logger from '../../../core/logger.js';
import guildSettingsService from '../../../services/guildSettings.js';
import CommandUtils from '../../../core/commandUtils.js';

/**
 * Ping-stats command - sends pong to the bound stats channel or shows a warning
 */
export default {
  data: new SlashCommandBuilder()
    .setName('ping-stats')
    .setDescription('Sends pong to the bound stats channel or shows a warning if no channel is bound'),

  async execute(interaction, client) {
    try {
      // Check if command is used in a guild
      if (!interaction.guild) {
        await CommandUtils.sendErrorResponse(interaction, '❌ This command can only be used in a server.');
        return;
      }

      const guildId = interaction.guild.id;
      
      // Get the stats channel ID from guild settings
      const statsChannelId = await guildSettingsService.getGuildSetting(guildId, 'stats_channel_id');
      
      if (statsChannelId) {
        // If stats channel is bound, send pong to that channel
        const statsChannel = interaction.guild.channels.cache.get(statsChannelId);
        
        if (statsChannel) {
          await statsChannel.send('🏓 Pong!');
          
          // Reply to the user in the current channel that pong was sent to the stats channel
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: `✅ Pong sent to ${statsChannel}!`
            });
          }
          
          CommandUtils.logCommandExecution('ping-stats', interaction, `Pong sent to stats channel ${statsChannel.name}`);
        } else {
          // Stats channel was deleted or is inaccessible
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: '⚠️ The bound stats channel no longer exists. Please rebind using `/bind stats <channel>`.'
            });
          }
        }
      } else {
        // No stats channel bound, show warning in current channel
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '⚠️ No stats channel is bound. Use `/bind stats <channel>` to bind a channel first.'
          });
        }
      }
    } catch (error) {
      logger.error('Error in ping-stats command:', error);
      
      await CommandUtils.sendErrorResponse(interaction, '❌ There was an error while processing the ping-stats command.');
    }
  }
};
