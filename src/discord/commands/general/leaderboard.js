import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

import guildSettingsService from '../../../services/guildSettings.js';
import logger from '../../../core/logger.js';
import errorHandler from '../../../core/errorHandler.js';
import CommandUtils from '../../../core/commandUtils.js';

/**
 * Handle case when no leaderboard channel is set
 * @param {Object} interaction - Discord interaction object
 * @param {Object} settings - Guild settings object
 * @param {Array} userRoles - Array of user role IDs
 */
async function handleNoLeaderboardChannel(interaction, settings, userRoles) {
  try {
    // Notify admin if admin role is set
    if (settings && settings.admin_role_id) {
      const adminRole = interaction.guild.roles.cache.get(settings.admin_role_id);
      if (adminRole) {
        const adminMembers = adminRole.members;
        
        for (const [memberId, member] of adminMembers) {
          try {
            await member.send(
              `🔔 **Configuration Notice**\n\n` +
              `The leaderboard command was used in **${interaction.guild.name}** but the leaderboard channel is not set up.\n\n` +
              `To set up the leaderboard channel, use the \`/bind\` command in your server.\n\n` +
              `This will ensure the leaderboard command works properly in your server.`
            );
            logger.debug(`Sent leaderboard notification to admin: ${member.user.tag}`);
          } catch (dmError) {
            logger.warn(`Failed to send DM to admin ${member.user.tag}: ${dmError.message}`);
          }
        }
      } else {
        // Admin role not found, notify server owner
        logger.warn(`Admin role ${settings.admin_role_id} not found in guild ${interaction.guild.name}, notifying server owner`);
        try {
          const owner = await interaction.guild.fetchOwner();
          await owner.send(
            `🔔 **Configuration Notice**\n\n` +
            `The leaderboard command was used in **${interaction.guild.name}** but the leaderboard channel is not set up.\n\n` +
            `To set up the leaderboard channel, use the \`/bind\` command in your server.\n\n` +
            `This will ensure the leaderboard command works properly in your server.`
          );
          logger.info(`Sent leaderboard notification to server owner: ${owner.user.tag}`);
        } catch (ownerError) {
          logger.warn(`Failed to send DM to server owner: ${ownerError.message}`);
        }
      }
    } else {
      // No admin role set, notify server owner
      try {
        const owner = await interaction.guild.fetchOwner();
        await owner.send(
          `🔔 **Configuration Notice**\n\n` +
          `The leaderboard command was used in **${interaction.guild.name}** but the leaderboard channel is not set up.\n\n` +
          `To set up the leaderboard channel, use the \`/bind\` command in your server.\n\n` +
          `This will ensure the leaderboard command works properly in your server.`
        );
        logger.info(`Sent leaderboard notification to server owner: ${owner.user.tag}`);
      } catch (ownerError) {
        logger.warn(`Failed to send DM to server owner: ${ownerError.message}`);
      }
    }

    // Inform the user that leaderboard channel is not set
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ The leaderboard channel is not set up for this server. An administrator has been notified to configure it using `/bind`.',
          ephemeral: true
        });
      } else {
        await interaction.followUp({
          content: '❌ The leaderboard channel is not set up for this server. An administrator has been notified to configure it using `/bind`.',
          ephemeral: true
        });
      }
    } catch (responseError) {
      logger.error('Failed to send error response:', responseError);
    }
  } catch (error) {
    logger.error('Failed to handle no leaderboard channel case:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ The leaderboard channel is not set up for this server. Please contact an administrator.',
          ephemeral: true
        });
      } else {
        await interaction.followUp({
          content: '❌ The leaderboard channel is not set up for this server. Please contact an administrator.',
          ephemeral: true
        });
      }
    } catch (responseError) {
      logger.error('Failed to send error response in catch block:', responseError);
    }
  }
}

/**
 * Handle case when command is called from wrong channel
 * @param {Object} interaction - Discord interaction object
 * @param {string} leaderboardChannelId - ID of the bound leaderboard channel
 */
