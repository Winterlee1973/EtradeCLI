import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function startScheduler(slackApp) {
  const CHANNEL = process.env.SLACK_ALERT_CHANNEL || '#trading';
  
  // Morning Alert: SDP Today at 9:40 AM EST
  cron.schedule('40 9 * * 1-5', async () => {
    console.log('🌅 Running morning SDP Today alert...');
    try {
      const { stdout } = await execAsync('node spx-deeppremium.js today');
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: CHANNEL,
        text: '🌅 *Morning Market Alert - SDP Today (0DTE)*',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '🌅 *Morning Market Alert - SDP Today (0DTE)*'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`\n${stdout}\n\`\`\``
            }
          }
        ]
      });
      
      console.log('✅ Morning alert sent successfully');
    } catch (error) {
      console.error('❌ Morning alert failed:', error);
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: CHANNEL,
        text: `🚨 Morning Alert Error: ${error.message}`
      });
    }
  }, {
    timezone: 'America/New_York'
  });
  
  // Afternoon Alert: SDP Tomorrow at 3:50 PM EST
  cron.schedule('50 15 * * 1-5', async () => {
    console.log('🌆 Running afternoon SDP Tomorrow alert...');
    try {
      const { stdout } = await execAsync('node spx-deeppremium.js tomorrow');
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: CHANNEL,
        text: '🌆 *Afternoon Market Alert - SDP Tomorrow (1DTE)*',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '🌆 *Afternoon Market Alert - SDP Tomorrow (1DTE)*'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`\n${stdout}\n\`\`\``
            }
          }
        ]
      });
      
      console.log('✅ Afternoon alert sent successfully');
    } catch (error) {
      console.error('❌ Afternoon alert failed:', error);
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: CHANNEL,
        text: `🚨 Afternoon Alert Error: ${error.message}`
      });
    }
  }, {
    timezone: 'America/New_York'
  });
  
  // Test alert (runs every minute for testing - remove in production)
  if (process.env.NODE_ENV === 'development') {
    cron.schedule('* * * * *', async () => {
      console.log('🧪 Test alert - every minute in dev mode');
    });
  }
  
  console.log('📅 Scheduler initialized with Eastern Time:');
  console.log('   🌅 Morning Alert: 9:40 AM EST (SDP Today)');
  console.log('   🌆 Afternoon Alert: 3:50 PM EST (SDP Tomorrow)');
}