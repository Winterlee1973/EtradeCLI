import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function startScheduler(slackApp) {
  const CHANNEL = process.env.SLACK_ALERT_CHANNEL || '#trading';
  
  // Tuesday/Wednesday/Thursday 9:40 AM: SDP 0DTE
  cron.schedule('40 9 * * 2,3,4', async () => {
    console.log('🌅 Running 0DTE alert (Tue/Wed/Thu 9:40 AM)...');
    try {
      const { stdout } = await execAsync('node spx-deeppremium.js 0');
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: CHANNEL,
        text: '🌅 *SDP 0DTE Alert*',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '🌅 *SDP 0DTE Alert - Same Day Expiration*'
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
      
      console.log('✅ 0DTE alert sent successfully');
    } catch (error) {
      console.error('❌ 0DTE alert failed:', error);
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: CHANNEL,
        text: `🚨 0DTE Alert Error: ${error.message}`
      });
    }
  }, {
    timezone: 'America/New_York'
  });
  
  // Friday 3:50 PM: SDP 1DTE
  cron.schedule('50 15 * * 5', async () => {
    console.log('🌆 Running 1DTE alert (Friday 3:50 PM)...');
    try {
      const { stdout } = await execAsync('node spx-deeppremium.js 1');
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: CHANNEL,
        text: '🌆 *SDP 1DTE Alert*',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '🌆 *SDP 1DTE Alert - Weekend Hold Position*'
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
      
      console.log('✅ 1DTE alert sent successfully');
    } catch (error) {
      console.error('❌ 1DTE alert failed:', error);
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: CHANNEL,
        text: `🚨 1DTE Alert Error: ${error.message}`
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
  console.log('   🌅 0DTE Alerts: Tue/Wed/Thu at 9:40 AM EST');
  console.log('   🌆 1DTE Alert: Friday at 3:50 PM EST');
}