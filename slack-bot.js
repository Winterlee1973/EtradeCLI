#!/usr/bin/env node
import pkg from '@slack/bolt';
const { App } = pkg;
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import { claude } from './claude-integration.js';
import { startScheduler } from './scheduler.js';
import { formatForSlack, formatQuoteForSlack } from './slack-formatter.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

const execAsync = promisify(exec);

// Auto-detect SPX program files
function getAvailablePrograms() {
  try {
    const files = fs.readdirSync('.');
    const programFiles = files.filter(file => 
      file.startsWith('SPX-DeepPremium-program-') && file.endsWith('.js')
    );
    
    return programFiles.map(file => {
      // Extract program name from filename: SPX-DeepPremium-program-0DTE1.js -> 0DTE1
      const programName = file.replace('SPX-DeepPremium-program-', '').replace('.js', '');
      return {
        name: programName,
        filename: file,
        command: `spx ${programName.toLowerCase()}`,
        actionId: `program_${programName.toLowerCase()}`
      };
    });
  } catch (error) {
    console.error('Error detecting program files:', error);
    return [];
  }
}

// Auto-detect available strategies
function getAvailableStrategies() {
  const strategies = [];
  
  // Always include the main SPX Deep Premium strategy
  strategies.push({
    name: 'SPX Deep Premium',
    displayName: 'SPX Deep Premium 🔔',
    actionId: 'show_spx_strategy',
    file: 'spx-deeppremium.js'
  });
  
  // Add any other strategy files found
  try {
    const files = fs.readdirSync('.');
    
    // Look for other strategy files (customize pattern as needed)
    const strategyFiles = files.filter(file => 
      file.endsWith('-strategy.js') || 
      (file.endsWith('.js') && file.includes('strategy') && !file.includes('framework'))
    );
    
    strategyFiles.forEach(file => {
      const strategyName = file.replace(/-strategy\.js|\.js/, '').replace(/-/g, ' ');
      const capitalizedName = strategyName.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      strategies.push({
        name: capitalizedName,
        displayName: capitalizedName,
        actionId: `show_${file.replace('.js', '').replace(/-/g, '_')}`,
        file: file
      });
    });
  } catch (error) {
    console.error('Error detecting strategy files:', error);
  }
  
  return strategies;
}

// Generate program buttons dynamically
function generateProgramButtons() {
  const programs = getAvailablePrograms();
  
  if (programs.length === 0) {
    return [];
  }
  
  // Group programs into rows of 2 buttons each
  const buttonRows = [];
  for (let i = 0; i < programs.length; i += 2) {
    const rowPrograms = programs.slice(i, i + 2);
    const elements = rowPrograms.map(program => ({
      type: 'button',
      text: { type: 'plain_text', text: program.command.toUpperCase() },
      action_id: program.actionId,
      style: 'primary'
    }));
    
    buttonRows.push({
      type: 'actions',
      elements: elements
    });
  }
  
  return buttonRows;
}

// Generate strategy buttons dynamically
function generateStrategyButtons() {
  const strategies = getAvailableStrategies();
  
  if (strategies.length === 0) {
    return [];
  }
  
  // Group strategies into rows of 2 buttons each
  const buttonRows = [];
  for (let i = 0; i < strategies.length; i += 2) {
    const rowStrategies = strategies.slice(i, i + 2);
    const elements = rowStrategies.map(strategy => ({
      type: 'button',
      text: { type: 'plain_text', text: strategy.displayName },
      action_id: strategy.actionId,
      style: 'primary'
    }));
    
    buttonRows.push({
      type: 'actions',
      elements: elements
    });
  }
  
  // Add powered by text
  buttonRows.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `     _Powered by: ${strategies.map(s => '`' + s.file + '`').join(', ')}_`
    }
  });
  
  return buttonRows;
}

