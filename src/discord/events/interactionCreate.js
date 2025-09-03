import { MessageFlags } from 'discord.js';

import logger from '../../core/logger.js';

/**
 * Interaction create event handler
 * Handles slash command interactions
 * Fired when someone uses a slash comand
 * Executes the command with error handling
 */
export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Only handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      logger.info(
        `${interaction.user.tag} used /${interaction.commandName} in ${interaction.guild?.name || 'DM'}`
      );

      await command.execute(interaction, client);
    } catch (error) {
      logger.critical(
        `Critical error executing command ${interaction.commandName} - command system failure`,
        'interaction-handler',
        error
      );

      const errorMessage = {
        content:
          'There was a critical error while executing this command! The admin has been notified.',
        flags: MessageFlags.Ephemeral
      };

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyError) {
        logger.critical(
          'Failed to send error response to user - interaction system may be broken',
          'interaction-handler',
          replyError
        );
      }
    }
  }
};
