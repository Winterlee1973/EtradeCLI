#!/usr/bin/env node
import pkg from '@slack/bolt';
const { App } = pkg;
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import { claudeChat } from './claude-integration.js';
import { startScheduler } from './scheduler.js';
import { formatForSlack, formatQuoteForSlack } from './slack-formatter.js';

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
  deep_premium: /^(sdp|deep)\s+([01])$/i,
  deep_premium_target: /^sdp\s+([01])\s+(\d*\.?\d+)$/i,
  deep_premium_custom: /^sdp\s+(\d+)\s+points?\s+(\d+\.?\d*)\s+premium$/i
};

// Execute trading commands
async function executeCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command, { 
      cwd: process.cwd(),
      timeout: 30000 
    });
    
    // Filter out Yahoo Finance cookie/crumb fetching messages
    const output = stdout || stderr;
    const lines = output.split('\n');
    const filteredLines = lines.filter(line => {
      const lowerLine = line.toLowerCase();
      return !lowerLine.includes('fetching crumb') && 
             !lowerLine.includes('fetching cookies') &&
             !lowerLine.includes('cookie') &&
             !lowerLine.includes('crumb') &&
             !line.startsWith('Done fetching');
    });
    
    return filteredLines.join('\n');
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

// Parse trading commands
function parseMessage(text) {
  if (!text || typeof text !== 'string') {
    return { type: 'claude', message: '' };
  }
  const cleanText = text.trim();
  
  // Extract potential trading commands from anywhere in the message
  const words = cleanText.split(/\s+/);
  
  // Look for trading commands anywhere in the message
  for (let i = 0; i < words.length; i++) {
    const remainingText = words.slice(i).join(' ');
    console.log(`🔍 Checking from position ${i}: "${remainingText}"`);
    
    // Quote command
    if (TRADING_COMMANDS.quote.test(remainingText)) {
      const match = remainingText.match(TRADING_COMMANDS.quote);
      return {
        type: 'trading',
        command: `node run.js q ${match[2].toUpperCase()}`
      };
    }
    
    // Deep premium commands
    if (TRADING_COMMANDS.deep_premium.test(remainingText)) {
      console.log('✅ Matched deep_premium pattern for:', remainingText);
      const match = remainingText.match(TRADING_COMMANDS.deep_premium);
      return {
        type: 'trading',
        command: `node spx-deeppremium.js ${match[2]}`
      };
    }
    
    // Deep premium target bid
    if (TRADING_COMMANDS.deep_premium_target.test(remainingText)) {
      const match = remainingText.match(TRADING_COMMANDS.deep_premium_target);
      return {
        type: 'trading',
        command: `node spx-deeppremium.js ${match[1]} --target-bid ${match[2]}`
      };
    }
    
    // Custom deep premium
    if (TRADING_COMMANDS.deep_premium_custom.test(remainingText)) {
      const match = remainingText.match(TRADING_COMMANDS.deep_premium_custom);
      return {
        type: 'trading',
        command: `node spx-deeppremium.js --min-distance ${match[1]} --min-premium ${match[2]}`
      };
    }
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
      
      // Format based on command type
      let formattedResult;
      if (parsed.command.includes(' q ') || parsed.command.includes('quote')) {
        formattedResult = formatQuoteForSlack(result);
        await say({
          text: formattedResult
        });
      } else {
        formattedResult = formatForSlack(result);
        
        // Check if we got rich blocks or plain text
        if (formattedResult && formattedResult.blocks) {
          await say({
            text: 'SPX Deep Premium Scan Results',
            blocks: formattedResult.blocks
          });
        } else {
          await say({
            text: formattedResult
          });
        }
      }
      console.log('📤 Sent trading response to Slack');
    } else {
      console.log('🤖 Sending to Claude:', parsed.message);
      const response = await claudeChat(parsed.message, message.user);
      console.log('🧠 CLAUDE RESPONSE:');
      console.log('─'.repeat(50));
      console.log(response.substring(0, 300) + (response.length > 300 ? '...' : ''));
      console.log('─'.repeat(50));
      await say({
        text: response
      });
      console.log('📤 Sent Claude response to Slack');
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    await say(`Error: ${error.message}`);
  }
});

// Handle button clicks
app.action('execute_trade', async ({ ack, say }) => {
  await ack();
  
  await say({
    text: `⚡ *Trade Execution*\nThis would connect to your brokerage API to execute the trade.`
  });
});

app.action('refresh_scan', async ({ ack, say }) => {
  await ack();
  
  try {
    const result = await executeCommand('node spx-deeppremium.js 1');
    const formattedResult = formatForSlack(result);
    
    if (formattedResult && formattedResult.blocks) {
      await say({
        text: 'Refreshed SPX Scan Results',
        blocks: formattedResult.blocks
      });
    } else {
      await say({
        text: formattedResult
      });
    }
  } catch (error) {
    await say(`Error refreshing scan: ${error.message}`);
  }
});

// Handle Trade Anyway button
app.action('trade_anyway', async ({ ack, say }) => {
  await ack();
  
  await say({
    text: `⚠️ *Trade Anyway Selected*\nPlease review the option chain above and manually select a strike that meets your risk tolerance.\n\n*Warning:* Trading below recommended criteria increases risk.`
  });
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
      
      // Format based on command type
      let formattedResult;
      if (parsed.command.includes(' q ') || parsed.command.includes('quote')) {
        formattedResult = formatQuoteForSlack(result);
        await say({
          text: formattedResult,
          channel: event.channel
        });
      } else {
        formattedResult = formatForSlack(result);
        
        // Check if we got rich blocks or plain text
        if (formattedResult && formattedResult.blocks) {
          await say({
            text: 'SPX Deep Premium Scan Results',
            blocks: formattedResult.blocks,
            channel: event.channel
          });
        } else {
          await say({
            text: formattedResult,
            channel: event.channel
          });
        }
      }
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
        channel: event.channel
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
    
    // Keep alive check every 15 minutes
    setInterval(async () => {
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      try {
        await app.client.auth.test({ token: process.env.SLACK_BOT_TOKEN });
        console.log(`💓 Bot heartbeat OK - ${timestamp}`);
      } catch (error) {
        console.log(`💔 Bot heartbeat failed - ${timestamp}:`, error.message);
      }
    }, 900000); // 15 minutes = 900000ms
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
})();