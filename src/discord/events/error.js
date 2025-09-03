import logger from '../../core/logger.js';

/**
 * Error event handler
 * Handles Discord client errors
 */
export default {
  name: 'error',
  async execute(error, _client) {
    logger.error('Discord client error:', error);
  },
};
