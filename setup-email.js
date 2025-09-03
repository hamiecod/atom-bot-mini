#!/usr/bin/env node

/**
 * Email Setup Helper Script
 * This script helps you configure email notifications for Atom Bot
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEmail() {
  console.log('🔧 Atom Bot Email Setup');
  console.log('========================\n');

  // Check if .env file exists
  const envPath = '.env';
  let envContent = '';

  if (existsSync(envPath)) {
    console.log('📄 Found existing .env file');
    envContent = readFileSync(envPath, 'utf8');
  } else {
    console.log('📄 Creating new .env file from template...');
    envContent = readFileSync('env.example', 'utf8');
  }

  console.log('\n📧 Email Configuration');
  console.log('To enable email notifications, you need to provide:');
  console.log('1. Your email address (sender)');
  console.log('2. Your email password or app password');
  console.log('\nNote: For Gmail, you may need to use an "App Password" instead of your regular password.');
  console.log('See: https://support.google.com/accounts/answer/185833\n');

  const email = await question('Enter your email address: ');
  const password = await question('Enter your email password/app password: ');

  if (!email || !password) {
    console.log('❌ Email and password are required. Setup cancelled.');
    rl.close();
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('❌ Invalid email format. Setup cancelled.');
    rl.close();
    return;
  }

  // Update .env content
  let updatedContent = envContent;
  
  // Update or add EMAIL
  if (updatedContent.includes('EMAIL=')) {
    updatedContent = updatedContent.replace(/EMAIL=.*/, `EMAIL=${email}`);
  } else {
    updatedContent += `\nEMAIL=${email}`;
  }

  // Update or add EMAIL_PASSWORD
  if (updatedContent.includes('EMAIL_PASSWORD=')) {
    updatedContent = updatedContent.replace(/EMAIL_PASSWORD=.*/, `EMAIL_PASSWORD=${password}`);
  } else {
    updatedContent += `\nEMAIL_PASSWORD=${password}`;
  }

  // Write updated .env file
  writeFileSync(envPath, updatedContent);

  console.log('\n✅ Email configuration saved to .env file');
  console.log('📧 Email notifications will be sent to: hargunbeersingh@gmail.com');
  console.log('\n🚀 You can now start the bot with: npm start');
  console.log('The bot will test the email connection on startup.');

  rl.close();
}

setupEmail().catch(console.error);
