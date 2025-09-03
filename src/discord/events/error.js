import logger from '../../core/logger.js';

/**
 * Error event handler
 * Handles Discord client errors
 */
export default {
  name: 'error',
  async execute(error, _client) {
    logger.critical('Discord client error - bot connectivity issue', 'discord-client', error);
  },
};
