#!/usr/bin/env node
import pkg from '@slack/bolt';
const { App } = pkg;
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import { claudeChat } from './claude-integration.js';
import { startScheduler } from './scheduler.js';

dotenv.config();

const execAsync = promisify(exec);

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

// Debug environment variables
console.log('🔧 Checking tokens...');
console.log('Bot Token starts with:', process.env.SLACK_BOT_TOKEN?.substring(0, 10) + '...');
console.log('App Token starts with:', process.env.SLACK_APP_TOKEN?.substring(0, 10) + '...');
console.log('Signing Secret length:', process.env.SLACK_SIGNING_SECRET?.length);

// Trading command patterns
const TRADING_COMMANDS = {
  quote: /^(q|quote)\s+([A-Z]{1,5})$/i,
  spx_puts: /^(sps|spx|puts)(\s+.*)?$/i,
  deep_premium: /^(sdp|deep)\s+(today|tomorrow)$/i,
  deep_premium_custom: /^sdp\s+(\d+)\s+points?\s+(\d+\.?\d*)\s+premium$/i
};

// Execute trading commands
async function executeCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command, { 
      cwd: process.cwd(),
      timeout: 30000 
    });
    return stdout || stderr;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

// Parse trading commands
function parseMessage(text) {
  const cleanText = text.trim();
  
  // Quote command
  if (TRADING_COMMANDS.quote.test(cleanText)) {
    const match = cleanText.match(TRADING_COMMANDS.quote);
    return {
      type: 'trading',
      command: `node run.js q ${match[2].toUpperCase()}`
    };
  }
  
  // SPX puts command
  if (TRADING_COMMANDS.spx_puts.test(cleanText)) {
    const filterPart = cleanText.match(TRADING_COMMANDS.spx_puts)[2];
    const filter = filterPart ? filterPart.trim() : 'bid>=0.05 AND distance_from_spx>=200';
    return {
      type: 'trading',
      command: `node run.js sps --filter "${filter}"`
    };
  }
  
  // Deep premium commands
  if (TRADING_COMMANDS.deep_premium.test(cleanText)) {
    const match = cleanText.match(TRADING_COMMANDS.deep_premium);
    return {
      type: 'trading',
      command: `node spx-deeppremium.js ${match[2]}`
    };
  }
  
  // Custom deep premium
  if (TRADING_COMMANDS.deep_premium_custom.test(cleanText)) {
    const match = cleanText.match(TRADING_COMMANDS.deep_premium_custom);
    return {
      type: 'trading',
      command: `node spx-deeppremium.js --min-distance ${match[1]} --min-premium ${match[2]}`
    };
  }
  
  // Default to Claude conversation
  return {
    type: 'claude',
    message: cleanText
  };
}

// Handle messages
app.message(async ({ message, say }) => {
  try {
    console.log('📨 Received message:', message.text);
    console.log('👤 From user:', message.user);
    console.log('📍 Channel:', message.channel);
    console.log('🧵 Thread:', message.thread_ts ? 'Yes' : 'No');
    
    // Skip bot messages
    if (message.subtype === 'bot_message') {
      console.log('🤖 Skipping bot message');
      return;
    }
    
    const parsed = parseMessage(message.text);
    console.log('🔍 Parsed as:', parsed.type, parsed.command || parsed.message);
    
    if (parsed.type === 'trading') {
      console.log('💼 Executing trading command:', parsed.command);
      const result = await executeCommand(parsed.command);
      console.log('📊 TRADING RESPONSE:');
      console.log('─'.repeat(50));
      console.log(result.substring(0, 500) + (result.length > 500 ? '...' : ''));
      console.log('─'.repeat(50));
      await say({
        text: `\`\`\`\n${result}\n\`\`\``,
        thread_ts: message.ts
      });
      console.log('📤 Sent trading response to Slack');
    } else {
      console.log('🤖 Sending to Claude:', parsed.message);
      const response = await claudeChat(parsed.message, message.user);
      console.log('🧠 CLAUDE RESPONSE:');
      console.log('─'.repeat(50));
      console.log(response.substring(0, 300) + (response.length > 300 ? '...' : ''));
      console.log('─'.repeat(50));
      await say({
        text: response,
        thread_ts: message.ts
      });
      console.log('📤 Sent Claude response to Slack');
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    await say(`Error: ${error.message}`);
  }
});

// Handle app mentions
app.event('app_mention', async ({ event, say }) => {
  try {
    console.log('📨 Received mention:', event.text);
    console.log('👤 From user:', event.user);
    console.log('📍 Channel:', event.channel);
    
    // Remove bot mention from message
    const cleanText = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    const parsed = parseMessage(cleanText);
    console.log('🔍 Parsed mention as:', parsed.type, parsed.command || parsed.message);
    
    if (parsed.type === 'trading') {
      console.log('💼 Executing trading command from mention:', parsed.command);
      const result = await executeCommand(parsed.command);
      console.log('📊 TRADING RESPONSE (MENTION):');
      console.log('─'.repeat(50));
      console.log(result.substring(0, 500) + (result.length > 500 ? '...' : ''));
      console.log('─'.repeat(50));
      await say({
        text: `\`\`\`\n${result}\n\`\`\``,
        channel: event.channel,
        thread_ts: event.ts
      });
      console.log('📤 Sent trading response to Slack (mention)');
    } else {
      console.log('🤖 Sending mention to Claude:', parsed.message);
      const response = await claudeChat(parsed.message, event.user);
      console.log('🧠 CLAUDE RESPONSE (MENTION):');
      console.log('─'.repeat(50));
      console.log(response.substring(0, 300) + (response.length > 300 ? '...' : ''));
      console.log('─'.repeat(50));
      await say({
        text: response,
        channel: event.channel,
        thread_ts: event.ts
      });
      console.log('📤 Sent Claude response to Slack (mention)');
    }
  } catch (error) {
    console.error('❌ Error handling mention:', error);
    await say(`Error: ${error.message}`);
  }
});

// Start the app
(async () => {
  try {
    console.log('🔄 Starting Slack app...');
    await app.start();
    console.log('⚡️ Slack bot is running!');
    
    // Test connection by getting bot info
    try {
      const authResult = await app.client.auth.test({
        token: process.env.SLACK_BOT_TOKEN
      });
      console.log('✅ Bot connected as:', authResult.user);
      console.log('🏢 Team:', authResult.team);
      console.log('🆔 Bot ID:', authResult.user_id);
      
      // Try to get bot presence
      const presenceResult = await app.client.users.getPresence({
        token: process.env.SLACK_BOT_TOKEN,
        user: authResult.user_id
      });
      console.log('👁️ Bot presence:', presenceResult.presence);
      
    } catch (authError) {
      console.error('❌ Auth test failed:', authError.message);
    }
    
    // Start scheduler for automated alerts
    startScheduler(app);
    
    console.log('📅 Scheduler started:');
    console.log('   - SDP Today: 9:40 AM EST');
    console.log('   - SDP Tomorrow: 3:50 PM EST');
    
    // Keep alive check every 30 seconds
    setInterval(async () => {
      try {
        await app.client.auth.test({ token: process.env.SLACK_BOT_TOKEN });
        console.log('💓 Bot heartbeat OK');
      } catch (error) {
        console.log('💔 Bot heartbeat failed:', error.message);
      }
    }, 30000);
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
})();