/**
 * Simple logging utility for the bot
 * Provides consistent logging across the application
 */
class Logger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    
    this.currentLevel = this.levels[process.env.LOG_LEVEL || 'info'];
  }

  /**
   * Log an error message
   */
  error(message, ...args) {
    if (this.currentLevel >= this.levels.error) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message, ...args) {
    if (this.currentLevel >= this.levels.warn) {
      console.warn(`[WARN]  ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  /**
   * Log an info message
   */
  info(message, ...args) {
    if (this.currentLevel >= this.levels.info) {
      console.info(`[INFO]  ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  /**
   * Log a debug message
   */
  debug(message, ...args) {
    if (this.currentLevel >= this.levels.debug) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  /**
   * Log with a custom prefix
   */
  log(prefix, message, ...args) {
    console.log(`[${prefix}] ${new Date().toISOString()} - ${message}`, ...args);
  }
}

// Export singleton instance
export default new Logger();
