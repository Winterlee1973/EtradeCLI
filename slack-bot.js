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
      console.log('✅ Command result length:', result.length);
      await say({
        text: `\`\`\`\n${result}\n\`\`\``,
        thread_ts: message.ts
      });
      console.log('📤 Sent trading response');
    } else {
      console.log('🤖 Sending to Claude:', parsed.message);
      const response = await claudeChat(parsed.message, message.user);
      console.log('🎯 Claude response length:', response.length);
      await say({
        text: response,
        thread_ts: message.ts
      });
      console.log('📤 Sent Claude response');
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    await say(`Error: ${error.message}`);
  }
});

// Handle app mentions
app.event('app_mention', async ({ event, say }) => {
  try {
    // Remove bot mention from message
    const cleanText = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    const parsed = parseMessage(cleanText);
    
    if (parsed.type === 'trading') {
      const result = await executeCommand(parsed.command);
      await say({
        text: `\`\`\`\n${result}\n\`\`\``,
        channel: event.channel,
        thread_ts: event.ts
      });
    } else {
      const response = await claudeChat(parsed.message, event.user);
      await say({
        text: response,
        channel: event.channel,
        thread_ts: event.ts
      });
    }
  } catch (error) {
    console.error('Error handling mention:', error);
    await say(`Error: ${error.message}`);
  }
});

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Slack bot is running!');
    
    // Start scheduler for automated alerts
    startScheduler(app);
    
    console.log('📅 Scheduler started:');
    console.log('   - SDP Today: 9:40 AM EST');
    console.log('   - SDP Tomorrow: 3:50 PM EST');
    
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
})();