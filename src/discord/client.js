import { Client, GatewayIntentBits, Collection } from 'discord.js';
import config from '../core/config.js';
import logger from '../core/logger.js';

/**
 * Discord bot client with proper configuration and event handling
 */
class BotClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });

    // Collections for commands and events
    this.commands = new Collection();
    this.events = new Collection();

    // Bot configuration
    this.config = config;
    this.logger = logger;
  }

  /**
   * Initialize the bot client
   */
  async initialize() {
    try {
      this.logger.info('Initializing Discord bot client...');

      // Load events
      await this.loadEvents();

      // Load commands
      await this.loadCommands();

      // Login to Discord
      await this.login(this.config.discord.token);

      this.logger.info('Discord bot client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Discord bot client:', error);
      throw error;
    }
  }

  /**
   * Load event handlers
   */
  async loadEvents() {
    try {
      const { readdirSync } = await import('fs');
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const eventsPath = join(__dirname, 'events');

      const eventFiles = readdirSync(eventsPath).filter(file => 
        file.endsWith('.js')
      );

      for (const file of eventFiles) {
        const filePath = join(eventsPath, file);
        const event = await import(filePath);
        
        if (event.default && event.default.name && event.default.execute) {
          if (event.default.once) {
            this.once(event.default.name, (...args) => 
              event.default.execute(...args, this)
            );
          } else {
            this.on(event.default.name, (...args) => 
              event.default.execute(...args, this)
            );
          }
          
          this.events.set(event.default.name, event.default);
          this.logger.debug(`Loaded event: ${event.default.name}`);
        } else {
          this.logger.warn(`Event file ${file} is missing required properties`);
        }
      }

      this.logger.info(`Loaded ${eventFiles.length} event(s)`);
    } catch (error) {
      this.logger.error('Failed to load events:', error);
      throw error;
    }
  }

  /**
   * Load slash commands
   */
  async loadCommands() {
    try {
      const { readdirSync } = await import('fs');
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const commandsPath = join(__dirname, 'commands');

      const commandFolders = readdirSync(commandsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const folder of commandFolders) {
        const folderPath = join(commandsPath, folder);
        const commandFiles = readdirSync(folderPath).filter(file => 
          file.endsWith('.js')
        );

        for (const file of commandFiles) {
          const filePath = join(folderPath, file);
          const command = await import(filePath);
          
          if (command.default && command.default.data && command.default.execute) {
            this.commands.set(command.default.data.name, command.default);
            this.logger.debug(`Loaded command: ${command.default.data.name}`);
          } else {
            this.logger.warn(`Command file ${file} is missing required properties`);
          }
        }
      }

      this.logger.info(`Loaded ${this.commands.size} command(s)`);
    } catch (error) {
      this.logger.error('Failed to load commands:', error);
      throw error;
    }
  }

  /**
   * Register slash commands with Discord
   */
  async registerCommands() {
    try {
      const { REST, Routes } = await import('discord.js');
      
      const commands = Array.from(this.commands.values()).map(command => 
        command.data.toJSON()
      );

      const rest = new REST().setToken(this.config.discord.token);

      this.logger.info(`Started refreshing ${commands.length} application (/) commands.`);

      let data;
      if (this.config.discord.guildId) {
        // Register commands for specific guild (faster for development)
        data = await rest.put(
          Routes.applicationGuildCommands(
            this.config.discord.clientId,
            this.config.discord.guildId
          ),
          { body: commands }
        );
        this.logger.info(`Successfully reloaded ${data.length} guild application (/) commands.`);
      } else {
        // Register commands globally (takes up to 1 hour to propagate)
        data = await rest.put(
          Routes.applicationCommands(this.config.discord.clientId),
          { body: commands }
        );
        this.logger.info(`Successfully reloaded ${data.length} global application (/) commands.`);
      }
    } catch (error) {
      this.logger.error('Failed to register commands:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown the bot
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down Discord bot...');
      this.destroy();
      this.logger.info('Discord bot shutdown complete');
    } catch (error) {
      this.logger.error('Error during bot shutdown:', error);
    }
  }
}

export default BotClient;
