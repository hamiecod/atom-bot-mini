import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';

import guildSettingsService from '../../../services/guildSettings.js';
import logger from '../../../core/logger.js';
import CommandUtils from '../../../core/commandUtils.js';

/**
 * Status command - shows current guild settings and their health status
 * Checks if bound channels and roles still exist
 */
export default {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('View current guild settings and their health status')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    try {
      // Check guild permissions
      const hasPermission = await CommandUtils.checkGuildPermissions(interaction);
      if (!hasPermission) return;

      const guildId = interaction.guild.id;

      try {
        const healthStatus = await guildSettingsService.getSettingsHealthStatus(
          guildId,
          interaction.guild
        );

        const embed = new EmbedBuilder()
          .setTitle('📊 Guild Settings Status')
          .setColor(0x3498db)
          .setTimestamp()
          .setFooter({
            text: `${interaction.guild.name} • Settings Health Check`
          });

        if (!healthStatus.hasSettings) {
          embed.setDescription(
            '✅ **No guild settings configured!**\n\nAll commands are currently unrestricted and can be used anywhere in the server.'
          );
        } else {
          let description = '**Guild Settings Status:**\n\n';

          // Check leaderboard channel
          const leaderboardSetting =
            healthStatus.healthy.find(s => s.type === 'leaderboard_channel') ||
            healthStatus.broken.find(s => s.type === 'leaderboard_channel');
          if (leaderboardSetting) {
            if (leaderboardSetting.target) {
              description += `📊 **Leaderboard Channel:** ✅ ${leaderboardSetting.target} (${leaderboardSetting.name})\n`;
            } else {
              description += `📊 **Leaderboard Channel:** ❌ <#${leaderboardSetting.id}> (Channel deleted or inaccessible)\n`;
            }
          } else {
            description +=
              '📊 **Leaderboard Channel:** Not configured (unrestricted)\n';
          }

          // Check stats channel
          const statsSetting =
            healthStatus.healthy.find(s => s.type === 'stats_channel') ||
            healthStatus.broken.find(s => s.type === 'stats_channel');
          if (statsSetting) {
            if (statsSetting.target) {
              description += `📈 **Status Channel:** ✅ ${statsSetting.target} (${statsSetting.name})\n`;
            } else {
              description += `📈 **Status Channel:** ❌ <#${statsSetting.id}> (Channel deleted or inaccessible)\n`;
            }
          } else {
            description +=
              '📈 **Status Channel:** Not configured (unrestricted)\n';
          }

          // Check admin role
          const adminSetting =
            healthStatus.healthy.find(s => s.type === 'admin_role') ||
            healthStatus.broken.find(s => s.type === 'admin_role');
          if (adminSetting) {
            if (adminSetting.target) {
              description += `👑 **Admin Role:** ✅ ${adminSetting.target} (${adminSetting.name})\n`;
            } else {
              description += `👑 **Admin Role:** ❌ <@&${adminSetting.id}> (Role deleted)\n`;
            }
          } else {
            description +=
              '👑 **Admin Role:** Not configured (Manage Server permission required)\n';
          }

          // Add health summary
          if (healthStatus.brokenCount > 0) {
            embed.setColor(0xff6b6b); // Red for broken settings
            description += '\n⚠️ **Health Summary:**\n';
            description += `✅ Healthy: ${healthStatus.healthyCount}\n`;
            description += `❌ Broken: ${healthStatus.brokenCount}\n\n`;
            description +=
              '**Recommendation:** Use `/unbind` to remove broken settings.';
          } else {
            embed.setColor(0x2ecc71); // Green for all healthy
            description += '\n✅ **All settings are healthy!**\n';
            description += `All ${healthStatus.healthyCount} setting(s) are working correctly.`;
          }

          embed.setDescription(description);
        }

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [embed] });
        }
        CommandUtils.logCommandExecution('status', interaction, `${healthStatus.healthyCount + healthStatus.brokenCount} settings checked`);
      } catch (error) {
        logger.error('Error fetching bindings for status:', error);
        await CommandUtils.sendErrorResponse(interaction, '❌ There was an error while checking the binding status.');
      }
    } catch (error) {
      logger.error('Error in status command:', error);
      await CommandUtils.sendErrorResponse(interaction, '❌ There was an error while processing the status command.');
    }
  }
};
