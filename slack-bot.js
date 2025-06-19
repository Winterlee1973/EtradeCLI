#!/usr/bin/env node
import pkg from '@slack/bolt';
const { App } = pkg;
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import { claude } from './claude-integration.js';
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
  deep_premium: /^(deep|spx)\s+([01])$/i,
  deep_premium_target: /^spx\s+([01])\s+(\d*\.?\d+)$/i,
  deep_premium_custom: /^spx\s+(\d+)\s+points?\s+(\d+\.?\d*)\s+premium$/i,
  orders: /^orders?$/i,
  orders_open: /^orders?\s+open$/i,
  orders_closed: /^orders?\s+closed$/i
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
        command: `node spx-deeppremium.js ${match[2]} --target-bid ${match[3]}`
      };
    }
    
    // Custom deep premium
    if (TRADING_COMMANDS.deep_premium_custom.test(remainingText)) {
      const match = remainingText.match(TRADING_COMMANDS.deep_premium_custom);
      return {
        type: 'trading',
        command: `node spx-deeppremium.js --min-distance ${match[2]} --min-premium ${match[3]}`
      };
    }
    
    // Orders commands
    if (TRADING_COMMANDS.orders_open.test(remainingText)) {
      return {
        type: 'orders',
        filter: 'open'
      };
    }
    
    if (TRADING_COMMANDS.orders_closed.test(remainingText)) {
      return {
        type: 'orders',
        filter: 'closed'
      };
    }
    
    if (TRADING_COMMANDS.orders.test(remainingText)) {
      return {
        type: 'orders',
        filter: 'all'
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
    } else if (parsed.type === 'orders') {
      await handleOrdersRequest(say, parsed);
    } else {
      console.log('🤖 Sending to Claude:', parsed.message);
      const response = await claude.handleCommand(parsed.message);
      console.log('🧠 CLAUDE RESPONSE:');
      console.log('─'.repeat(50));
      
      // Handle both string and object responses
      if (typeof response === 'string') {
        console.log(response.substring(0, 300) + (response.length > 300 ? '...' : ''));
        console.log('─'.repeat(50));
        await say({
          text: response
        });
      } else if (response && typeof response === 'object') {
        console.log(JSON.stringify(response).substring(0, 300) + '...');
        console.log('─'.repeat(50));
        await say(response);
      }
      
      console.log('📤 Sent Claude response to Slack');
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    await say(`Error: ${error.message}`);
  }
});

