import emailService from '../services/email.js';

/**
 * Enhanced logging utility for the bot
 * Provides consistent logging across the application with admin notifications
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
    this.errorCounts = new Map(); // Track error frequency
    this.lastAdminNotification = new Map(); // Prevent spam
    this.adminNotificationCooldown = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Log an error message with optional admin notification
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {boolean} options.notifyAdmin - Whether to notify admin (default: false)
   * @param {string} options.severity - Error severity: 'low', 'medium', 'high', 'critical' (default: 'medium')
   * @param {string} options.context - Additional context about the error
   * @param {Object} options.error - The actual error object
   */
  error(message, options = {}, ...args) {
    if (this.currentLevel >= this.levels.error) {
      const timestamp = new Date().toISOString();
      console.error(`[ERROR] ${timestamp} - ${message}`, ...args);
      
      // Handle admin notifications for critical errors
      if (options.notifyAdmin || options.severity === 'critical' || options.severity === 'high') {
        this.handleAdminNotification(message, options, timestamp);
      }
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

  /**
   * Handle admin notifications for critical errors
   * @private
   */
  async handleAdminNotification(message, options, timestamp) {
    try {
      const errorKey = this.getErrorKey(message, options);
      const now = Date.now();
      
      // Check cooldown to prevent spam
      const lastNotification = this.lastAdminNotification.get(errorKey) || 0;
      if (now - lastNotification < this.adminNotificationCooldown) {
        return;
      }
      
      // Track error frequency
      const errorCount = (this.errorCounts.get(errorKey) || 0) + 1;
      this.errorCounts.set(errorKey, errorCount);
      this.lastAdminNotification.set(errorKey, now);
      
      // Initialize email service if not already done
      if (!emailService.isEmailConfigured()) {
        emailService.initialize();
      }
      
      if (emailService.isEmailConfigured()) {
        const subject = `🚨 Atom Bot - ${options.severity?.toUpperCase() || 'ERROR'} Alert`;
        const emailMessage = this.formatAdminNotificationEmail(message, options, timestamp, errorCount);
        
        await emailService.sendNotification(subject, emailMessage);
        console.log(`[ADMIN-NOTIFY] ${timestamp} - Admin notification sent for: ${message}`);
      } else {
        console.warn(`[ADMIN-NOTIFY] ${timestamp} - Email service not configured, cannot send admin notification for: ${message}`);
      }
    } catch (error) {
      console.error(`[ADMIN-NOTIFY-ERROR] ${timestamp} - Failed to send admin notification:`, error);
    }
  }

  /**
   * Generate a unique key for error tracking
   * @private
   */
  getErrorKey(message, options) {
    const context = options.context || 'general';
    const severity = options.severity || 'medium';
    return `${context}:${severity}:${message.substring(0, 50)}`;
  }

  /**
   * Format admin notification email
   * @private
   */
  formatAdminNotificationEmail(message, options, timestamp, errorCount) {
    const severity = options.severity || 'medium';
    const context = options.context || 'Unknown';
    const errorDetails = options.error ? `\n\nError Details:\n${options.error.stack || options.error.message}` : '';
    
    return `
🚨 CRITICAL ERROR ALERT - Atom Bot

Error Message: ${message}
Severity: ${severity.toUpperCase()}
Context: ${context}
Timestamp: ${timestamp}
Error Count (last 5min): ${errorCount}

Server Details:
- Host: ${process.env.HOSTNAME || 'Unknown'}
- Environment: ${process.env.NODE_ENV || 'development'}
- Node.js Version: ${process.version}
- Bot Uptime: ${process.uptime()} seconds

${errorDetails}

This is an automated notification from Atom Bot.
If this error persists, please investigate immediately.
    `.trim();
  }

  /**
   * Log a critical error that requires immediate admin attention
   */
  critical(message, context = 'general', error = null) {
    this.error(message, {
      severity: 'critical',
      context,
      error,
      notifyAdmin: true
    });
  }

  /**
   * Log a high priority error that should be monitored
   */
  high(message, context = 'general', error = null) {
    this.error(message, {
      severity: 'high',
      context,
      error,
      notifyAdmin: true
    });
  }

  /**
   * Log a medium priority error
   */
  medium(message, context = 'general', error = null) {
    this.error(message, {
      severity: 'medium',
      context,
      error
    });
  }

  /**
   * Log a low priority error
   */
  low(message, context = 'general', error = null) {
    this.error(message, {
      severity: 'low',
      context,
      error
    });
  }

  /**
   * Reset error tracking (useful for testing or maintenance)
   */
  resetErrorTracking() {
    this.errorCounts.clear();
    this.lastAdminNotification.clear();
  }
}

// Export singleton instance
export default new Logger();
