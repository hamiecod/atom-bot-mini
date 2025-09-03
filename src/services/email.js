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
        logger.warn(
          'Email service not configured: EMAIL and EMAIL_PASSWORD not set'
        );
        logger.info('To enable email notifications:');
        logger.info('  1. Create a .env file (copy from env.example)');
        logger.info('  2. Set EMAIL=your_email@example.com');
        logger.info('  3. Set EMAIL_PASSWORD=your_email_password');
        return false;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        logger.error(`Invalid email format: ${email}`);
        return false;
      }

      this.transporter = nodemailer.createTransporter({
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
          user: email,
          pass: password
        }
      });

      this.isConfigured = true;
      logger.info(`Email service initialized successfully with ${email}`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      return false;
    }
  }

  /**
   * Test email connection
   */
  async testConnection() {
    if (!this.isConfigured || !this.transporter) {
      logger.warn('Email service not configured, cannot test connection');
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email connection test successful');
      return true;
    } catch (error) {
      logger.error('Email connection test failed:', error);
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
        [isHtml ? 'html' : 'text']: message
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
   * Send startup notification
   */
  async sendStartupNotification() {
    const subject = '🚀 Atom Bot - Started Successfully';
    
    const message = `
Atom Bot has started successfully!

Server Details:
- Host: ${process.env.HOSTNAME || 'Unknown'}
- Time: ${new Date().toISOString()}
- Node.js Version: ${process.version}
- Environment: ${process.env.NODE_ENV || 'development'}
- Email Service: ${this.isConfigured ? 'Configured' : 'Not configured'}

Bot is now online and ready to serve Discord commands.

This is an automated notification from Atom Bot.
    `.trim();

    return await this.sendNotification(subject, message);
  }

  /**
   * Send critical error notification
   */
  async sendCriticalErrorNotification(error, context = 'unknown') {
    const subject = '🚨 Atom Bot - Critical Error';
    
    const message = `
A critical error has occurred in Atom Bot!

Error Details:
- Context: ${context}
- Time: ${new Date().toISOString()}
- Error: ${error.message || error}
- Stack: ${error.stack || 'No stack trace available'}

Server Details:
- Host: ${process.env.HOSTNAME || 'Unknown'}
- Node.js Version: ${process.version}
- Environment: ${process.env.NODE_ENV || 'development'}

Please investigate this issue immediately.

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
