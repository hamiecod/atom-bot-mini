import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import guildSettingsService from '../../../services/guildSettings.js';
import logger from '../../../core/logger.js';
import errorHandler from '../../../core/errorHandler.js';

/**
 * Leaderboard command - displays a leaderboard with mock data
 */
export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Shows the current leaderboard'),

  async execute(interaction, client) {
    const context = {
      commandName: 'leaderboard',
      userId: interaction.user?.id,
      guildId: interaction.guild?.id,
      channelId: interaction.channel?.id,
      interaction
    };

    try {
      // Validate interaction
      if (!interaction || !interaction.user) {
        throw new Error('Invalid interaction object');
      }

      // Check if command is used in a guild
      if (!interaction.guild) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ This command can only be used in a server.',
            flags: MessageFlags.Ephemeral
          });
        }
        return;
      }

      // Validate guild and member data
      if (!interaction.guild.id || !interaction.member) {
        throw new Error('Missing guild or member information');
      }

      // Check if user can use this command based on guild settings
      const guildId = interaction.guild.id;
      const channelId = interaction.channel.id;
      const userRoles = interaction.member.roles.cache.map(role => role.id);
      
      let canUse;
      try {
        canUse = await guildSettingsService.canUseCommand(guildId, 'leaderboard', channelId, userRoles);
      } catch (settingsError) {
        logger.high('Failed to check command permissions - allowing command as fallback', 'leaderboard-command', settingsError);
        canUse = true; // Fail open for security
      }
      
      if (!canUse) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ The leaderboard command is restricted to a specific channel. Please check with a server administrator.',
            flags: MessageFlags.Ephemeral
          });
        }
        return;
      }

      // Mock leaderboard data with 10 positions
      const leaderboardData = [
        { name: 'user1', score: 1250, rank: 1 },
        { name: 'user2', score: 1180, rank: 2 },
        { name: 'user3', score: 1095, rank: 3 },
        { name: 'user4', score: 1020, rank: 4 },
        { name: 'user5', score: 945, rank: 5 },
        { name: 'user6', score: 870, rank: 6 },
        { name: 'user7', score: 795, rank: 7 },
        { name: 'user8', score: 720, rank: 8 },
        { name: 'user9', score: 645, rank: 9 },
        { name: 'user10', score: 570, rank: 10 },
      ];

      // Create embed for the leaderboard
      const embed = new EmbedBuilder()
        .setTitle('🏆 Leaderboard')
        .setDescription('Top 10 players by score')
        .setColor(0x00ff00)
        .setTimestamp()
        .setFooter({ text: 'Updated just now' });

      // Add leaderboard entries to embed
      let leaderboardText = '';
      leaderboardData.forEach((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${user.rank}.`;
        leaderboardText += `${medal} **${user.name}** - ${user.score} points\n`;
      });

      embed.addFields({
        name: 'Rankings',
        value: leaderboardText,
        inline: false
      });

      // Send the response with error handling
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.followUp({ embeds: [embed] });
        }
      } catch (replyError) {
        logger.high('Failed to send leaderboard response to user', 'leaderboard-command', replyError);
        throw new Error(`Failed to send response: ${replyError.message}`);
      }

      logger.info(`Leaderboard command executed successfully by ${interaction.user.tag} in ${interaction.guild.name}`);
      
    } catch (error) {
      // Use centralized error handling
      await errorHandler.handleCommandError(error, context);
    }
  },
};