// Convert AI response to Slack blocks
function formatAIResponseForSlack(response) {
  if (typeof response !== 'string') {
    return { text: 'AI response received' };
  }
  
  // Convert \n to actual newlines and clean up formatting
  const cleanResponse = response
    .replace(/\\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '*$1*') // Convert **bold** to *bold*
    .trim();
  
  // If it's a simple response, just return as a single section
  if (!cleanResponse.includes('\n\n') && cleanResponse.length < 500) {
    return {
      text: 'AI Response',
      blocks: [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: cleanResponse
        }
      }]
    };
  }
  
  // Split into sections based on double newlines
  const sections = cleanResponse.split('\n\n').filter(section => section.trim());
  
  const blocks = [];
  
  for (const section of sections) {
    if (section.includes('OPPORTUNITY FOUND') || section.includes('NO QUALIFYING OPPORTUNITIES')) {
      // Header section - extract the key part
      const headerText = section.includes('OPPORTUNITY FOUND') ? 'OPPORTUNITY FOUND' : 'NO QUALIFYING OPPORTUNITIES';
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: headerText
        }
      });
      
      // Content section
      const content = section.split('\n').slice(1).join('\n').trim();
      if (content) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: content
          }
        });
      }
    } else {
      // Regular section - make sure it's not too long
      const sectionText = section.length > 2000 ? section.substring(0, 1900) + '...' : section;
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: sectionText
        }
      });
    }
  }
  
  // Add action buttons if it's an opportunity
  if (cleanResponse.includes('OPPORTUNITY FOUND')) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '🔄 Refresh Scan' },
          action_id: 'refresh_scan',
          style: 'primary'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '📋 View Orders' },
          action_id: 'view_orders'
        }
      ]
    });
  }
  
  return {
    text: 'AI Trading Analysis',
    blocks: blocks
  };
}

// Global state for refresh functionality
let lastSpxCommand = 'node spx-deeppremium.js td1 minbid2 distance300'; // Default fallback

// Help message with available strategies
function getV2HelpMessage() {
  return {
    text: "Lee's AI Trading Bot - v2 Help Guide",
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🤖 *Lee\'s AI Trading Bot - v2*'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '📊 *Quote Commands*\n• `q TSLA` or `quote AAPL` - Get current price\n• "what\'s SPX at?" - Natural language quotes'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '🎯 *Available Strategies*'
        }
      },
      ...generateStrategyButtons(),
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '📋 *Other Commands*'
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '📋 View Orders' },
            action_id: 'view_orders'
          }
        ]
      }
    ]
  };
}

// SPX Strategy page with risk filters
function getSPXStrategyMessage() {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '🎯 *SPX DEEP PREMIUM HELP*'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '🔍 *SQL Example*'
      }
    },
    {
      type: 'section',
      text: {
        type: 'plain_text',
        text: 'spx WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_Standard 1DTE with $2+ premium, 300+ points out_'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '🤖 *Programs*'
      }
    }
  ];

  // Add program buttons
  const programButtons = generateProgramButtons();
  console.log('🔍 DEBUG: Generated program buttons:', JSON.stringify(programButtons, null, 2));
  blocks.push(...programButtons);

  // Add navigation buttons
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '← Back to Help' },
        action_id: 'back_to_help'
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: '📋 View Orders' },
        action_id: 'view_orders'
      }
    ]
  });

  return {
    text: "SPX Deep Premium Strategy - SQL Examples",
    blocks: blocks
  };
}

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
  spx_strategy: /^spx\s+(td[01])\s+(minbid[\d.]+)\s+(distance\d+)$/i,
  orders: /^orders?$/i,
  orders_open: /^orders?\s+open$/i,
  orders_closed: /^orders?\s+closed$/i,
  help: /^help$/i
};

