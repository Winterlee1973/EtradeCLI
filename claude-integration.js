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
    
    // Handle conversational greetings
    if (this.isGreeting(command)) {
      return this.handleGreeting(command);
    }
    
    // Handle common conversational patterns
    if (this.isQuoteRequest(command)) {
      return await this.handleQuoteRequest(command);
    }
    
    // Check for strategy suggestion requests first (before SPX request)
    if (this.isStrategySuggestionRequest(command)) {
      return await this.handleStrategySuggestionRequest(command);
    }
    
    if (this.isSPXRequest(command)) {
      return await this.handleSPXRequest(command);
    }
    
    if (this.isStrategyCommand(command)) {
      return await this.handleStrategyCommand(command);
    }
    
    // Handle general conversation - be more conversational and helpful
    return this.handleGeneralConversation(command);
  }
  
  // Detect quote requests like "q tsla", "quote aapl", "what's spy at?"
  isQuoteRequest(command) {
    const quotePatterns = [
      /^q\s+[a-z]+$/i,
      /^quote\s+[a-z]+$/i,
      /what.*?(?:price|trading|at).*?\b([a-z]{2,5})\b/i,
      /\b([a-z]{2,5})\s+(?:price|quote|trading)/i
    ];
    
    // Don't match if it contains strategy-related words
    if (command.match(/strategies|strategy|suggest|recommend|aggressive|conservative/i)) {
      return false;
    }
    
    return quotePatterns.some(pattern => pattern.test(command));
  }
  
  // Detect SPX requests like "spx WHERE...", "deep puts", "find opportunities", "premium possibilities way out"
  isSPXRequest(command) {
    const spxPatterns = [
      /^spx\s*(?:WHERE|td\d)/i,  // Direct SPX commands (SQL or legacy)
      /deep.*?puts?/i,
      /find.*?(?:opportunities|puts|premium)/i,
      /scan.*?spx/i,
      /premium.*?(?:scan|possibilit|opportunit)/i,
      /way.*?out/i,  // "going way out", "far out"
      /conservative.*?(?:spx|put|premium)/i,
      /aggressive.*?(?:spx|put|premium)/i,
      /0dte|same.*?day/i,
      /volatility.*?(?:play|strategy)/i,
      /high.*?premium/i,
      /safe.*?(?:distance|premium)/i
    ];
    
    return spxPatterns.some(pattern => pattern.test(command));
  }
  
  // Check if it's a direct strategy command
  isStrategyCommand(command) {
    const parts = command.split(/\s+/);
    const strategy = parts[0];
    return registry.get(strategy) !== undefined;
  }
  
  // Detect conversational greetings
  isGreeting(command) {
    const greetingPatterns = [
      /^hi$/i,
      /^hello$/i,
      /^hey$/i,
      /^good\s+(morning|afternoon|evening)$/i,
      /^how.*?you$/i,
      /^what.*?up$/i
    ];
    
    return greetingPatterns.some(pattern => pattern.test(command));
  }
  
  // Handle conversational greetings
  handleGreeting(command) {
    const responses = [
      "Hi! I'm your AI trading assistant. I can help you with SPX strategies, quotes, and market analysis. Try asking me about 'aggressive SPX strategies' or 'conservative premium collection'.",
      "Hello! Ready to talk trading strategies? I can suggest SPX approaches, get quotes, or explain different risk levels. What are you thinking about?",
      "Hey there! I'm here to help with your trading analysis. Want to explore some SPX strategies or get market data?",
      "Good to chat! I can help you find SPX opportunities, explain different approaches, or get current quotes. What's on your mind?"
    ];
    
    // Pick a response based on the greeting
    const responseIndex = Math.floor(Math.random() * responses.length);
    return responses[responseIndex];
  }
  
  // Handle general conversation with proactive trading analysis
  async handleGeneralConversation(command) {
    const lowerCommand = command.toLowerCase();
    
    // SPX-related requests - execute scans and analyze
    if (lowerCommand.includes('spx')) {
      return await this.handleProactiveSPXAnalysis(command);
    }
    
    // Market condition requests - get data and suggest
    if (lowerCommand.includes('market') || lowerCommand.includes('today') || lowerCommand.includes('now')) {
      return await this.handleMarketAnalysis(command);
    }
    
    // Opportunity hunting - scan and recommend
    if (lowerCommand.includes('opportunit') || lowerCommand.includes('find') || lowerCommand.includes('look') || lowerCommand.includes('scan')) {
      return await this.handleOpportunityHunt(command);
    }
    
    // Risk-based requests - suggest appropriate strategies
    if (lowerCommand.includes('conservative') || lowerCommand.includes('safe') || lowerCommand.includes('careful')) {
      return await this.executeAndAnalyze('WHERE tradingdays=1 AND minbid>=2.50 AND distance>=350', 'conservative approach');
    }
    
    if (lowerCommand.includes('aggressive') || lowerCommand.includes('risky') || lowerCommand.includes('close')) {
      return await this.executeAndAnalyze('WHERE tradingdays=1 AND minbid>=1.00 AND distance>=200', 'aggressive strategy');
    }
    
    // Premium hunting
    if (lowerCommand.includes('premium') || lowerCommand.includes('bid') || lowerCommand.includes('money')) {
      return await this.executeAndAnalyze('WHERE tradingdays=1 AND minbid>=3.00 AND distance>=300', 'premium hunting');
    }
    
    // Time-based analysis
    if (lowerCommand.includes('hour') || lowerCommand.includes('time') || lowerCommand.includes('left') || lowerCommand.includes('close')) {
      return await this.handleTimeBasedAnalysis(command);
    }
    
    // Default: suggest a balanced scan
    return await this.executeAndAnalyze('WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300', 'balanced approach');
  }
  
  // Detect requests for strategy suggestions
  isStrategySuggestionRequest(command) {
    const suggestionPatterns = [
      /suggest.*?(?:strategies|strategy|approach)/i,
      /what.*?(?:strategies|should.*?try|recommend)/i,
      /give.*?me.*?(?:options|ideas|strategies)/i,
      /show.*?me.*?(?:different|various|multiple).*?(?:strategies|approaches)/i,
      /what.*?(?:can|should).*?(?:i|we).*?(?:try|do|run)/i,
      /help.*?me.*?(?:find|choose|pick).*?strategy/i,
      /market.*?(?:suggestions|recommendations)/i
    ];
    
    return suggestionPatterns.some(pattern => pattern.test(command));
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
  
  // Handle SPX deep premium requests with natural language interpretation
  async handleSPXRequest(command) {
    // First, check if it's a direct SQL or legacy command
    if (command.match(/^spx\s+(?:WHERE|td\d)/i)) {
      return await this.executeSPXCommand(command);
    }
    
    // Natural language interpretation
    const strategy = this.interpretSPXStrategy(command);
    const sqlCommand = this.generateSQLFromStrategy(strategy);
    
    try {
      const cmd = `node spx-deeppremium.js ${sqlCommand}`;
      const { stdout } = await execAsync(cmd);
      this.context.lastCommand = cmd;
      this.context.lastResult = stdout;
      
      // Return interpreted strategy explanation + results
      return this.formatStrategyResponse(command, strategy, stdout);
    } catch (error) {
      return `Error running SPX scan: ${error.message}`;
    }
  }
  
  // Interpret natural language into strategy parameters
  interpretSPXStrategy(command) {
    const strategy = {
      type: 'balanced',  // conservative, balanced, aggressive
      dte: 1,           // 0 or 1
      minBid: 2.00,     // minimum premium
      maxBid: null,     // maximum premium (for BETWEEN)
      minDistance: 300, // minimum distance
      maxDistance: null, // maximum distance
      intent: 'standard', // standard, premium-hunting, way-out, conservative, aggressive
      reasoning: ''
    };
    
    // Determine DTE preference
    if (command.match(/0dte|same.*?day|today/i)) {
      strategy.dte = 0;
      strategy.minDistance = 200; // Closer for 0DTE
      strategy.minBid = 0.80;     // Lower premium for 0DTE
      strategy.reasoning += 'Same-day expiration (0DTE) for quick premium collection. ';
    }
    
    // Determine risk tolerance
    if (command.match(/conservative|safe|careful/i)) {
      strategy.type = 'conservative';
      strategy.minBid = 2.50;
      strategy.minDistance = 350;
      strategy.reasoning += 'Conservative approach with higher premium and safer distance. ';
    } else if (command.match(/aggressive|risky|close/i)) {
      strategy.type = 'aggressive';
      strategy.minBid = 1.00;
      strategy.minDistance = 200;
      strategy.reasoning += 'Aggressive approach targeting closer strikes with lower premium threshold. ';
    }
    
    // Special intents
    if (command.match(/way.*?out|far.*?out|deep.*?otm/i)) {
      strategy.intent = 'way-out';
      strategy.minDistance = 500;
      strategy.minBid = 1.00;  // Allow lower premium for far OTM
      strategy.reasoning += 'Deep out-of-the-money strategy for maximum safety. ';
    }
    
    if (command.match(/premium.*?(?:hunt|possibilit|opportunit)|high.*?premium/i)) {
      strategy.intent = 'premium-hunting';
      strategy.minBid = 3.00;
      strategy.maxBid = 8.00;  // Cap for reasonable premium hunting
      strategy.reasoning += 'Premium hunting strategy targeting higher bid amounts. ';
    }
    
    if (command.match(/volatility|crazy.*?market|high.*?vol/i)) {
      strategy.intent = 'volatility';
      strategy.minBid = 4.00;
      strategy.minDistance = 400;
      strategy.reasoning += 'High volatility strategy with elevated premium expectations. ';
    }
    
    // Time-specific adjustments
    if (command.match(/rest.*?of.*?day|remaining.*?time|afternoon/i)) {
      strategy.dte = 0; // Focus on 0DTE for "rest of day"
      if (strategy.intent === 'way-out') {
        strategy.minDistance = 400; // Even further out for 0DTE safety
      }
      strategy.reasoning += 'Rest-of-day focus using 0DTE options. ';
    }
    
    return strategy;
  }
  
  // Generate SQL command from interpreted strategy
  generateSQLFromStrategy(strategy) {
    let conditions = [`tradingdays=${strategy.dte}`];
    
    if (strategy.maxBid !== null) {
      conditions.push(`minbid BETWEEN ${strategy.minBid} AND ${strategy.maxBid}`);
    } else {
      conditions.push(`minbid>=${strategy.minBid}`);
    }
    
    if (strategy.maxDistance !== null) {
      conditions.push(`distance BETWEEN ${strategy.minDistance} AND ${strategy.maxDistance}`);
    } else {
      conditions.push(`distance>=${strategy.minDistance}`);
    }
    
    return `WHERE ${conditions.join(' AND ')}`;
  }
  
  // Execute direct SPX command (SQL or legacy)
  async executeSPXCommand(command) {
    try {
      const cmd = `node spx-deeppremium.js ${command.replace(/^spx\s+/i, '')}`;
      const { stdout } = await execAsync(cmd);
      this.context.lastCommand = cmd;
      this.context.lastResult = stdout;
      
      return this.formatSPXResponse(stdout, null);
    } catch (error) {
      return `Error running SPX command: ${error.message}`;
    }
  }
  
  // Format response with strategy explanation
  formatStrategyResponse(originalCommand, strategy, stdout) {
    let response = `🤖 **Strategy Interpretation for "${originalCommand}":**\n`;
    response += `📊 **Approach**: ${strategy.type.toUpperCase()} (${strategy.dte === 0 ? '0DTE' : '1DTE'})\n`;
    response += `💰 **Premium**: $${strategy.minBid}${strategy.maxBid ? `-$${strategy.maxBid}` : '+'}\n`;
    response += `📏 **Distance**: ${strategy.minDistance}${strategy.maxDistance ? `-${strategy.maxDistance}` : '+'}pts\n`;
    response += `🧠 **Reasoning**: ${strategy.reasoning}\n\n`;
    
    // Add formatted results
    response += this.formatSPXResponse(stdout, strategy.dte);
    
    return response;
  }
  
  // Handle strategy suggestion requests
  async handleStrategySuggestionRequest(command) {
    const suggestions = this.generateStrategySuggestions(command);
    let response = `🤖 **Strategy Suggestions Based on "${command}":**\n\n`;
    
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      response += `**${i + 1}. ${suggestion.name}** (${suggestion.type.toUpperCase()})\n`;
      response += `   💰 Premium: $${suggestion.minBid}${suggestion.maxBid ? `-$${suggestion.maxBid}` : '+'}\n`;
      response += `   📏 Distance: ${suggestion.minDistance}${suggestion.maxDistance ? `-${suggestion.maxDistance}` : '+'}pts\n`;
      response += `   🎯 DTE: ${suggestion.dte === 0 ? '0DTE' : '1DTE'}\n`;
      response += `   💡 Best for: ${suggestion.bestFor}\n`;
      response += `   🔧 Command: \`spx ${suggestion.sqlCommand}\`\n\n`;
    }
    
    response += `💡 Say something like "run strategy 2" or "try the conservative approach" to execute one of these.`;
    
    return response;
  }
  
  // Generate multiple strategy suggestions
  generateStrategySuggestions(command) {
    const suggestions = [];
    
    // Always include a conservative option
    suggestions.push({
      name: "Conservative Premium Collection",
      type: "conservative",
      dte: 1,
      minBid: 2.50,
      maxBid: null,
      minDistance: 350,
      maxDistance: null,
      bestFor: "Safe premium collection with low risk of assignment",
      sqlCommand: "WHERE tradingdays=1 AND minbid>=2.50 AND distance>=350"
    });
    
    // Standard balanced approach
    suggestions.push({
      name: "Balanced 1DTE Strategy",
      type: "balanced",
      dte: 1,
      minBid: 2.00,
      maxBid: null,
      minDistance: 300,
      maxDistance: null,
      bestFor: "Good risk/reward balance for regular market conditions",
      sqlCommand: "WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300"
    });
    
    // Add time-specific suggestions
    const currentHour = new Date().getHours();
    if (currentHour >= 14) { // After 2 PM ET, suggest 0DTE
      suggestions.push({
        name: "0DTE Rest-of-Day",
        type: "aggressive",
        dte: 0,
        minBid: 0.80,
        maxBid: null,
        minDistance: 200,
        maxDistance: null,
        bestFor: "Quick premium collection for remaining trading hours",
        sqlCommand: "WHERE tradingdays=0 AND minbid>=0.80 AND distance>=200"
      });
    }
    
    // Check if command suggests specific intents
    if (command.match(/premium.*?hunt|high.*?premium/i)) {
      suggestions.push({
        name: "Premium Hunting Strategy",
        type: "premium-focused",
        dte: 1,
        minBid: 3.00,
        maxBid: 6.00,
        minDistance: 300,
        maxDistance: null,
        bestFor: "High volatility days when premiums are elevated",
        sqlCommand: "WHERE tradingdays=1 AND minbid BETWEEN 3.00 AND 6.00 AND distance>=300"
      });
    }
    
    if (command.match(/way.*?out|far.*?out|deep.*?otm/i)) {
      suggestions.push({
        name: "Deep OTM Safety Play",
        type: "ultra-conservative",
        dte: 1,
        minBid: 1.00,
        maxBid: null,
        minDistance: 500,
        maxDistance: null,
        bestFor: "Maximum safety with very low probability of assignment",
        sqlCommand: "WHERE tradingdays=1 AND minbid>=1.00 AND distance>=500"
      });
    }
    
    if (command.match(/aggressive|risky/i)) {
      suggestions.push({
        name: "Aggressive Close-In Strategy",
        type: "aggressive",
        dte: 1,
        minBid: 1.00,
        maxBid: null,
        minDistance: 150,
        maxDistance: 250,
        bestFor: "Higher premium collection with increased assignment risk",
        sqlCommand: "WHERE tradingdays=1 AND minbid>=1.00 AND distance BETWEEN 150 AND 250"
      });
    }
    
    // Limit to 4 suggestions max
    return suggestions.slice(0, 4);
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
  
  // Core method: Execute SQL command and provide intelligent analysis
  async executeAndAnalyze(sqlWhere, strategyType) {
    try {
      // Get SPX quote first
      const { stdout: quoteResult } = await execAsync('node run.js q SPX');
      const spxMatch = quoteResult.match(/💰 ([\\d.]+)/);
      const spxPrice = spxMatch ? parseFloat(spxMatch[1]) : null;
      
      // Execute SPX scan - escape shell operators
      const cmd = `node spx-deeppremium.js "${sqlWhere}"`;
      console.log('DEBUG: Executing command:', cmd);
      const { stdout } = await execAsync(cmd);
      console.log('DEBUG: stdout length:', stdout.length);
      console.log('DEBUG: stdout preview:', stdout.substring(0, 200));
      
      // Analyze results and provide intelligent commentary
      return this.analyzeAndRecommend(stdout, sqlWhere, strategyType, spxPrice);
    } catch (error) {
      console.log('DEBUG: Error in executeAndAnalyze:', error.message);
      return `Error analyzing market: ${error.message}`;
    }
  }
  
  // Handle SPX-specific requests
  async handleProactiveSPXAnalysis(command) {
    const lowerCommand = command.toLowerCase();
    
    // Determine time preference
    if (lowerCommand.includes('today') || lowerCommand.includes('0dte') || lowerCommand.includes('same day')) {
      return await this.executeAndAnalyze('WHERE tradingdays=0 AND minbid>=0.80 AND distance>=200', '0DTE strategy');
    }
    
    // Default to 1DTE
    return await this.executeAndAnalyze('WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300', 'SPX analysis');
  }
  
  // Handle market condition analysis
  async handleMarketAnalysis(command) {
    try {
      // Get current time and market status
      const now = new Date();
      const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const currentHour = easternTime.getHours();
      const hoursToClose = Math.max(0, 16 - currentHour);
      
      // Get SPX quote and analyze
      const { stdout: quoteResult } = await execAsync('node run.js q SPX');
      
      // Determine appropriate strategy based on time
      let strategy, reasoning;
      if (hoursToClose <= 4 && hoursToClose > 0) {
        strategy = 'WHERE tradingdays=0 AND minbid>=0.80 AND distance>=200';
        reasoning = `With ${hoursToClose} hours left to market close`;
      } else {
        strategy = 'WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300';
        reasoning = 'Standard 1DTE approach';
      }
      
      // Execute and analyze
      const result = await this.executeAndAnalyze(strategy, reasoning);
      return `📊 **Market Analysis** - ${reasoning}\\n\\n${result}`;
    } catch (error) {
      return `Error analyzing market conditions: ${error.message}`;
    }
  }
  
  // Handle opportunity hunting requests
  async handleOpportunityHunt(command) {
    const lowerCommand = command.toLowerCase();
    
    // Determine hunting style
    if (lowerCommand.includes('premium') || lowerCommand.includes('high') || lowerCommand.includes('good')) {
      return await this.executeAndAnalyze('WHERE tradingdays=1 AND minbid>=3.00 AND distance>=300', 'premium hunting');
    }
    
    if (lowerCommand.includes('safe') || lowerCommand.includes('far')) {
      return await this.executeAndAnalyze('WHERE tradingdays=1 AND minbid>=2.00 AND distance>=400', 'safe opportunity hunting');
    }
    
    // Default balanced hunt
    return await this.executeAndAnalyze('WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300', 'opportunity hunting');
  }
  
  // Handle time-based analysis
  async handleTimeBasedAnalysis(command) {
    try {
      const now = new Date();
      const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const currentHour = easternTime.getHours();
      const hoursToClose = Math.max(0, 16 - currentHour);
      
      if (hoursToClose <= 2) {
        return await this.executeAndAnalyze('WHERE tradingdays=0 AND minbid>=0.50 AND distance>=150', `final ${hoursToClose} hours strategy`);
      } else if (hoursToClose <= 4) {
        return await this.executeAndAnalyze('WHERE tradingdays=0 AND minbid>=0.80 AND distance>=200', `${hoursToClose} hours remaining strategy`);
      } else {
        return await this.executeAndAnalyze('WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300', 'standard timing strategy');
      }
    } catch (error) {
      return `Error analyzing time-based opportunities: ${error.message}`;
    }
  }
  
  // Intelligent analysis and recommendations
  analyzeAndRecommend(stdout, sqlWhere, strategyType, spxPrice) {
    const lines = stdout.split('\\n');
    
    // Extract key information
    const spxLine = lines.find(line => line.includes('📈 SPX:'));
    const currentSpx = spxLine ? spxLine.match(/📈 SPX: ([\\d.]+)/)?.[1] : (spxPrice ? spxPrice.toString() : 'unknown');
    
    // Check for opportunities - let's debug this
    const hasTarget = stdout.includes('🎯 SELL');
    const hasNo = stdout.includes('❌ NO');
    const hasYes = stdout.includes('✅ YES');
    
    // Debug output to see what we're getting
    console.log('DEBUG: hasTarget =', hasTarget);
    console.log('DEBUG: hasNo =', hasNo); 
    console.log('DEBUG: hasYes =', hasYes);
    
    // Calculate market context
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentHour = easternTime.getHours();
    const hoursToClose = Math.max(0, 16 - currentHour);
    
    if (hasTarget) {
      // Extract trade details - match actual SPX output format
      const sellMatch = stdout.match(/🎯 SELL 1x SPX (\d+)P/);
      const premiumMatch = stdout.match(/💰 Premium: \$([.\d]+)/);
      const creditMatch = stdout.match(/📊 Credit: \$(\d+)/);
      const distanceMatch = stdout.match(/📏 Distance: (\d+) points from SPX/);
      
      console.log('DEBUG: sellMatch =', sellMatch);
      console.log('DEBUG: premiumMatch =', premiumMatch);
      console.log('DEBUG: creditMatch =', creditMatch);
      console.log('DEBUG: distanceMatch =', distanceMatch);
      
      if (sellMatch && premiumMatch && creditMatch && distanceMatch) {
        const strike = sellMatch[1];
        const premium = premiumMatch[1];
        const credit = creditMatch[1];
        const distance = parseInt(distanceMatch[1]);
        
        // Intelligent commentary
        let commentary = `🎯 **OPPORTUNITY FOUND** using ${strategyType}\\n\\n`;
        commentary += `📈 SPX: $${currentSpx}\\n`;
        commentary += `💰 TARGET: ${strike}P @ $${premium} (${distance} points out)\\n`;
        commentary += `💵 CREDIT: $${credit} per contract\\n\\n`;
        
        // Risk analysis
        if (distance >= 400) {
          commentary += `🟢 **RISK LEVEL**: Very Safe - ${distance} points is excellent safety buffer\\n`;
        } else if (distance >= 300) {
          commentary += `🟡 **RISK LEVEL**: Safe - ${distance} points provides good protection\\n`;
        } else if (distance >= 200) {
          commentary += `🟠 **RISK LEVEL**: Moderate - ${distance} points requires monitoring\\n`;
        } else {
          commentary += `🔴 **RISK LEVEL**: Higher Risk - ${distance} points is aggressive\\n`;
        }
        
        // Time analysis
        if (hoursToClose > 0) {
          commentary += `⏰ **TIMING**: ${hoursToClose} hours to market close\\n`;
        }
        
        // Premium analysis
        const premiumFloat = parseFloat(premium);
        if (premiumFloat >= 3.0) {
          commentary += `💎 **PREMIUM**: Excellent $${premium} bid - great income potential\\n`;
        } else if (premiumFloat >= 2.0) {
          commentary += `💰 **PREMIUM**: Good $${premium} bid - solid income\\n`;
        } else if (premiumFloat >= 1.0) {
          commentary += `💵 **PREMIUM**: Decent $${premium} bid - moderate income\\n`;
        } else {
          commentary += `🪙 **PREMIUM**: Lower $${premium} bid - conservative income\\n`;
        }
        
        commentary += `\\n**RECOMMENDATION**: This looks like a ${this.getRecommendationLevel(distance, premiumFloat)} opportunity!`;
        
        return commentary;
      }
    }
    
    if (hasNo) {
      let analysis = `❌ **NO QUALIFYING OPPORTUNITIES** found with ${strategyType}\\n\\n`;
      analysis += `📈 SPX: $${currentSpx}\\n`;
      analysis += `🔍 Scanned using: ${sqlWhere}\\n\\n`;
      
      // Suggest alternatives
      analysis += `💡 **SUGGESTIONS**:\\n`;
      if (sqlWhere.includes('minbid>=3.00')) {
        analysis += `• Try lower premium: "look for $2 premium opportunities"\\n`;
      }
      if (sqlWhere.includes('distance>=400')) {
        analysis += `• Try closer strikes: "find opportunities 300 points out"\\n`;
      }
      if (sqlWhere.includes('tradingdays=1')) {
        analysis += `• Try 0DTE: "SPX today" for same-day opportunities\\n`;
      } else {
        analysis += `• Try 1DTE: "SPX tomorrow" for next-day opportunities\\n`;
      }
      
      return analysis;
    }
    
    // Fallback
    return `📊 **Analysis complete** using ${strategyType}\\n\\n${stdout}`;
  }
  
  // Get recommendation strength
  getRecommendationLevel(distance, premium) {
    if (distance >= 400 && premium >= 2.5) return 'EXCELLENT';
    if (distance >= 300 && premium >= 2.0) return 'STRONG';
    if (distance >= 250 && premium >= 1.5) return 'GOOD';
    if (distance >= 200 && premium >= 1.0) return 'DECENT';
    return 'MODERATE';
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