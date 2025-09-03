import logger from './logger.js';
import database from '../services/database.js';
import emailService from '../services/email.js';
import errorHandler from './errorHandler.js';

/**
 * Health monitoring system
 * Monitors bot health and sends alerts for critical issues
 */
class HealthMonitor {
  constructor() {
    this.healthChecks = new Map();
    this.lastHealthReport = null;
    this.healthReportInterval = 5 * 60 * 1000; // 5 minutes
    this.criticalThresholds = {
      errorRate: 10, // 10 errors per minute
      responseTime: 5000, // 5 seconds
      memoryUsage: 0.8, // 80% memory usage
      cpuUsage: 0.9 // 90% CPU usage
    };
  }

  /**
   * Register a health check
   * @param {string} name - Name of the health check
   * @param {Function} checkFunction - Function that returns health status
   * @param {Object} options - Health check options
   */
  registerHealthCheck(name, checkFunction, options = {}) {
    this.healthChecks.set(name, {
      function: checkFunction,
      critical: options.critical || false,
      interval: options.interval || 60000, // 1 minute default
      lastCheck: null,
      lastResult: null,
      consecutiveFailures: 0
    });
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      checks: {},
      criticalIssues: [],
      warnings: []
    };

    for (const [name, check] of this.healthChecks) {
      try {
        const result = await check.function();
        results.checks[name] = {
          status: result.status || 'healthy',
          message: result.message || 'OK',
          details: result.details || {},
          responseTime: result.responseTime || 0
        };

        // Check for critical issues
        if (result.status === 'critical' || (check.critical && result.status !== 'healthy')) {
          results.criticalIssues.push({
            check: name,
            message: result.message,
            details: result.details
          });
          results.overall = 'critical';
        } else if (result.status === 'warning') {
          results.warnings.push({
            check: name,
            message: result.message,
            details: result.details
          });
          if (results.overall === 'healthy') {
            results.overall = 'warning';
          }
        }

        // Update check tracking
        check.lastCheck = new Date();
        check.lastResult = result;
        check.consecutiveFailures = result.status === 'healthy' ? 0 : check.consecutiveFailures + 1;

      } catch (error) {
        logger.high(`Health check ${name} failed`, 'health-monitor', error);
        results.checks[name] = {
          status: 'error',
          message: `Health check failed: ${error.message}`,
          details: { error: error.message }
        };
        results.criticalIssues.push({
          check: name,
          message: `Health check failed: ${error.message}`,
          details: { error: error.message }
        });
        results.overall = 'critical';
      }
    }

    this.lastHealthReport = results;
    return results;
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    // Calculate memory usage percentage
    health.memoryUsagePercent = health.memory.heapUsed / health.memory.heapTotal;

