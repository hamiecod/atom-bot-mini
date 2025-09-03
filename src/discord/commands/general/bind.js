import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import guildSettingsService from '../../../services/guildSettings.js';
import logger from '../../../core/logger.js';

/**
 * Bind command - allows binding resources to specific channels or roles
 */
export default {
  data: new SlashCommandBuilder()
    .setName('bind')
    .setDescription('Bind a resource to a specific channel or role')
    .addStringOption(option =>
      option
        .setName('resource')
        .setDescription('The resource to bind')
        .setRequired(true)
        .addChoices(
          { name: 'leaderboard', value: 'leaderboard' },
          { name: 'status', value: 'status' },
          { name: 'admin_role', value: 'admin_role' }
        )
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel to bind the resource to (for leaderboard/status)')
        .setRequired(false)
    )
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role to bind the resource to (for admin_role)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    try {
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

      // Check if user has permission to manage guild
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ You need the "Manage Server" permission to use this command.',
            flags: MessageFlags.Ephemeral
          });
        }
        return;
      }

      const resource = interaction.options.getString('resource');
      const channel = interaction.options.getChannel('channel');
      const role = interaction.options.getRole('role');

      const guildId = interaction.guild.id;
      const embed = new EmbedBuilder()
        .setTitle('🔗 Resource Binding')
        .setColor(0x00ff00)
        .setTimestamp();

      try {
        let settingKey = '';
        let target = null;
        let targetType = '';

        // Validate and set the appropriate binding
        if (resource === 'leaderboard') {
          if (!channel) {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content: '❌ You must specify a channel to bind the leaderboard to.',
                flags: MessageFlags.Ephemeral
              });
            }
            return;
          }
          settingKey = 'leaderboard_channel_id';
          target = channel;
          targetType = 'Channel';
        } else if (resource === 'status') {
          if (!channel) {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content: '❌ You must specify a channel to bind the status to.',
                flags: MessageFlags.Ephemeral
              });
            }
            return;
          }
          settingKey = 'stats_channel_id';
          target = channel;
          targetType = 'Channel';
        } else if (resource === 'admin_role') {
          if (!role) {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content: '❌ You must specify a role to bind the admin_role to.',
                flags: MessageFlags.Ephemeral
              });
            }
            return;
          }
          settingKey = 'admin_role_id';
          target = role;
          targetType = 'Role';
        }

        // Set the guild setting
        await guildSettingsService.setGuildSetting(guildId, settingKey, target.id);
        
        embed.setDescription(`✅ Successfully bound \`${resource}\` to ${target}`)
          .addFields({
            name: 'Binding Details',
            value: `**Resource:** \`${resource}\`\n**Target:** ${target}\n**Type:** ${targetType}`,
            inline: false
          });

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [embed] });
        }
        logger.info(`Resource binding created: ${resource} -> ${targetType.toLowerCase()}:${target.id} by ${interaction.user.tag} in ${interaction.guild.name}`);

      } catch (error) {
        logger.high('Error creating resource binding - affects bot functionality', 'bind-command', error);
        
        // Try to provide more specific error messages
        let errorMessage = '❌ There was an error while creating the binding.';
        if (error.message.includes('Invalid setting key')) {
          errorMessage = '❌ Invalid resource type specified.';
        } else if (error.message.includes('guildId is required')) {
          errorMessage = '❌ Guild information is missing. Please try again.';
        }
        
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: errorMessage,
            flags: MessageFlags.Ephemeral
          });
        }
      }

    } catch (error) {
      logger.critical('Critical error in bind command - command execution failed', 'bind-command', error);
      
      // Ensure we always respond to the interaction
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ There was a critical error while processing the bind command.',
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (replyError) {
        logger.critical('Failed to send error response to user in bind command', 'bind-command', replyError);
      }
    }
  },
};
