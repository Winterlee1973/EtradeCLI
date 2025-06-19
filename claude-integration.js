#!/usr/bin/env node

/**
 * Claude Integration for EtradeCLI
 * Provides conversational interface and script execution for Claude Code terminal sessions
 */

import { registry, createRunner, parseStrategyCommand } from './strategy-framework.js';
import { SharedTemplates } from './shared-templates.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// TODO: Register strategies when they're migrated to the new framework
// import './strategies/spx-deep-premium-strategy.js'; // Auto-registers
// import './strategies/quote-strategy.js'; // Auto-registers

export class ClaudeIntegration {
  constructor() {
    this.context = {
      lastCommand: null,
      lastResult: null,
      conversationMode: true
    };
  }
  
  // Main entry point for Claude conversations
  async handleCommand(input) {
    const command = input.trim().toLowerCase();
    
    // Handle common conversational patterns
    if (this.isQuoteRequest(command)) {
      return await this.handleQuoteRequest(command);
    }
    
    if (this.isSPXRequest(command)) {
      return await this.handleSPXRequest(command);
    }
    
    if (this.isStrategyCommand(command)) {
      return await this.handleStrategyCommand(command);
    }
    
    // Fallback to help
    return this.getHelp();
  }
  
  // Detect quote requests like "q tsla", "quote aapl", "what's spy at?"
  isQuoteRequest(command) {
    const quotePatterns = [
      /^q\s+[a-z]+$/i,
      /^quote\s+[a-z]+$/i,
      /what.*?(?:price|trading|at).*?([a-z]{1,5})/i,
      /.*?([a-z]{2,5})\s+(?:price|quote|trading)/i
    ];
    
    return quotePatterns.some(pattern => pattern.test(command));
  }
  
  // Detect SPX requests like "spx 1", "deep puts", "find opportunities"
  isSPXRequest(command) {
    const spxPatterns = [
      /^spx\s*\d*\s*[\d.]*$/i,
      /deep.*?puts?/i,
      /find.*?(?:opportunities|puts)/i,
      /scan.*?spx/i,
      /premium.*?scan/i
    ];
    
    return spxPatterns.some(pattern => pattern.test(command));
  }
  
  // Check if it's a direct strategy command
  isStrategyCommand(command) {
    const parts = command.split(/\s+/);
    const strategy = parts[0];
    return registry.get(strategy) !== undefined;
  }
  