    return health;
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    const startTime = Date.now();
    try {
      // Test basic database connectivity
      await database.queryOne('SELECT 1 as test');
      
      // Test guild settings table
      await database.query('SELECT COUNT(*) as count FROM guild_settings LIMIT 1');
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime > 1000 ? 'warning' : 'healthy',
        message: `Database responding in ${responseTime}ms`,
        responseTime,
        details: {
          connected: database.isDatabaseConnected(),
          responseTime
        }
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Database health check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check Discord client health
   */
  async checkDiscordHealth(client) {
    try {
      if (!client || !client.isReady()) {
        return {
          status: 'critical',
          message: 'Discord client not ready',
          details: { ready: false }
        };
      }

      const guilds = client.guilds.cache.size;
      const users = client.users.cache.size;
      const channels = client.channels.cache.size;

      return {
        status: 'healthy',
        message: `Connected to ${guilds} guilds, ${users} users, ${channels} channels`,
        details: {
          guilds,
          users,
          channels,
          ready: client.isReady(),
          uptime: client.uptime
        }
      };
    } catch (error) {
      return {
        status: 'critical',
        message: `Discord health check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check email service health
   */
  async checkEmailHealth() {
    try {
      const isConfigured = emailService.isEmailConfigured();
      
      if (!isConfigured) {
        return {
          status: 'warning',
          message: 'Email service not configured',
          details: { configured: false }
        };
      }

      return {
        status: 'healthy',
        message: 'Email service configured and ready',
        details: { configured: true }
      };
    } catch (error) {
      return {
        status: 'warning',
        message: `Email health check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check error rates
   */
  async checkErrorRates() {
    try {
      const errorStats = errorHandler.getErrorStats();
      const totalErrors = errorStats.totalErrors;
      
      // Simple error rate calculation (errors in last hour)
      const errorRate = totalErrors; // This is a simplified calculation
      
      if (errorRate > this.criticalThresholds.errorRate) {
        return {
          status: 'critical',
          message: `High error rate: ${errorRate} errors detected`,
          details: { errorRate, errorStats }
        };
      } else if (errorRate > this.criticalThresholds.errorRate / 2) {
        return {
          status: 'warning',
          message: `Elevated error rate: ${errorRate} errors detected`,
          details: { errorRate, errorStats }
        };
      }

      return {
        status: 'healthy',
        message: `Error rate normal: ${errorRate} errors detected`,
        details: { errorRate, errorStats }
      };
    } catch (error) {
      return {
        status: 'warning',
        message: `Error rate check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Send health report via email
   */
  async sendHealthReport(healthResults) {
    if (!emailService.isEmailConfigured()) {
      return false;
    }

    try {
      const subject = `📊 Atom Bot Health Report - ${healthResults.overall.toUpperCase()}`;
      
      let message = `
ATOM BOT HEALTH REPORT
Generated: ${healthResults.timestamp}
Overall Status: ${healthResults.overall.toUpperCase()}

SYSTEM HEALTH:
- Uptime: ${Math.floor(process.uptime() / 3600)} hours
- Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB
- Node.js Version: ${process.version}
- Platform: ${process.platform}

HEALTH CHECKS:
`;

      for (const [name, check] of Object.entries(healthResults.checks)) {
        const status = check.status.toUpperCase();
        const emoji = check.status === 'healthy' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
        message += `- ${emoji} ${name}: ${status} - ${check.message}\n`;
      }

      if (healthResults.criticalIssues.length > 0) {
        message += `\nCRITICAL ISSUES:\n`;
        healthResults.criticalIssues.forEach(issue => {
          message += `- ${issue.check}: ${issue.message}\n`;
        });
      }

      if (healthResults.warnings.length > 0) {
        message += `\nWARNINGS:\n`;
        healthResults.warnings.forEach(warning => {
          message += `- ${warning.check}: ${warning.message}\n`;
        });
      }

      message += `\nThis is an automated health report from Atom Bot.`;

      return await emailService.sendNotification(subject, message);
    } catch (error) {
      logger.error('Failed to send health report:', error);
      return false;
    }
  }

  /**
   * Initialize health monitoring
   */
  async initialize(client) {
    // Register default health checks
    this.registerHealthCheck('database', () => this.checkDatabaseHealth(), { critical: true });
    this.registerHealthCheck('discord', () => this.checkDiscordHealth(client), { critical: true });
    this.registerHealthCheck('email', () => this.checkEmailHealth(), { critical: false });
    this.registerHealthCheck('error-rates', () => this.checkErrorRates(), { critical: true });

    // Run initial health check
    await this.runHealthChecks();

    // Set up periodic health monitoring
    setInterval(async () => {
      try {
        const healthResults = await this.runHealthChecks();
        
        // Send health report if there are critical issues
        if (healthResults.overall === 'critical') {
          await this.sendHealthReport(healthResults);
        }
        
        // Log health status
        if (healthResults.overall !== 'healthy') {
          logger.warn(`Health check completed: ${healthResults.overall}`, healthResults);
        }
      } catch (error) {
        logger.critical('Health monitoring failed', 'health-monitor', error);
      }
    }, this.healthReportInterval);

    logger.info('Health monitoring initialized');
  }

  /**
   * Get current health status
   */
  getCurrentHealth() {
    return this.lastHealthReport;
  }
}

// Export singleton instance
export default new HealthMonitor();
