import emailService from '../services/email.js';

import logger from './logger.js';

/**
 * Centralized error handling service
 * Provides consistent error handling patterns across the bot
 */
class ErrorHandler {
  constructor() {
    this.errorContexts = new Map(); // Track error context for better debugging
  }

  /**
   * Handle command execution errors
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context information
   * @param {string} context.commandName - Name of the command
   * @param {Object} context.interaction - Discord interaction object
   * @param {string} context.userId - User ID who triggered the command
   * @param {string} context.guildId - Guild ID where command was used
   * @returns {Promise<boolean>} Whether error was handled successfully
   */
  async handleCommandError(error, context) {
    const { commandName, interaction, userId, guildId } = context;

    try {
      // Log the error with appropriate severity
      const severity = this.determineErrorSeverity(error, 'command');
      logger[severity](
        `Command error in ${commandName}`,
        'command-execution',
        error
      );

      // Send user-friendly error message
      await this.sendUserErrorMessage(interaction, error, commandName);

      // Track error context for debugging
      this.trackErrorContext(error, context);

      return true;
    } catch (handlingError) {
      logger.critical(
        'Failed to handle command error - error handling system broken',
        'error-handler',
        handlingError
      );
      return false;
    }
  }

  /**
   * Handle service errors
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context information
   * @param {string} context.serviceName - Name of the service
   * @param {string} context.operation - Operation that failed
   * @param {Object} context.metadata - Additional metadata
   * @returns {Promise<boolean>} Whether error was handled successfully
   */
  async handleServiceError(error, context) {
    const { serviceName, operation, metadata = {} } = context;

    try {
      // Log the error with appropriate severity
      const severity = this.determineErrorSeverity(error, 'service');
      logger[severity](
        `Service error in ${serviceName} during ${operation}`,
        'service-execution',
        error
      );

      // Track error context for debugging
      this.trackErrorContext(error, context);

      return true;
    } catch (handlingError) {
      logger.critical(
        'Failed to handle service error - error handling system broken',
        'error-handler',
        handlingError
      );
      return false;
    }
  }

  /**
   * Handle database errors
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context information
   * @param {string} context.operation - Database operation that failed
   * @param {string} context.table - Table involved (if applicable)
   * @param {Object} context.query - Query details (if applicable)
   * @returns {Promise<boolean>} Whether error was handled successfully
   */
  async handleDatabaseError(error, context) {
    const { operation, table, query } = context;

    try {
      // Database errors are always critical
      logger.critical(
        `Database error during ${operation}${table ? ` on table ${table}` : ''}`,
        'database',
        error
      );

      // Track error context for debugging
      this.trackErrorContext(error, context);

      return true;
    } catch (handlingError) {
      logger.critical(
        'Failed to handle database error - error handling system broken',
        'error-handler',
        handlingError
      );
      return false;
    }
  }

  /**
   * Handle Discord API errors
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context information
   * @param {string} context.operation - Discord API operation that failed
   * @param {Object} context.interaction - Discord interaction (if applicable)
   * @returns {Promise<boolean>} Whether error was handled successfully
   */
  async handleDiscordError(error, context) {
    const { operation, interaction } = context;

    try {
      // Determine severity based on error type
      const severity = this.determineDiscordErrorSeverity(error);
      logger[severity](
        `Discord API error during ${operation}`,
        'discord-api',
        error
      );

      // If it's an interaction error, try to send user feedback
      if (interaction && !interaction.replied && !interaction.deferred) {
        await this.sendUserErrorMessage(interaction, error, 'Discord API');
      }

      // Track error context for debugging
      this.trackErrorContext(error, context);

      return true;
    } catch (handlingError) {
      logger.critical(
        'Failed to handle Discord error - error handling system broken',
        'error-handler',
        handlingError
      );
      return false;
    }
  }

  /**
   * Determine error severity based on error type and context
   * @private
   */
  determineErrorSeverity(error, context) {
    // Critical errors that break core functionality
    if (
      error.message.includes('Database not initialized') ||
      error.message.includes('Discord client not ready') ||
      error.message.includes('Permission denied') ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND'
    ) {
      return 'critical';
    }

    // High priority errors that affect functionality
    if (
      error.message.includes('Invalid') ||
      error.message.includes('Missing') ||
      error.message.includes('Required') ||
      error.code === 50013 || // Missing permissions
      error.code === 50001
    ) {
      // Missing access
      return 'high';
    }

    // Medium priority errors
    if (
      error.message.includes('Not found') ||
      error.message.includes('Already exists') ||
      error.code === 10008
    ) {
      // Unknown message
      return 'medium';
    }

    // Default to low priority
    return 'low';
  }

  /**
   * Determine Discord API error severity
   * @private
   */
  determineDiscordErrorSeverity(error) {
    // Critical Discord errors
    if (
      error.code === 50001 || // Missing access
      error.code === 50013 || // Missing permissions
      error.code === 50035 || // Invalid form body
      error.code === 50036
    ) {
      // Invalid file size
      return 'critical';
    }

    // High priority Discord errors
    if (
      error.code === 10008 || // Unknown message
      error.code === 10062 || // Unknown interaction
      error.code === 10015
    ) {
      // Unknown webhook
      return 'high';
    }

    // Rate limiting is usually medium priority
    if (error.code === 429) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Send user-friendly error message
   * @private
   */
  async sendUserErrorMessage(interaction, error, context) {
    try {
      let userMessage = '❌ An error occurred while processing your request.';

      // Provide more specific messages for common errors
      if (error.message.includes('Missing permissions')) {
        userMessage =
          '❌ I don\'t have the required permissions to perform this action.';
      } else if (error.message.includes('Invalid')) {
        userMessage =
          '❌ The provided information is invalid. Please check your input.';
      } else if (error.message.includes('Not found')) {
        userMessage = '❌ The requested resource was not found.';
      } else if (error.code === 429) {
        userMessage =
          '⏳ I\'m being rate limited. Please try again in a moment.';
      }

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: userMessage,
          flags: 64 // Ephemeral
        });
      } else {
        await interaction.followUp({
          content: userMessage,
          flags: 64 // Ephemeral
        });
      }
    } catch (replyError) {
      logger.critical(
        'Failed to send user error message',
        'error-handler',
        replyError
      );
    }
  }

  /**
   * Track error context for debugging
   * @private
   */
  trackErrorContext(error, context) {
    const errorKey = `${error.name}:${error.message.substring(0, 50)}`;
    const contextData = {
      timestamp: new Date().toISOString(),
      context,
      stack: error.stack
    };

    this.errorContexts.set(errorKey, contextData);

    // Keep only last 100 error contexts to prevent memory leaks
    if (this.errorContexts.size > 100) {
      const firstKey = this.errorContexts.keys().next().value;
      this.errorContexts.delete(firstKey);
    }
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.errorContexts.size,
      errorsByType: {},
      recentErrors: []
    };

    for (const [key, data] of this.errorContexts) {
      const errorType = key.split(':')[0];
      stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;

      // Add to recent errors (last 10)
      if (stats.recentErrors.length < 10) {
        stats.recentErrors.push({
          type: errorType,
          timestamp: data.timestamp,
          context: data.context
        });
      }
    }

    return stats;
  }


}

// Export singleton instance
export default new ErrorHandler();