// Handle button clicks
app.action('execute_trade', async ({ ack, say, body }) => {
  await ack();
  
  try {
    // Extract trade details from the message blocks
    let tradeDetails = null;
    for (const block of body.message.blocks) {
      if (block.text && block.text.text && block.text.text.includes('SELL 1x')) {
        const text = block.text.text;
        const match = text.match(/SELL 1x (\d+)P.*Premium: \$(\d+\.?\d*).*Credit: \$(\d+)/);
        if (match) {
          tradeDetails = {
            strike: match[1],
            premium: match[2],
            credit: match[3],
            timestamp: new Date().toISOString(),
            user: body.user.id,
            status: 'EXECUTED'
          };
          break;
        }
      }
    }
    
    if (tradeDetails) {
      // Write to orders file
      const fs = await import('fs/promises');
      const ordersFile = 'orders.json';
      
      let orders = [];
      try {
        const data = await fs.readFile(ordersFile, 'utf8');
        orders = JSON.parse(data);
      } catch (err) {
        // File doesn't exist yet
      }
      
      orders.push(tradeDetails);
      await fs.writeFile(ordersFile, JSON.stringify(orders, null, 2));
      
      await say({
        text: `✅ *Order Executed*\nStrike: ${tradeDetails.strike}P\nPremium: $${tradeDetails.premium}\nCredit: $${tradeDetails.credit}\n\nOrder saved to orders.json`
      });
    } else {
      await say({
        text: `❌ Could not extract trade details from message`
      });
    }
  } catch (error) {
    await say({
      text: `❌ Error executing trade: ${error.message}`
    });
  }
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

// Helper function for orders requests
async function handleOrdersRequest(say, parsed) {
  console.log(`📋 Fetching orders list with filter: ${parsed.filter}`);
  try {
    const result = await executeCommand(`node run.js orders ${parsed.filter}`);
    
    // Format the result for Slack
    const lines = result.split('\n').filter(line => line.trim());
    
    // Strip ANSI codes and check for no orders
    const cleanResult = result.replace(/\x1b\[[0-9;]*m/g, '');
    if (cleanResult.includes('No orders found') || cleanResult.includes('No open orders found') || cleanResult.includes('No closed orders found')) {
      await say({
        text: '📋 No orders found',
        blocks: [{
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '📋 All Orders' },
              action_id: 'orders_all',
              style: 'primary'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '🟡 Open Orders' },
              action_id: 'orders_open'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '🟢 Closed Orders' },
              action_id: 'orders_closed'
            }
          ]
        }]
      });
    } else {
      // Parse orders data directly from the orders.json file for better formatting
      let orderText = '';
      let summaryText = '';
      
      try {
        const fs = await import('fs/promises');
        const ordersData = await fs.readFile('orders.json', 'utf8');
        const orders = JSON.parse(ordersData);
        
        // Apply filter
        let filteredOrders = orders;
        if (parsed.filter === 'open') {
          filteredOrders = orders.filter(order => order.status === 'PENDING' || order.status === 'OPEN');
        } else if (parsed.filter === 'closed') {
          filteredOrders = orders.filter(order => order.status === 'FILLED' || order.status === 'CANCELLED');
        }
        
        // Group orders by status
        const openOrders = filteredOrders.filter(o => o.status === 'PENDING' || o.status === 'OPEN');
        const filledOrders = filteredOrders.filter(o => o.status === 'FILLED');
        const cancelledOrders = filteredOrders.filter(o => o.status === 'CANCELLED');
        
        orderText = '';
        
        // Open Orders Section
        if (openOrders.length > 0 && (parsed.filter === 'all' || parsed.filter === 'open')) {
          orderText += `🟡 *OPEN ORDERS (${openOrders.length})*\n`;
          openOrders.forEach((order) => {
            const date = new Date(order.timestamp).toLocaleDateString('en-US', {
              month: '2-digit', day: '2-digit', year: '2-digit'
            });
            const time = new Date(order.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit', hour12: true
            });
            
            orderText += `• *${order.symbol}* ${order.strike}P - ${order.quantity}x @ $${order.price}\n`;
            orderText += `  ${order.status} • ${date} ${time} • Exp: ${order.expDate}\n`;
          });
          orderText += '\n';
        }
        
        // Filled Orders Section  
        if (filledOrders.length > 0 && (parsed.filter === 'all' || parsed.filter === 'closed')) {
          orderText += `🟢 *FILLED ORDERS (${filledOrders.length})*\n`;
          filledOrders.forEach((order) => {
            const date = new Date(order.timestamp).toLocaleDateString('en-US', {
              month: '2-digit', day: '2-digit', year: '2-digit'
            });
            const time = new Date(order.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit', hour12: true
            });
            
            orderText += `• *${order.symbol}* ${order.strike}P - ${order.quantity}x @ $${order.price}\n`;
            orderText += `  FILLED • ${date} ${time} • Exp: ${order.expDate}\n`;
          });
          orderText += '\n';
        }
        
        // Cancelled Orders Section
        if (cancelledOrders.length > 0 && (parsed.filter === 'all' || parsed.filter === 'closed')) {
          orderText += `🔴 *CANCELLED ORDERS (${cancelledOrders.length})*\n`;
          cancelledOrders.forEach((order) => {
            const date = new Date(order.timestamp).toLocaleDateString('en-US', {
              month: '2-digit', day: '2-digit', year: '2-digit'
            });
            const time = new Date(order.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit', hour12: true
            });
            
            orderText += `• *${order.symbol}* ${order.strike}P - ${order.quantity}x @ $${order.price}\n`;
            orderText += `  CANCELLED • ${date} ${time} • Exp: ${order.expDate}\n`;
          });
        }
        
        // Calculate summary stats
        const openCount = orders.filter(o => o.status === 'PENDING' || o.status === 'OPEN').length;
        const filledCount = orders.filter(o => o.status === 'FILLED').length;
        const cancelledCount = orders.filter(o => o.status === 'CANCELLED').length;
        summaryText = `Open: ${openCount} • Filled: ${filledCount} • Cancelled: ${cancelledCount} • Total: ${orders.length}`;
      } catch (fileError) {
        // Fallback to parsing command output
        const cleanResult = result.replace(/\x1b\[[0-9;]*m/g, '');
        orderText = '```\n' + cleanResult + '\n```';
        const cleanLines = lines.map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
        const summaryLine = cleanLines.find(line => line.includes('Open:') && line.includes('Filled:'));
        summaryText = summaryLine || '';
      }
      
      await say({
        text: `📋 *Order Status* ${summaryText ? '- ' + summaryText : ''}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: orderText
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '📋 All Orders' },
                action_id: 'orders_all',
                style: parsed.filter === 'all' ? 'primary' : undefined
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: '🟡 Open Orders' },
                action_id: 'orders_open',
                style: parsed.filter === 'open' ? 'primary' : undefined
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: '🟢 Closed Orders' },
                action_id: 'orders_closed',
                style: parsed.filter === 'closed' ? 'primary' : undefined
              }
            ]
          }
        ]
      });
    }
  } catch (error) {
    await say(`❌ Error reading orders: ${error.message}`);
  }
}

// Handle Orders button
app.action('orders_button', async ({ ack, say }) => {
  await ack();
  await handleOrdersRequest(say, { filter: 'all' });
});

// Handle order filter buttons
app.action('orders_all', async ({ ack, say }) => {
  await ack();
  await handleOrdersRequest(say, { filter: 'all' });
});

app.action('orders_open', async ({ ack, say }) => {
  await ack();
  await handleOrdersRequest(say, { filter: 'open' });
});

app.action('orders_closed', async ({ ack, say }) => {
  await ack();
  await handleOrdersRequest(say, { filter: 'closed' });
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
      const response = await claude(parsed.message, event.user);
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
    await startScheduler(app);
    
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