async function handleWrongChannel(interaction, leaderboardChannelId) {
  try {
    const leaderboardChannel = interaction.guild.channels.cache.get(leaderboardChannelId);
    const channelMention = leaderboardChannel ? `<#${leaderboardChannelId}>` : `channel with ID ${leaderboardChannelId}`;
    
    // Send warning message to current channel
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `⚠️ This channel is not bound to leaderboard. The leaderboard has been published in the leaderboard bound channel ${channelMention}.`,
          ephemeral: true
        });
      } else {
        await interaction.followUp({
          content: `⚠️ This channel is not bound to leaderboard. The leaderboard has been published in the leaderboard bound channel ${channelMention}.`,
          ephemeral: true
        });
      }
    } catch (responseError) {
      logger.error('Failed to send warning response:', responseError);
    }

    // Send leaderboard to the bound channel
    if (leaderboardChannel) {
      const leaderboardEmbed = await createLeaderboardEmbed();
      await leaderboardChannel.send({ embeds: [leaderboardEmbed] });
      logger.info(`Leaderboard redirected to bound channel: ${leaderboardChannel.name}`);
    } else {
      logger.warn(`Leaderboard channel ${leaderboardChannelId} not found in guild ${interaction.guild.name}`);
      
      // Notify user that channel not found
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ Channel not found. Please contact admin.',
            ephemeral: true
          });
        } else {
          await interaction.followUp({
            content: '❌ Channel not found. Please contact admin.',
            ephemeral: true
          });
        }
      } catch (responseError) {
        logger.error('Failed to send channel not found response:', responseError);
      }

      // Notify server owner that leaderboard channel is not found
      try {
        const owner = await interaction.guild.fetchOwner();
        await owner.send(
          `🔔 **Configuration Issue**\n\n` +
          `The leaderboard channel (ID: ${leaderboardChannelId}) is not found in **${interaction.guild.name}**.\n\n` +
          `This usually happens when the channel was deleted or the bot doesn't have access to it.\n\n` +
          `Please reconfigure the leaderboard channel using the \`/bind\` command.`
        );
        logger.info(`Sent channel not found notification to server owner: ${owner.user.tag}`);
      } catch (ownerError) {
        logger.warn(`Failed to send DM to server owner about missing channel: ${ownerError.message}`);
      }
    }
  } catch (error) {
    logger.error('Failed to handle wrong channel case:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Failed to redirect leaderboard to the bound channel. Please try again later.',
          ephemeral: true
        });
      } else {
        await interaction.followUp({
          content: '❌ Failed to redirect leaderboard to the bound channel. Please try again later.',
          ephemeral: true
        });
      }
    } catch (responseError) {
      logger.error('Failed to send error response in handleWrongChannel:', responseError);
    }
  }
}

/**
 * Create the leaderboard embed
 * @returns {EmbedBuilder} The leaderboard embed
 */
async function createLeaderboardEmbed() {
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
        { name: 'user10', score: 570, rank: 10 }
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
        const medal =
          index === 0
            ? '🥇'
            : index === 1
              ? '🥈'
              : index === 2
                ? '🥉'
                : `${user.rank}.`;
        leaderboardText += `${medal} **${user.name}** - ${user.score} points\n`;
      });

      embed.addFields({
        name: 'Rankings',
        value: leaderboardText,
        inline: false
      });

  return embed;
}

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
        await CommandUtils.sendErrorResponse(interaction, '❌ This command can only be used in a server.');
        return;
      }

      // Validate guild and member data
      if (!interaction.guild.id || !interaction.member) {
        throw new Error('Missing guild or member information');
      }

      // Get guild settings to check leaderboard channel binding
      const guildId = interaction.guild.id;
      const channelId = interaction.channel.id;
      const userRoles = interaction.member.roles.cache.map(role => role.id);

      let settings;
      try {
        settings = await guildSettingsService.getGuildSettings(guildId);
      } catch (settingsError) {
        logger.high(
          'Failed to get guild settings - treating as no leaderboard channel set',
          'leaderboard-command',
          settingsError
        );
        settings = null; // Treat as no settings configured
      }

      // Handle different scenarios based on leaderboard channel binding
      if (!settings || !settings.leaderboard_channel_id) {
        // No leaderboard channel set - notify admin and inform user
        await handleNoLeaderboardChannel(interaction, settings, userRoles);
        return;
      } else if (channelId !== settings.leaderboard_channel_id) {
        // Command called from non-bound channel - warn and redirect
        await handleWrongChannel(interaction, settings.leaderboard_channel_id);
        return;
      }
      // If we reach here, command is called from the correct bound channel
      // Create and send the leaderboard embed
      const embed = await createLeaderboardEmbed();

      // Send the response with error handling
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [embed] });
        } else {
          await interaction.followUp({ embeds: [embed] });
        }
      } catch (replyError) {
        logger.high(
          'Failed to send leaderboard response to user',
          'leaderboard-command',
          replyError
        );
        throw new Error(`Failed to send response: ${replyError.message}`);
      }

      CommandUtils.logCommandExecution('leaderboard', interaction, 'executed successfully');
    } catch (error) {
      // Use centralized error handling
      await errorHandler.handleCommandError(error, context);
    }
  }
};
