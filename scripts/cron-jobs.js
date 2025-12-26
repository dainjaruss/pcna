// Cron job script to run scheduled tasks
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
// Note: avoid importing server-only TypeScript modules here to keep this script
// runnable in the runtime image. Cron will call internal API endpoints instead.

const prisma = new PrismaClient();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const USE_BUILTIN_CRON = process.env.USE_BUILTIN_CRON === 'true';

async function getSettings() {
  const settings = await prisma.setting.findMany();
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
}

// Function to call internal API endpoints
async function callInternalAPI(endpoint) {
  try {
    const response = await fetch(`${APP_URL}/api/cron/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log(`[${new Date().toISOString()}] ${endpoint}:`, result);
    return result;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error calling ${endpoint}:`, error);
  }
}

// Fetch news job - runs based on configured interval
async function scheduleFetchNews() {
  const settings = await getSettings();
  const interval = parseInt(settings.refreshInterval || '6');
  
  // Convert hours to cron expression
  let cronExpression;
  if (interval === 4) {
    cronExpression = '0 */4 * * *'; // Every 4 hours
  } else if (interval === 6) {
    cronExpression = '0 */6 * * *'; // Every 6 hours
  } else if (interval === 8) {
    cronExpression = '0 */8 * * *'; // Every 8 hours
  } else if (interval === 12) {
    cronExpression = '0 */12 * * *'; // Every 12 hours
  } else {
    cronExpression = '0 0 * * *'; // Daily at midnight
  }
  
  console.log(`[${new Date().toISOString()}] Scheduling news fetch with cron: ${cronExpression}`);
  
  cron.schedule(cronExpression, async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled news fetch...`);
    await callInternalAPI('fetch-news');
  });
}

// Daily email job - runs at configured time
async function scheduleDailyEmail() {
  const settings = await getSettings();
  const emailTime = settings.emailTime || '08:00';
  const [hour, minute] = emailTime.split(':');
  
  const cronExpression = `${minute} ${hour} * * *`;
  
  console.log(`[${new Date().toISOString()}] Scheduling daily email with cron: ${cronExpression}`);
  
  cron.schedule(cronExpression, async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled daily email...`);
    await callInternalAPI('send-email');
  });
}

// Initialize and start cron jobs
async function startCronJobs() {
  console.log(`[${new Date().toISOString()}] Cron jobs script started...`);
  
  // Check if built-in cron is enabled
  if (!USE_BUILTIN_CRON) {
    console.log(`[${new Date().toISOString()}] Built-in cron is disabled (USE_BUILTIN_CRON=${process.env.USE_BUILTIN_CRON})`);
    console.log(`[${new Date().toISOString()}] If you're using n8n or another scheduler, this is expected.`);
    console.log(`[${new Date().toISOString()}] To enable built-in cron, set USE_BUILTIN_CRON=true in your .env file.`);
    console.log(`[${new Date().toISOString()}] Exiting gracefully...`);
    await prisma.$disconnect();
    process.exit(0);
  }
  
  console.log(`[${new Date().toISOString()}] Built-in cron is enabled. Starting scheduled tasks...`);
  
  try {
    await scheduleFetchNews();
    await scheduleDailyEmail();
    
    console.log(`[${new Date().toISOString()}] Cron jobs started successfully!`);
    console.log('Press Ctrl+C to stop.');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error starting cron jobs:`, error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down cron jobs...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down cron jobs...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the cron jobs
startCronJobs();
