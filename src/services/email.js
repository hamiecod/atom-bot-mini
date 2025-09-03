import nodemailer from 'nodemailer';
import logger from '../core/logger.js';

/**
 * Email service for sending notifications
 * Uses SMTP to send emails when critical issues occur
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
  }

  /**
   * Initialize the email service
   */
  initialize() {
    try {
      const email = process.env.EMAIL;
      const password = process.env.EMAIL_PASSWORD;

      if (!email || !password) {
        logger.warn('Email service not configured: EMAIL and EMAIL_PASSWORD not set');
        return false;
      }

      this.transporter = nodemailer.createTransporter({
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
          user: email,
          pass: password,
        },
      });

      this.isConfigured = true;
      logger.info('Email service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      return false;
    }
  }

  /**
   * Send an email notification
   */
  async sendNotification(subject, message, isHtml = false) {
    if (!this.isConfigured || !this.transporter) {
      logger.warn('Email service not configured, skipping email notification');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL,
        to: 'hargunbeersingh@gmail.com',
        subject: subject,
        [isHtml ? 'html' : 'text']: message,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email notification sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      return false;
    }
  }

  /**
   * Send environment validation failure notification
   */
  async sendEnvValidationFailure(missingVariables) {
    const subject = '🚨 Atom Bot - Environment Variables Missing';
    
    const message = `
Atom Bot failed to start due to missing environment variables.

Missing Variables:
${missingVariables.map(variable => `- ${variable}`).join('\n')}

Server Details:
- Host: ${process.env.HOSTNAME || 'Unknown'}
- Time: ${new Date().toISOString()}
- Node.js Version: ${process.version}
- Environment: ${process.env.NODE_ENV || 'development'}

Please check the .env file and ensure all required variables are set:
- DISCORD_TOKEN: Your Discord bot token
- DISCORD_CLIENT_ID: Your Discord application client ID

Optional variables:
- DISCORD_GUILD_ID: Guild ID for guild-specific commands
- EMAIL: Email address for notifications
- EMAIL_PASSWORD: Email password for notifications

This is an automated notification from Atom Bot.
    `.trim();

    return await this.sendNotification(subject, message);
  }

  /**
   * Send bot startup success notification
   */
  async sendStartupSuccess() {
    const subject = '✅ Atom Bot - Started Successfully';
    
    const message = `
Atom Bot has started successfully!

Server Details:
- Host: ${process.env.HOSTNAME || 'Unknown'}
- Time: ${new Date().toISOString()}
- Node.js Version: ${process.version}
- Environment: ${process.env.NODE_ENV || 'development'}

Bot is now online and ready to handle commands.

This is an automated notification from Atom Bot.
    `.trim();

    return await this.sendNotification(subject, message);
  }

  /**
   * Send critical error notification
   */
  async sendCriticalErrorNotification(errorMessage, context, errorDetails) {
    const subject = '🚨 Atom Bot - Critical Error Alert';
    
    const message = `
CRITICAL ERROR DETECTED - Atom Bot

Error: ${errorMessage}
Context: ${context}
Time: ${new Date().toISOString()}

Server Details:
- Host: ${process.env.HOSTNAME || 'Unknown'}
- Environment: ${process.env.NODE_ENV || 'development'}
- Node.js Version: ${process.version}
- Bot Uptime: ${process.uptime()} seconds

Error Details:
${errorDetails}

This requires immediate attention. Please investigate and resolve as soon as possible.

This is an automated notification from Atom Bot.
    `.trim();

    return await this.sendNotification(subject, message);
  }

  /**
   * Send high priority error notification
   */
  async sendHighPriorityErrorNotification(errorMessage, context, errorDetails) {
    const subject = '⚠️ Atom Bot - High Priority Error';
    
    const message = `
HIGH PRIORITY ERROR - Atom Bot

Error: ${errorMessage}
Context: ${context}
Time: ${new Date().toISOString()}

Server Details:
- Host: ${process.env.HOSTNAME || 'Unknown'}
- Environment: ${process.env.NODE_ENV || 'development'}
- Node.js Version: ${process.version}
- Bot Uptime: ${process.uptime()} seconds

Error Details:
${errorDetails}

This error should be monitored and addressed when possible.

This is an automated notification from Atom Bot.
    `.trim();

    return await this.sendNotification(subject, message);
  }

  /**
   * Send service failure notification
   */
  async sendServiceFailureNotification(serviceName, errorMessage, errorDetails) {
    const subject = `🔧 Atom Bot - ${serviceName} Service Failure`;
    
    const message = `
SERVICE FAILURE - Atom Bot

Service: ${serviceName}
Error: ${errorMessage}
Time: ${new Date().toISOString()}

Server Details:
- Host: ${process.env.HOSTNAME || 'Unknown'}
- Environment: ${process.env.NODE_ENV || 'development'}
- Node.js Version: ${process.version}
- Bot Uptime: ${process.uptime()} seconds

Error Details:
${errorDetails}

The ${serviceName} service has failed. Some bot functionality may be affected.

This is an automated notification from Atom Bot.
    `.trim();

    return await this.sendNotification(subject, message);
  }

  /**
   * Send database error notification
   */
  async sendDatabaseErrorNotification(operation, errorMessage, errorDetails) {
    const subject = '🗄️ Atom Bot - Database Error';
    
    const message = `
DATABASE ERROR - Atom Bot

Operation: ${operation}
Error: ${errorMessage}
Time: ${new Date().toISOString()}

Server Details:
- Host: ${process.env.HOSTNAME || 'Unknown'}
- Environment: ${process.env.NODE_ENV || 'development'}
- Node.js Version: ${process.version}
- Bot Uptime: ${process.uptime()} seconds

Error Details:
${errorDetails}

Database operations are failing. This may affect bot functionality significantly.

This is an automated notification from Atom Bot.
    `.trim();

    return await this.sendNotification(subject, message);
  }

  /**
   * Check if email service is configured
   */
  isEmailConfigured() {
    return this.isConfigured;
  }
}

// Export singleton instance
export default new EmailService();
