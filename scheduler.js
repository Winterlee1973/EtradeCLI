import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { formatSPXForSlack } from './slack-formatter.js';

const execAsync = promisify(exec);

export async function startScheduler(slackApp) {
  // Get user ID from environment or try different approaches
  let USER_ID = process.env.SLACK_USER_ID;
  
  // If no env var set, try to get user list and find Lee
  if (!USER_ID) {
    try {
      const users = await slackApp.client.users.list({
        token: process.env.SLACK_BOT_TOKEN
      });
      const leeUser = users.members.find(user => 
        user.real_name?.toLowerCase().includes('lee') || 
        user.name?.toLowerCase().includes('lee')
      );
      USER_ID = leeUser ? leeUser.id : 'D092322FRQA';
      console.log(`🔍 Found user: ${leeUser?.real_name || 'Unknown'} (${USER_ID})`);
    } catch (err) {
      console.log('❌ Could not fetch users, using DM channel ID');
      USER_ID = 'D092322FRQA';
    }
  }
  
  // Tuesday/Wednesday/Thursday 9:40 AM: SPX 0DTE
  cron.schedule('40 9 * * 2,3,4', async () => {
    console.log('🌅 Running 0DTE alert (Tue/Wed/Thu 9:40 AM)...');
    try {
      const { stdout } = await execAsync('AUTO_SCHEDULED=true node spx-deeppremium.js 0');
      
      // Format using the rich Slack formatter
      const formattedMessage = formatSPXForSlack(stdout);
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: USER_ID,  // DM to user
        text: '🌅 *SPX 0DTE Alert*',
        ...formattedMessage
      });
      
      console.log('✅ 0DTE alert sent successfully');
    } catch (error) {
      console.error('❌ 0DTE alert failed:', error);
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: USER_ID,
        text: `🚨 0DTE Alert Error: ${error.message}`
      });
    }
  }, {
    timezone: 'America/New_York'
  });
  
  // Friday 3:50 PM: SPX 1DTE
  cron.schedule('50 15 * * 5', async () => {
    console.log('🌆 Running 1DTE alert (Friday 3:50 PM)...');
    try {
      const { stdout } = await execAsync('AUTO_SCHEDULED=true node spx-deeppremium.js 1');
      
      // Format using the rich Slack formatter
      const formattedMessage = formatSPXForSlack(stdout);
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: USER_ID,
        text: '🌆 *SPX 1DTE Alert*',
        ...formattedMessage
      });
      
      console.log('✅ 1DTE alert sent successfully');
    } catch (error) {
      console.error('❌ 1DTE alert failed:', error);
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: USER_ID,
        text: `🚨 1DTE Alert Error: ${error.message}`
      });
    }
  }, {
    timezone: 'America/New_York'
  });
  
  // TEST: Every 2 minutes during market hours for spx td1 minbid2 distance300
  cron.schedule('*/2 9-16 * * 1-5', async () => {
    console.log('🧪 Running 2-min test SPX scan...');
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    
    try {
      const { stdout } = await execAsync('AUTO_SCHEDULED=true node spx-deeppremium.js td1 minbid2 distance300');
      
      // Format using the rich Slack formatter
      const formattedMessage = formatSPXForSlack(stdout);
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: USER_ID,
        text: '🧪 *Test: SPX TD1 MINBID$2.00 DISTANCE300PTS*',
        ...formattedMessage
      });
      
      console.log('✅ Test SPX scan sent successfully');
    } catch (error) {
      console.error('❌ Test SPX scan failed:', error);
      
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: USER_ID,
        text: `🚨 Test SPX Scan Error: ${error.message}`
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
  
  // Send test message immediately
  (async () => {
    try {
      console.log('📤 Sending test message to verify DM channel...');
      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: USER_ID,
        text: 'Hey Lee! 👋 Scheduler is now configured and ready to send automated scans to this DM.'
      });
      console.log('✅ Test message sent successfully');
    } catch (error) {
      console.error('❌ Test message failed:', error);
    }
  })();

  console.log('📅 Scheduler initialized with Eastern Time:');
  console.log('   🌅 0DTE Alerts: Tue/Wed/Thu at 9:40 AM EST');
  console.log('   🌆 1DTE Alert: Friday at 3:50 PM EST');
  console.log('   🧪 TEST: SPX 1 1 every 5 mins during market hours');
  console.log(`   📨 Sending DMs to channel: ${USER_ID}`);
}