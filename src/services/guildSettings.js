import database from './database.js';
import logger from '../core/logger.js';

/**
 * Service for managing guild settings
 * Handles guild-specific configurations like channel and role bindings
 */
class GuildSettingsService {
  /**
   * Get all settings for a guild
   * @param {string} guildId - Discord guild ID
   * @returns {Promise<Object|null>} Guild settings object or null if not found
   */
  async getGuildSettings(guildId) {
    try {
      if (!guildId) {
        logger.medium('getGuildSettings called with null/undefined guildId', 'guildSettings');
        return null;
      }

      // Check if database is connected
      if (!database.isDatabaseConnected()) {
        throw new Error('Database not initialized');
      }

      const settings = await database.queryOne(
        `SELECT * FROM guild_settings WHERE guild_id = ?`,
        [guildId]
      );

      return settings;
    } catch (error) {
      logger.high('Failed to get guild settings - this affects bot functionality', 'guildSettings', error);
      throw error;
    }
  }

  /**
   * Set a specific setting for a guild
   * @param {string} guildId - Discord guild ID
   * @param {string} settingKey - The setting key (stats_channel_id, leaderboard_channel_id, admin_role_id)
   * @param {string|null} settingValue - The setting value (channel/role ID or null to clear)
   * @returns {Promise<Object>} Updated settings object
   */
  async setGuildSetting(guildId, settingKey, settingValue) {
    try {
      if (!guildId) {
        throw new Error('guildId is required');
      }

      // Validate setting key
      const validKeys = ['stats_channel_id', 'leaderboard_channel_id', 'admin_role_id'];
      if (!validKeys.includes(settingKey)) {
        logger.medium(`Invalid setting key attempted: ${settingKey}`, 'guildSettings');
        throw new Error(`Invalid setting key: ${settingKey}`);
      }

      // Check if database is connected
      if (!database.isDatabaseConnected()) {
        throw new Error('Database not initialized');
      }

      // Check if guild settings exist
      const existingSettings = await this.getGuildSettings(guildId);
      
      if (existingSettings) {
        // Update existing settings
        await database.execute(
          `UPDATE guild_settings SET ${settingKey} = ?, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?`,
          [settingValue, guildId]
        );
      } else {
        // Create new settings record
        const settings = {
          stats_channel_id: null,
          leaderboard_channel_id: null,
          admin_role_id: null
        };
        settings[settingKey] = settingValue;

        await database.execute(
          `INSERT INTO guild_settings (guild_id, stats_channel_id, leaderboard_channel_id, admin_role_id, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [guildId, settings.stats_channel_id, settings.leaderboard_channel_id, settings.admin_role_id]
        );
      }

      logger.info(`Updated guild setting: ${settingKey} = ${settingValue} for guild ${guildId}`);
      
      // Return updated settings
      return await this.getGuildSettings(guildId);
    } catch (error) {
      logger.high('Failed to set guild setting - this affects bot configuration', 'guildSettings', error);
      throw error;
    }
  }

  /**
   * Get a specific setting for a guild
   * @param {string} guildId - Discord guild ID
   * @param {string} settingKey - The setting key
   * @returns {Promise<string|null>} The setting value or null if not set
   */
  async getGuildSetting(guildId, settingKey) {
    try {
      if (!guildId || !settingKey) {
        logger.medium('getGuildSetting called with missing parameters', 'guildSettings');
        return null;
      }

      const settings = await this.getGuildSettings(guildId);
      return settings ? settings[settingKey] : null;
    } catch (error) {
      logger.high('Failed to get specific guild setting - this affects bot functionality', 'guildSettings', error);
      throw error;
    }
  }

  /**
   * Check if a user can use a command based on guild settings
   * @param {string} guildId - Discord guild ID
   * @param {string} commandName - Name of the command
   * @param {string} channelId - Discord channel ID where command was used
   * @param {Array} userRoles - Array of role IDs the user has
   * @returns {Promise<boolean>} True if user can use the command
   */
  async canUseCommand(guildId, commandName, channelId, userRoles = []) {
    try {
      const settings = await this.getGuildSettings(guildId);
      
      // If no settings exist, command can be used anywhere
      if (!settings) {
        return true;
      }

      switch (commandName) {
        case 'leaderboard':
          // Check if leaderboard is bound to a specific channel
          if (settings.leaderboard_channel_id) {
            return channelId === settings.leaderboard_channel_id;
          }
          return true;

        case 'status':
          // Check if status is bound to a specific channel
          if (settings.stats_channel_id) {
            return channelId === settings.stats_channel_id;
          }
          return true;

        case 'bind':
        case 'unbind':
        case 'bindings':
        case 'cleanup':
          // Admin commands - check if user has admin role
          if (settings.admin_role_id) {
            return userRoles.includes(settings.admin_role_id);
          }
          return true;

        default:
          return true;
      }
    } catch (error) {
      logger.high('Failed to check command permissions - security risk, failing open', 'guildSettings', error);
      // Fail open - allow command if there's an error (security consideration)
      return true;
    }
  }

  /**
   * Get health status of guild settings
   * @param {string} guildId - Discord guild ID
   * @param {Object} guild - Discord guild object with channels and roles cache
   * @returns {Promise<Object>} Object with health status information
   */
  async getSettingsHealthStatus(guildId, guild) {
    try {
      const settings = await this.getGuildSettings(guildId);
      
      if (!settings) {
        return {
          hasSettings: false,
          healthy: [],
          broken: [],
          healthyCount: 0,
          brokenCount: 0
        };
      }

      const healthy = [];
      const broken = [];

      // Check leaderboard channel
      if (settings.leaderboard_channel_id) {
        const channel = guild.channels.cache.get(settings.leaderboard_channel_id);
        if (channel) {
          healthy.push({
            type: 'leaderboard_channel',
            id: settings.leaderboard_channel_id,
            name: channel.name,
            target: channel
          });
        } else {
          broken.push({
            type: 'leaderboard_channel',
            id: settings.leaderboard_channel_id,
            name: 'Channel deleted or inaccessible'
          });
        }
      }

      // Check stats channel
      if (settings.stats_channel_id) {
        const channel = guild.channels.cache.get(settings.stats_channel_id);
        if (channel) {
          healthy.push({
            type: 'stats_channel',
            id: settings.stats_channel_id,
            name: channel.name,
            target: channel
          });
        } else {
          broken.push({
            type: 'stats_channel',
            id: settings.stats_channel_id,
            name: 'Channel deleted or inaccessible'
          });
        }
      }

      // Check admin role
      if (settings.admin_role_id) {
        const role = guild.roles.cache.get(settings.admin_role_id);
        if (role) {
          healthy.push({
            type: 'admin_role',
            id: settings.admin_role_id,
            name: role.name,
            target: role
          });
        } else {
          broken.push({
            type: 'admin_role',
            id: settings.admin_role_id,
            name: 'Role deleted'
          });
        }
      }

      return {
        hasSettings: true,
        healthy,
        broken,
        healthyCount: healthy.length,
        brokenCount: broken.length
      };
    } catch (error) {
      logger.medium('Failed to get settings health status - non-critical but useful for diagnostics', 'guildSettings', error);
      throw error;
    }
  }

  /**
   * Clear a specific setting for a guild
   * @param {string} guildId - Discord guild ID
   * @param {string} settingKey - The setting key to clear
   * @returns {Promise<Object>} Updated settings object
   */
  async clearGuildSetting(guildId, settingKey) {
    return await this.setGuildSetting(guildId, settingKey, null);
  }
}

export default new GuildSettingsService();
