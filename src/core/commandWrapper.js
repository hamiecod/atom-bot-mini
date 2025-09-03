import errorHandler from './errorHandler.js';
import logger from './logger.js';

/**
 * Command wrapper utility
 * Provides consistent error handling and logging for all commands
 */
class CommandWrapper {
  /**
   * Wrap a command execution with error handling
   * @param {Function} commandFunction - The command function to wrap
   * @param {string} commandName - Name of the command
   * @returns {Function} Wrapped command function
   */
  static wrapCommand(commandFunction, commandName) {
    return async (interaction, client) => {
      const startTime = Date.now();
      const context = {
        commandName,
        userId: interaction.user?.id,
        guildId: interaction.guild?.id,
        channelId: interaction.channel?.id,
        interaction
      };

      try {
        logger.info(`Executing command: ${commandName} by ${interaction.user?.tag} in ${interaction.guild?.name || 'DM'}`);
        
        // Execute the command
        await commandFunction(interaction, client);
        
        const executionTime = Date.now() - startTime;
        logger.info(`Command ${commandName} completed successfully in ${executionTime}ms`);
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        logger.error(`Command ${commandName} failed after ${executionTime}ms`, error);
        
        // Handle the error using the centralized error handler
        await errorHandler.handleCommandError(error, context);
      }
    };
  }

  /**
   * Wrap a service method with error handling
   * @param {Function} serviceMethod - The service method to wrap
   * @param {string} serviceName - Name of the service
   * @param {string} methodName - Name of the method
   * @returns {Function} Wrapped service method
   */
  static wrapServiceMethod(serviceMethod, serviceName, methodName) {
    return async (...args) => {
      const context = {
        serviceName,
        operation: methodName,
        metadata: { args: args.length }
      };

      try {
        return await serviceMethod.apply(this, args);
      } catch (error) {
        await errorHandler.handleServiceError(error, context);
        throw error; // Re-throw to maintain original behavior
      }
    };
  }

  /**
   * Wrap a database operation with error handling
   * @param {Function} dbOperation - The database operation to wrap
   * @param {string} operation - Name of the operation
   * @param {string} table - Table name (optional)
   * @returns {Function} Wrapped database operation
   */
  static wrapDatabaseOperation(dbOperation, operation, table = null) {
    return async (...args) => {
      const context = {
        operation,
        table,
        query: args[0] // SQL query is usually the first argument
      };

      try {
        return await dbOperation.apply(this, args);
      } catch (error) {
        await errorHandler.handleDatabaseError(error, context);
        throw error; // Re-throw to maintain original behavior
      }
    };
  }

  /**
   * Wrap a Discord API call with error handling
   * @param {Function} apiCall - The Discord API call to wrap
   * @param {string} operation - Name of the operation
   * @param {Object} interaction - Discord interaction (optional)
   * @returns {Function} Wrapped API call
   */
  static wrapDiscordApiCall(apiCall, operation, interaction = null) {
    return async (...args) => {
      const context = {
        operation,
        interaction
      };

      try {
        return await apiCall.apply(this, args);
      } catch (error) {
        await errorHandler.handleDiscordError(error, context);
        throw error; // Re-throw to maintain original behavior
      }
    };
  }

  /**
   * Create a safe async function that won't throw unhandled rejections
   * @param {Function} asyncFunction - The async function to wrap
   * @param {string} context - Context for logging
   * @returns {Function} Safe async function
   */
  static createSafeAsync(asyncFunction, context = 'unknown') {
    return async (...args) => {
      try {
        return await asyncFunction.apply(this, args);
      } catch (error) {
        logger.medium(`Unhandled error in ${context}`, context, error);
        return null; // Return null instead of throwing
      }
    };
  }

  /**
   * Retry mechanism for operations that might fail temporarily
   * @param {Function} operation - The operation to retry
   * @param {Object} options - Retry options
   * @param {number} options.maxRetries - Maximum number of retries (default: 3)
   * @param {number} options.delay - Delay between retries in ms (default: 1000)
   * @param {Function} options.shouldRetry - Function to determine if error should be retried
   * @returns {Function} Function that retries the operation
   */
  static withRetry(operation, options = {}) {
    const { maxRetries = 3, delay = 1000, shouldRetry = () => true } = options;
    
    return async (...args) => {
      let lastError;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await operation.apply(this, args);
        } catch (error) {
          lastError = error;
          
          if (attempt === maxRetries || !shouldRetry(error)) {
            throw error;
          }
          
          logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError;
    };
  }
}

export default CommandWrapper;
