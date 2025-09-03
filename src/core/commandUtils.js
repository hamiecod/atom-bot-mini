import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import logger from './logger.js';

/**
 * Utility functions for Discord commands
 * Reduces code duplication across command files
 */
class CommandUtils {
  /**
   * Check if command is used in a guild and user has required permissions
   * @param {Object} interaction - Discord interaction object
   * @param {string} requiredPermission - Required permission (default: ManageGuild)
   * @returns {Promise<boolean>} Whether user can use the command
   */
  static async checkGuildPermissions(interaction, requiredPermission = PermissionFlagsBits.ManageGuild) {
    // Check if command is used in a guild
    if (!interaction.guild) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ This command can only be used in a server.',
          flags: MessageFlags.Ephemeral
        });
      }
      return false;
    }

    // Check if user has required permission
    if (!interaction.member.permissions.has(requiredPermission)) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `❌ You need the "${this.getPermissionName(requiredPermission)}" permission to use this command.`,
          flags: MessageFlags.Ephemeral
        });
      }
      return false;
    }

    return true;
  }

  /**
   * Get human-readable permission name
   * @param {string} permission - Permission flag
   * @returns {string} Human-readable permission name
   */
  static getPermissionName(permission) {
    const permissionNames = {
      [PermissionFlagsBits.ManageGuild]: 'Manage Server',
      [PermissionFlagsBits.Administrator]: 'Administrator',
      [PermissionFlagsBits.ManageChannels]: 'Manage Channels',
      [PermissionFlagsBits.ManageRoles]: 'Manage Roles'
    };
    return permissionNames[permission] || 'Required Permission';
  }

  /**
   * Send error response to user
   * @param {Object} interaction - Discord interaction object
   * @param {string} message - Error message
   * @param {boolean} ephemeral - Whether message should be ephemeral
   */
  static async sendErrorResponse(interaction, message, ephemeral = true) {
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: message,
          flags: ephemeral ? MessageFlags.Ephemeral : 0
        });
      } else {
        await interaction.followUp({
          content: message,
          flags: ephemeral ? MessageFlags.Ephemeral : 0
        });
      }
    } catch (error) {
      logger.error('Failed to send error response:', error);
    }
  }

  /**
   * Log command execution
   * @param {string} commandName - Name of the command
   * @param {Object} interaction - Discord interaction object
   * @param {string} additionalInfo - Additional information to log
   */
  static logCommandExecution(commandName, interaction, additionalInfo = '') {
    const guildName = interaction.guild ? interaction.guild.name : 'DM';
    const logMessage = `${commandName} command executed by ${interaction.user.tag} in ${guildName}`;
    logger.info(additionalInfo ? `${logMessage} - ${additionalInfo}` : logMessage);
  }
}

export default CommandUtils;
