import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import logger from '../../../core/logger.js';
import config from '../../../core/config.js';

/**
 * Info command - displays bot information
 */
export default {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Display information about the bot'),

  async execute(interaction, client) {
    try {
      const embed = new EmbedBuilder()
        .setTitle('🤖 Atom Bot Information')
        .setDescription('A modular Discord.js bot with SQLite database')
        .setColor(0x00ff00)
        .addFields(
          {
            name: '📊 Statistics',
            value: [
              `**Servers:** ${client.guilds.cache.size}`,
              `**Users:** ${client.users.cache.size}`,
              `**Commands:** ${client.commands.size}`,
              `**Uptime:** ${this.formatUptime(client.uptime)}`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🔧 Technical Details',
            value: [
              `**Node.js:** ${process.version}`,
              `**Discord.js:** ${require('discord.js').version}`,
              `**Environment:** ${config.app.nodeEnv}`,
              `**Database:** SQLite`,
            ].join('\n'),
            inline: true,
          }
        )
        .setTimestamp()
        .setFooter({ 
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        });

      await interaction.reply({ embeds: [embed] });
      logger.info(`Info command executed by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error in info command:', error);
      throw error;
    }
  },

  /**
   * Format uptime in a human-readable format
   */
  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  },
};
