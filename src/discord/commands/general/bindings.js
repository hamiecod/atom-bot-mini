import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } from 'discord.js';
import guildSettingsService from '../../../services/guildSettings.js';
import logger from '../../../core/logger.js';

/**
 * Bindings command - shows current guild settings for the server
 */
export default {
  data: new SlashCommandBuilder()
    .setName('bindings')
    .setDescription('View current guild settings for this server')
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

      const guildId = interaction.guild.id;
      
      try {
        const settings = await guildSettingsService.getGuildSettings(guildId);
        
        const embed = new EmbedBuilder()
          .setTitle('🔗 Guild Settings')
          .setColor(0x3498db)
          .setTimestamp()
          .setFooter({ text: `${interaction.guild.name} • Server Settings` });

        if (!settings) {
          embed.setDescription('No guild settings are currently configured for this server.\n\nUse `/bind` to configure settings that restrict commands to specific channels or roles.');
        } else {
          let description = `**Current Guild Settings:**\n\n`;
          
          // Leaderboard channel
          if (settings.leaderboard_channel_id) {
            const channel = interaction.guild.channels.cache.get(settings.leaderboard_channel_id);
            if (channel) {
              description += `📊 **Leaderboard Channel:** ${channel} (${channel.name})\n`;
            } else {
              description += `📊 **Leaderboard Channel:** <#${settings.leaderboard_channel_id}> (Channel deleted or inaccessible)\n`;
            }
          } else {
            description += `📊 **Leaderboard Channel:** Not configured (unrestricted)\n`;
          }

          // Stats channel
          if (settings.stats_channel_id) {
            const channel = interaction.guild.channels.cache.get(settings.stats_channel_id);
            if (channel) {
              description += `📈 **Status Channel:** ${channel} (${channel.name})\n`;
            } else {
              description += `📈 **Status Channel:** <#${settings.stats_channel_id}> (Channel deleted or inaccessible)\n`;
            }
          } else {
            description += `📈 **Status Channel:** Not configured (unrestricted)\n`;
          }

          // Admin role
          if (settings.admin_role_id) {
            const role = interaction.guild.roles.cache.get(settings.admin_role_id);
            if (role) {
              description += `👑 **Admin Role:** ${role} (${role.name})\n`;
            } else {
              description += `👑 **Admin Role:** <@&${settings.admin_role_id}> (Role deleted)\n`;
            }
          } else {
            description += `👑 **Admin Role:** Not configured (Manage Server permission required)\n`;
          }

          description += `\n**Last Updated:** ${new Date(settings.updated_at).toLocaleString()}`;
          
          embed.setDescription(description);
        }

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [embed] });
        }
        logger.info(`Bindings viewed by ${interaction.user.tag} in ${interaction.guild.name}`);

      } catch (error) {
        logger.error('Error fetching bindings:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ There was an error while fetching the bindings.',
            flags: MessageFlags.Ephemeral
          });
        }
      }

    } catch (error) {
      logger.error('Error in bindings command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ There was an error while processing the bindings command.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  },
};
