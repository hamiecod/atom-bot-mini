import { SlashCommandBuilder } from 'discord.js';
import logger from '../../../core/logger.js';

/**
 * Ping-stats command - tests bot responsiveness and shows latency statistics
 */
export default {
  data: new SlashCommandBuilder()
    .setName('ping-stats')
    .setDescription('Replies with Pong! and shows bot latency'),

  async execute(interaction, client) {
    try {
      const sent = await interaction.reply({ 
        content: 'Pinging...', 
        fetchReply: true 
      });
      
      const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
      const websocketHeartbeat = client.ws.ping;

      await interaction.editReply(
        '🏓 Pong!\n' +
        `📡 Roundtrip latency: ${roundtripLatency}ms\n` +
        `💓 WebSocket heartbeat: ${websocketHeartbeat}ms`
      );

      logger.info(`Ping-stats command executed by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error in ping-stats command:', error);
      throw error;
    }
  },
};