// Execute trading commands
async function executeCommand(command) {
  try {
    console.log('🔍 DEBUG: Executing command:', command);
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
  const lowerText = cleanText.toLowerCase();
  
  // Handle help command
  if (lowerText === 'help') {
    return { type: 'help', message: 'v2' };
  }
  
  // Handle help spx command
  if (lowerText === 'help spx') {
    return { type: 'spx_strategy' };
  }
  
  // Handle SPX strategy command
  if (lowerText === 'spx') {
    return { type: 'spx_strategy' };
  }
  
  // Check for SPX programs dynamically
  const programs = getAvailablePrograms();
  for (const program of programs) {
    if (lowerText === program.command) {
      return {
        type: 'trading',
        command: `node ${program.filename}`
      };
    }
  }
  
  // Check for direct SQL SPX commands (highest priority)
  if (lowerText.startsWith('spx where') || lowerText.match(/^spx\s+td[01]\s+minbid[\d.]+\s+distance\d+$/i)) {
    return {
      type: 'trading',
      command: `node Spx-DeepPremium.js '${cleanText.replace(/^spx\s+/i, '')}'`
    };
  }
  
  // Check for quote commands
  if (TRADING_COMMANDS.quote.test(cleanText)) {
    const match = cleanText.match(TRADING_COMMANDS.quote);
    return {
      type: 'trading',
      command: `node run.js q ${match[2].toUpperCase()}`
    };
  }
  
  // Check for order commands
  if (TRADING_COMMANDS.orders_open.test(cleanText)) {
    return { type: 'orders', filter: 'open' };
  }
  
  if (TRADING_COMMANDS.orders_closed.test(cleanText)) {
    return { type: 'orders', filter: 'closed' };
  }
  
  if (TRADING_COMMANDS.orders.test(cleanText)) {
    return { type: 'orders', filter: 'all' };
  }
  
  // Everything else goes to AI conversation
  return { type: 'claude', message: cleanText };
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
      
      // Save SPX commands for refresh functionality
      if (parsed.command.includes('spx-deeppremium.js')) {
        lastSpxCommand = parsed.command;
        console.log('💾 Saved SPX command for refresh:', lastSpxCommand);
      }
      
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
    } else if (parsed.type === 'help') {
      console.log('📖 Sending v2 help message');
      const helpMessage = getV2HelpMessage();
      await say(helpMessage);
      console.log('📤 Sent v2 help message to Slack');
    } else if (parsed.type === 'spx_strategy') {
      console.log('📋 Sending SPX strategy page');
      const spxMessage = getSPXStrategyMessage();
      await say(spxMessage);
      console.log('📤 Sent SPX strategy page to Slack');
    } else {
      console.log('🤖 Sending to Claude:', parsed.message);
      const response = await claude.handleCommand(parsed.message);
      console.log('🧠 CLAUDE RESPONSE:');
      console.log('─'.repeat(50));
      
      // Handle both string and object responses
      if (typeof response === 'string') {
        console.log(response.substring(0, 300) + (response.length > 300 ? '...' : ''));
        console.log('─'.repeat(50));
        
        // Format AI response for Slack
        const formattedResponse = formatAIResponseForSlack(response);
        await say(formattedResponse);
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

// Handle strategy button clicks - generic handler for all strategy actions
app.action(/^strategy_/, async ({ ack, say, body }) => {
  await ack();
  
  try {
    const sqlWhere = body.actions[0].value;
    console.log('🚀 Running strategy:', sqlWhere);
    
    // Execute the SPX command with proper quoting
    const cmd = `node spx-deeppremium.js '${sqlWhere}'`;
    const result = await executeCommand(cmd);
    
    // Save command for refresh functionality
    lastSpxCommand = cmd;
    
    // Format and send result
    const formattedResult = formatForSlack(result);
    
    if (formattedResult && formattedResult.blocks) {
      await say({
        text: `Strategy executed: ${sqlWhere}`,
        blocks: formattedResult.blocks
      });
    } else {
      await say({
        text: formattedResult || result
      });
    }
    
    console.log('📤 Sent strategy result to Slack');
  } catch (error) {
    await say({
      text: `❌ Error running strategy: ${error.message}`
    });
  }
});

// Handle SPX strategy button click
app.action('show_spx_strategy', async ({ ack, say }) => {
  await ack();
  
  try {
    console.log('📋 Showing SPX strategy page');
    const spxMessage = getSPXStrategyMessage();
    await say(spxMessage);
    console.log('📤 Sent SPX strategy page to Slack');
  } catch (error) {
    await say({
      text: `❌ Error showing SPX strategy: ${error.message}`
    });
  }
});

// Handle back to help button click
app.action('back_to_help', async ({ ack, say }) => {
  await ack();
  
  try {
    console.log('📖 Going back to help page');
    const helpMessage = getV2HelpMessage();
    await say(helpMessage);
    console.log('📤 Sent help page to Slack');
  } catch (error) {
    await say({
      text: `❌ Error showing help: ${error.message}`
    });
  }
});

// Handle view orders button click
app.action('view_orders', async ({ ack, say }) => {
  await ack();
  
  try {
    const result = await executeCommand('node order-status.js');
    await say({
      text: result
    });
    console.log('📤 Sent order status to Slack');
  } catch (error) {
    await say({
      text: `❌ Error getting orders: ${error.message}`
    });
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
    console.log('🔄 Refreshing with saved command:', lastSpxCommand);
    const result = await executeCommand(lastSpxCommand);
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

// Handle Program buttons dynamically
app.action(/^program_/, async ({ ack, say, action }) => {
  await ack();
  
  try {
    // Extract program name from action_id: program_0dte1 -> 0dte1
    const programKey = action.action_id.replace('program_', '');
    const programs = getAvailablePrograms();
    const program = programs.find(p => p.actionId === action.action_id);
    
    if (!program) {
      await say(`❌ Program not found: ${programKey}`);
      return;
    }
    
    console.log(`🤖 Running ${program.name} program...`);
    const result = await executeCommand(`node ${program.filename}`);
    const formattedResult = formatForSlack(result);
    
    if (formattedResult && formattedResult.blocks) {
      await say({
        text: `🤖 ${program.name} Program Results`,
        blocks: formattedResult.blocks
      });
    } else {
      await say({
        text: formattedResult
      });
    }
  } catch (error) {
    await say(`❌ Error running program: ${error.message}`);
  }
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
      
      // Save SPX commands for refresh functionality
      if (parsed.command.includes('spx-deeppremium.js')) {
        lastSpxCommand = parsed.command;
        console.log('💾 Saved SPX command for refresh (mention):', lastSpxCommand);
      }
      
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
    } else if (parsed.type === 'help') {
      console.log('📖 Sending v2 help message (mention)');
      const helpMessage = getV2HelpMessage();
      await say({
        ...helpMessage,
        channel: event.channel
      });
      console.log('📤 Sent v2 help message to Slack (mention)');
    } else if (parsed.type === 'spx_strategy') {
      console.log('📋 Sending SPX strategy page (mention)');
      const spxMessage = getSPXStrategyMessage();
      await say({
        ...spxMessage,
        channel: event.channel
      });
      console.log('📤 Sent SPX strategy page to Slack (mention)');
    } else {
      console.log('🤖 Sending mention to Claude:', parsed.message);
      const response = await claude.handleCommand(parsed.message);
      console.log('🧠 CLAUDE RESPONSE (MENTION):');
      console.log('─'.repeat(50));
      console.log(response.substring(0, 300) + (response.length > 300 ? '...' : ''));
      console.log('─'.repeat(50));
      
      // Format AI response for Slack
      const formattedResponse = formatAIResponseForSlack(response);
      await say({
        ...formattedResponse,
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
    
    // Send v2 help message on server startup
    try {
      let USER_ID = process.env.SLACK_USER_ID;
      
      if (!USER_ID) {
        // Find Lee's user ID
        const usersList = await app.client.users.list({
          token: process.env.SLACK_BOT_TOKEN
        });
        const leeUser = usersList.members.find(user => 
          user.real_name?.toLowerCase().includes('lee') || user.name?.toLowerCase().includes('lee')
        );
        USER_ID = leeUser ? leeUser.id : 'D092322FRQA';
        console.log(`🔍 Found user for startup message: ${leeUser?.real_name || 'Unknown'} (${USER_ID})`);
      }
      
      const helpMessage = getV2HelpMessage();
      await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: USER_ID,
        ...helpMessage
      });
      console.log('📖 Sent v2 help message on startup');
    } catch (startupError) {
      console.error('❌ Could not send startup message:', startupError.message);
    }
    
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