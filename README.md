# Atom Bot

A modular Discord.js bot built with clean architecture principles, featuring SQLite database integration and comprehensive error handling.

## 🏗️ Architecture

The bot follows a clean, modular architecture with clear separation of concerns:

```
src/
├── core/           # Core utilities (config, logging)
├── services/       # Database and external services
├── discord/        # Discord-specific code
│   ├── commands/   # Slash commands (organized by category)
│   ├── events/     # Discord event handlers
│   └── client.js   # Bot client configuration
├── features/       # Business logic features
└── index.js        # Application entry point
```

## 🚀 Features

- **Modular Architecture**: Clean separation of concerns with organized file structure
- **SQLite Database**: Persistent data storage with automatic migrations
- **Slash Commands**: Modern Discord slash command system
- **Event Handling**: Comprehensive Discord event management
- **Error Handling**: Graceful error handling and logging
- **Configuration Management**: Environment-based configuration
- **Logging System**: Structured logging with configurable levels

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- A Discord application and bot token
- Git

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd atom_bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your Discord bot credentials:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   DISCORD_GUILD_ID=your_guild_id_here  # Optional, for guild-specific commands
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

## 🔧 Development

### Available Scripts

- `npm start` - Start the bot in production mode
- `npm run dev` - Start the bot in development mode with auto-restart
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Adding New Commands

1. Create a new directory under `src/discord/commands/` for your command category
2. Create a command file with the following structure:

```javascript
import { SlashCommandBuilder } from 'discord.js';
import logger from '../../../core/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('commandname')
    .setDescription('Command description'),

  async execute(interaction, client) {
    // Command logic here
    await interaction.reply('Hello!');
  },
};
```

### Adding New Events

1. Create a new file under `src/discord/events/`
2. Use the following structure:

```javascript
import logger from '../../core/logger.js';

export default {
  name: 'eventName',
  once: false, // Set to true for events that should only run once
  async execute(...args, client) {
    // Event logic here
  },
};
```

## 🗄️ Database

The bot uses SQLite for data persistence. The database is automatically created and migrated on startup.

### Current Tables

- `users` - Discord user information
- `guilds` - Discord server information  
- `guild_settings` - Server-specific configuration

### Database Service Usage

```javascript
import databaseService from '../services/database.js';

// Query data
const users = await databaseService.query('SELECT * FROM users');

// Insert/Update data
await databaseService.execute(
  'INSERT INTO users (discord_id, username) VALUES (?, ?)',
  [userId, username]
);
```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | Yes |
| `DISCORD_CLIENT_ID` | Your Discord application client ID | Yes |
| `DISCORD_GUILD_ID` | Guild ID for guild-specific commands | No |
| `DATABASE_PATH` | Path to SQLite database file | No (defaults to ./data/bot.db) |
| `NODE_ENV` | Environment (development/production) | No |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) | No |

## 📝 Logging

The bot includes a comprehensive logging system with configurable levels:

- `error` - Error messages only
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging information

## 🚨 Error Handling

The bot includes comprehensive error handling:

- Graceful shutdown on SIGINT/SIGTERM
- Uncaught exception handling
- Unhandled promise rejection handling
- Command execution error handling
- Database connection error handling

## 🤝 Contributing

1. Follow the existing code style and architecture
2. Add appropriate error handling and logging
3. Test your changes thoroughly
4. Make small, focused commits
5. Update documentation as needed

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the logs for error messages
2. Verify your environment variables are set correctly
3. Ensure your Discord bot has the necessary permissions
4. Check that your Node.js version meets the requirements

## 🔄 Updates

The bot is designed to be easily extensible. When adding new features:

1. Follow the modular architecture
2. Add appropriate database migrations if needed
3. Include proper error handling and logging
4. Update this README with new features or configuration options
