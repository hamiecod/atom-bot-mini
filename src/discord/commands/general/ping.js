import { SlashCommandBuilder } from 'discord.js';
import logger from '../../../core/logger.js';

/**
 * Ping command - tests bot responsiveness
 */
export default {
  data: new SlashCommandBuilder()
    .setName('ping')
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
        `🏓 Pong!\n` +
        `📡 Roundtrip latency: ${roundtripLatency}ms\n` +
        `💓 WebSocket heartbeat: ${websocketHeartbeat}ms`
      );

      logger.info(`Ping command executed by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error in ping command:', error);
      throw error;
    }
  },
};
