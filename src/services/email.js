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
   * NOTE: This method is kept for compatibility but notifications are disabled
   * Email notifications are only sent for Discord credential validation failures
   */
  async sendStartupSuccess() {
    // Email notifications are only sent for Discord credential validation failures
    // Startup success notifications are disabled to reduce email spam
    logger.info('Startup success notification disabled - email notifications only sent for Discord credential failures');
    return false;
  }

  /**
   * Send critical error notification
   * NOTE: This method is kept for compatibility but notifications are disabled
   * Email notifications are only sent for Discord credential validation failures
   */
  async sendCriticalErrorNotification(errorMessage, context, errorDetails) {
    // Email notifications are only sent for Discord credential validation failures
    // Critical error notifications are disabled to reduce email spam
    logger.info('Critical error notification disabled - email notifications only sent for Discord credential failures');
    return false;
  }

  /**
   * Send high priority error notification
   * NOTE: This method is kept for compatibility but notifications are disabled
   * Email notifications are only sent for Discord credential validation failures
   */
  async sendHighPriorityErrorNotification(errorMessage, context, errorDetails) {
    // Email notifications are only sent for Discord credential validation failures
    // High priority error notifications are disabled to reduce email spam
    logger.info('High priority error notification disabled - email notifications only sent for Discord credential failures');
    return false;
  }

  /**
   * Send service failure notification
   * NOTE: This method is kept for compatibility but notifications are disabled
   * Email notifications are only sent for Discord credential validation failures
   */
  async sendServiceFailureNotification(serviceName, errorMessage, errorDetails) {
    // Email notifications are only sent for Discord credential validation failures
    // Service failure notifications are disabled to reduce email spam
    logger.info('Service failure notification disabled - email notifications only sent for Discord credential failures');
    return false;
  }

  /**
   * Send database error notification
   * NOTE: This method is kept for compatibility but notifications are disabled
   * Email notifications are only sent for Discord credential validation failures
   */
  async sendDatabaseErrorNotification(operation, errorMessage, errorDetails) {
    // Email notifications are only sent for Discord credential validation failures
    // Database error notifications are disabled to reduce email spam
    logger.info('Database error notification disabled - email notifications only sent for Discord credential failures');
    return false;
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
