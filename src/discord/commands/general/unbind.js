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
 * Unbind command - allows removing guild settings
 */
export default {
  data: new SlashCommandBuilder()
    .setName('unbind')
    .setDescription('Remove a guild setting (unbind a resource)')
    .addStringOption(option =>
      option
        .setName('resource')
        .setDescription('The resource to unbind')
        .setRequired(true)
        .addChoices(
          { name: 'leaderboard', value: 'leaderboard' },
          { name: 'stats', value: 'stats' },
          { name: 'admin_role', value: 'admin_role' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    try {
      // Check guild permissions
      const hasPermission = await CommandUtils.checkGuildPermissions(interaction);
      if (!hasPermission) return;

      const resource = interaction.options.getString('resource');
      const guildId = interaction.guild.id;

      const embed = new EmbedBuilder()
        .setTitle('🔓 Resource Unbinding')
        .setColor(0xff6b6b)
        .setTimestamp();

      try {
        let settingKey = '';
        let resourceName = '';

        // Determine the setting key based on resource
        if (resource === 'leaderboard') {
          settingKey = 'leaderboard_channel_id';
          resourceName = 'Leaderboard';
        } else if (resource === 'stats') {
          settingKey = 'stats_channel_id';
          resourceName = 'Stats';
        } else if (resource === 'admin_role') {
          settingKey = 'admin_role_id';
          resourceName = 'Admin Role';
        }

        // Check if setting exists
        const currentValue = await guildSettingsService.getGuildSetting(
          guildId,
          settingKey
        );

        if (!currentValue) {
          embed
            .setDescription(`❌ No binding found for \`${resource}\``)
            .setColor(0xff6b6b);
        } else {
          // Clear the setting
          await guildSettingsService.clearGuildSetting(guildId, settingKey);

          embed
            .setDescription(`✅ Successfully unbound \`${resource}\``)
            .setColor(0x2ecc71)
            .addFields({
              name: 'Unbinding Details',
              value: `**Resource:** \`${resource}\`\n**Type:** ${resourceName}\n**Status:** Removed`,
              inline: false
            });
        }

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [embed] });
        }
        CommandUtils.logCommandExecution('unbind', interaction, `Resource unbinding: ${resource}`);
      } catch (error) {
        logger.error('Error removing resource binding:', error);
        await CommandUtils.sendErrorResponse(interaction, '❌ There was an error while removing the binding.');
      }
    } catch (error) {
      logger.error('Error in unbind command:', error);
      await CommandUtils.sendErrorResponse(interaction, '❌ There was an error while processing the unbind command.');
    }
  }
};