  // Handle quote requests with natural language
  async handleQuoteRequest(command) {
    let symbol = null;
    
    // Extract symbol from various patterns
    const patterns = [
      /^q\s+([a-z]+)$/i,
      /^quote\s+([a-z]+)$/i,
      /what.*?(?:price|trading|at).*?([a-z]{1,5})/i,
      /([a-z]{2,5})\s+(?:price|quote|trading)/i
    ];
    
    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match) {
        symbol = match[1].toUpperCase();
        break;
      }
    }
    
    if (!symbol) {
      return "I couldn't identify the symbol. Try: 'q TSLA' or 'quote AAPL'";
    }
    
    try {
      // Use the runner to execute quote
      const { stdout } = await execAsync(`node run.js q ${symbol}`);
      this.context.lastCommand = `q ${symbol}`;
      this.context.lastResult = stdout;
      
      // Parse and format the response conversationally
      return this.formatQuoteResponse(stdout, symbol);
    } catch (error) {
      return `Error getting quote for ${symbol}: ${error.message}`;
    }
  }
  
  // Handle SPX deep premium requests
  async handleSPXRequest(command) {
    let dte = '1'; // default
    let premium = null;
    
    // Parse SPX command variants
    if (command.includes('0dte') || command.match(/spx\s*0/i)) {
      dte = '0';
    }
    
    // Check for custom premium like "spx 1 1.50"
    const premiumMatch = command.match(/spx\s*\d*\s*([\d.]+)/i);
    if (premiumMatch) {
      premium = premiumMatch[1];
    }
    
    try {
      const cmd = premium ? 
        `node spx-deeppremium.js ${dte} ${premium}` : 
        `node spx-deeppremium.js ${dte}`;
        
      const { stdout } = await execAsync(cmd);
      this.context.lastCommand = cmd;
      this.context.lastResult = stdout;
      
      // Format response based on results
      return this.formatSPXResponse(stdout, dte);
    } catch (error) {
      return `Error running SPX scan: ${error.message}`;
    }
  }
  
  // Handle direct strategy commands
  async handleStrategyCommand(command) {
    try {
      const parsed = parseStrategyCommand(command.split(/\s+/));
      const runner = createRunner(parsed.strategy, { outputFormat: 'terminal' });
      const result = await runner.execute(parsed.params);
      
      this.context.lastCommand = command;
      this.context.lastResult = result;
      
      return result;
    } catch (error) {
      return `Strategy error: ${error.message}`;
    }
  }
  
  // Format quote response conversationally
  formatQuoteResponse(stdout, symbol) {
    const lines = stdout.split('\n').filter(line => line.trim());
    if (lines.length < 3) return stdout;
    
    // Extract key info
    const company = lines[0].replace('📊 ', '');
    const priceMatch = lines[1].match(/💰 ([\d.]+)/);
    const changeMatch = lines[2].match(/(⬆️|⬇️) ([+-]?[\d.]+) \(([+-]?[\d.]+)%\)/);
    const timeMatch = lines[3] ? lines[3].replace('📅 ', '') : '';
    
    if (!priceMatch || !changeMatch) return stdout;
    
    const price = priceMatch[1];
    const direction = changeMatch[1] === '⬆️' ? 'up' : 'down';
    const change = changeMatch[2].replace(/[+-]/, '');
    const percent = changeMatch[3].replace(/[+-]/, '');
    
    return `${company} is trading at $${price}, ${direction} $${change} (+${percent}%) today${timeMatch ? ` at ${timeMatch}` : ''}.`;
  }
  
  // Format SPX response conversationally
  formatSPXResponse(stdout, dte) {
    const lines = stdout.split('\n');
    
    // Extract SPX price
    const spxLine = lines.find(line => line.includes('📈 SPX:'));
    const spxMatch = spxLine ? spxLine.match(/📈 SPX: ([\d.]+)/) : null;
    const spxPrice = spxMatch ? spxMatch[1] : 'unknown';
    
    // Check for opportunities
    const hasTarget = stdout.includes('🎯 SELL');
    const hasNo = stdout.includes('❌ NO');
    
    if (hasTarget) {
      // Extract trade details
      const sellMatch = stdout.match(/🎯 SELL 1x (\d+)P/);
      const premiumMatch = stdout.match(/💰 Premium: \$([\d.]+)/);
      const creditMatch = stdout.match(/📊 Credit: \$(\d+)/);
      const distanceMatch = stdout.match(/📏 Distance: (\d+) points/);
      
      if (sellMatch && premiumMatch && creditMatch) {
        const strike = sellMatch[1];
        const premium = premiumMatch[1];
        const credit = creditMatch[1];
        const distance = distanceMatch ? distanceMatch[1] : 'unknown';
        
        const dteText = dte === '0' ? '0DTE' : '1DTE';
        return `SPX is at $${spxPrice}. Scanning for ${dteText} opportunities:\n✅ FOUND: Qualifying opportunity\n💰 BEST: ${strike}P @ $${premium} (${distance} pts out)\n💵 CREDIT: $${credit} per contract`;
      }
    }
    
    if (hasNo) {
      const dteText = dte === '0' ? '0DTE' : '1DTE';
      return `SPX is at $${spxPrice}. Scanning for ${dteText} opportunities:\n❌ NO qualifying opportunities found at current premium thresholds.`;
    }
    
    // Fallback to original output
    return stdout;
  }
  
  // Get help information as Slack blocks
  getHelp() {
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: "🤖 Lee's AI Trading Bot - v1"
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*📊 Quote Commands:*\n• `q TSLA` or `quote AAPL` - Get current price\n• "what\'s SPX at?" - Natural language quotes'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*🎯 SPX Deep Premium:*\n• `spx 1` - 1DTE scan (next trading day)\n• `spx 0` - 0DTE scan (same day expiration)\n• `spx 1 1.50` - Custom premium target\n• "find deep puts" - Natural language scan'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*📋 Order Management:*\n• `order status` or `orders` - View all order statuses\n• Interactive buttons for trade execution'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*🛠️ Current Templates:*\n• *quote1* - Price display\n• *optionschain1* - Strike/Bid/Ask/Distance grid\n• *order1* - Execution summary with safety metrics\n• *orderstatus1* - Order tracking (filled, pending, cancelled)'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '💡 _Try: "q TSLA", "spx 1", or "find deep puts"_'
            }
          ]
        }
      ]
    };
  }
  
  // Get current context for debugging
  getContext() {
    return this.context;
  }
  
  // Reset conversation context
  reset() {
    this.context = {
      lastCommand: null,
      lastResult: null,
      conversationMode: true
    };
  }
}

// Singleton instance for Claude sessions
export const claude = new ClaudeIntegration();

// Command-line interface when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(claude.getHelp());
    process.exit(0);
  }
  
  const command = args.join(' ');
  
  claude.handleCommand(command)
    .then(result => {
      console.log(result);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}

// Export for use in other modules
export default claude;