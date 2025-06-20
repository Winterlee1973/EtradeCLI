#!/usr/bin/env node

/**
 * Shared Templates for EtradeCLI
 * Reusable formatting components for all trading strategies
 */

export const SharedTemplates = {
  // Quote templates
  quote1: {
    terminal: (symbol, price, change, percent, timestamp) => {
      const arrow = change >= 0 ? '⬆️' : '⬇️';
      const sign = change >= 0 ? '+' : '';
      return [
        `📊 ${symbol}`,
        `💰 ${price}`,
        `${arrow} ${sign}${change} (${sign}${percent}%)`,
        `📅 ${timestamp}`
      ].join('\n');
    },
    
    slack: (symbol, price, change, percent, timestamp) => ({
      blocks: [{
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*📊 ${symbol}*` },
          { type: 'mrkdwn', text: `*💰 Price:* ${price}` },
          { type: 'mrkdwn', text: `*📈 Change:* ${change >= 0 ? '+' : ''}${change} (${change >= 0 ? '+' : ''}${percent}%)` },
          { type: 'mrkdwn', text: `*⏰ Updated:* ${timestamp}` }
        ]
      }]
    })
  },

  // Common market data formatting
  marketData: {
    timestamp: (date, timezone = 'America/New_York') => {
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: timezone
      });
    },
    
    price: (symbol, price, status = 'OPEN') => `📈 ${symbol}: ${price} (${status})`,
    
    change: (amount, percent, isPositive) => {
      const arrow = isPositive ? '⬆️' : '⬇️';
      const sign = isPositive ? '+' : '';
      return `${arrow} ${sign}${amount} (${sign}${percent}%)`;
    }
  },
  
  // Option chain templates - reusable across strategies
  optionschain1: {
    // Standard grid (Strike/Bid/Ask/Dist)
    terminal: {
      header: () => '📋 OPTION CHAIN:\nStrike  Bid   Ask   Points Out\n──────────────────────────────',
      
      row: (strike, bid, ask, distance, marker = ' ') => {
        return `${marker} ${strike.toString().padEnd(6)} ${bid.padStart(5)} ${ask.padStart(5)} ${distance.toString().padStart(4)}`;
      },
      
    },
    
    slack: {
      header: (expiration, note) => {
        let header = '*📋 OPTION CHAIN*';
        if (expiration) {
          header += ` - *📅 ${expiration}${note ? ` (${note})` : ''}*`;
        }
        return header;
      },
      
      table: (rows) => {
        let table = '```\nStrike   Bid   Ask  Points Out\n─────────────────────────────\n';
        rows.forEach(row => {
          const marker = SharedTemplates.optionschain1.slack.marker(row.marker);
          table += `${marker} ${row.strike.padEnd(6)} ${row.bid.padStart(5)} ${row.ask.padStart(5)} ${row.distance.toString().padStart(4)}\n`;
        });
        table += '```';
        return table;
      },
      
      marker: (marker) => {
        const map = {
          '🎯': '→',
          '✅': '✓',
          '💰': '$',
          '🔥': '*',
          ' ': ' '
        };
        return map[marker] || ' ';
      }
    }
  },
  
  
  // Order templates
  order1: {
    // Simple sell order
    terminal: {
      header: () => '🎯 EXECUTION SUMMARY:',
      sell: (quantity, symbol, strike, expiration) => `🎯 SELL ${quantity}x ${symbol} ${strike}P${expiration ? ` ${expiration}` : ''}`,
      buy: (quantity, symbol, strike, expiration) => `🎯 BUY ${quantity}x ${symbol} ${strike}P${expiration ? ` ${expiration}` : ''}`,
      premium: (amount) => `💰 Premium: $${amount}`,
      credit: (amount) => `📊 Credit: $${amount}`,
      debit: (amount) => `📊 Debit: $${amount}`,
      distance: (points, symbol = 'SPX') => `📏 Distance: ${points} points from ${symbol}`,
      safety: (emoji, level) => `🛡️ Safety Meter: ${emoji} ${level}`,
      yes: () => '✅ YES',
      no: () => '❌ NO'
    },
    
    slack: {
      summary: (action, quantity, symbol, strike, premium, credit, distance, safety) => {
        let text = `*🎯 ${action} ${quantity}x ${symbol} ${strike}P*\nPremium: ${premium} | Credit: ${credit}\nDistance: ${distance}`;
        if (safety) {
          text += ` | Safety: ${safety}`;
        }
        return text;
      },
      
      executeButton: (value = null) => ({
        type: 'button',
        text: { type: 'plain_text', text: '⚡ Execute Trade' },
        style: 'primary',
        action_id: 'execute_trade',
        value: value || Date.now().toString()
      }),
      
      refreshButton: () => ({
        type: 'button',
        text: { type: 'plain_text', text: '🔄 Refresh Scan' },
        action_id: 'refresh_scan'
      }),
      
      tradeAnywayButton: (value = null) => ({
        type: 'button',
        text: { type: 'plain_text', text: '⚠️ Trade Anyway' },
        style: 'danger',
        action_id: 'trade_anyway',
        value: value || Date.now().toString()
      })
    }
  },

  // Order status templates
  orderstatus1: {
    // Order tracking and history
    terminal: {
      header: () => '📋 ORDER STATUS:',
      sectionHeader: (title) => `\n🔸 ${title.toUpperCase()}:`,
      orderRow: (id, symbol, side, quantity, strike, status, filled, price, time) => {
        const statusEmoji = {
          'FILLED': '✅',
          'PENDING': '⏳',
          'CANCELLED': '❌',
          'PARTIAL': '🟡',
          'REJECTED': '🚫'
        };
        const emoji = statusEmoji[status] || '❓';
        return `${emoji} ${id.padEnd(8)} ${side.padEnd(4)} ${quantity}x ${symbol} ${strike}P @ $${price} (${filled}/${quantity}) ${time}`;
      },
      summary: (totalOrders, filled, pending, cancelled) => 
        `\n📊 SUMMARY: ${totalOrders} total | ${filled} filled | ${pending} pending | ${cancelled} cancelled`,
      noOrders: () => '📭 No orders found'
    },
    
    slack: {
      header: () => '*📋 ORDER STATUS*',
      
      sectionBlock: (title, orders) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🔸 ${title.toUpperCase()}:*\n${orders.length > 0 ? '```\n' + orders.map(o => 
            `${o.emoji} ${o.id.padEnd(6)} ${o.side.padEnd(4)} ${o.quantity}x ${o.symbol} ${o.strike}P\n    $${o.price} (${o.filled}/${o.quantity}) ${o.time}`
          ).join('\n') + '\n```' : '📭 None'}`
        }
      }),
      
      summaryBlock: (totalOrders, filled, pending, cancelled) => ({
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*📊 Total:* ${totalOrders}` },
          { type: 'mrkdwn', text: `*✅ Filled:* ${filled}` },
          { type: 'mrkdwn', text: `*⏳ Pending:* ${pending}` },
          { type: 'mrkdwn', text: `*❌ Cancelled:* ${cancelled}` }
        ]
      }),
      
      refreshButton: () => ({
        type: 'button',
        text: { type: 'plain_text', text: '🔄 Refresh Status' },
        action_id: 'refresh_order_status'
      }),
      
      cancelOrderButton: (orderId) => ({
        type: 'button',
        text: { type: 'plain_text', text: '❌ Cancel Order' },
        style: 'danger',
        action_id: 'cancel_order',
        value: orderId
      })
    }
  },

  // Common execution/recommendation templates (legacy - to be deprecated)
  execution: {
    header: (type = 'EXECUTION SUMMARY') => `🎯 ${type}:`,
    
    trade: (action, quantity, symbol, strike, expiration) => 
      `🎯 ${action} ${quantity}x ${symbol} ${strike}${strike ? 'P' : ''} ${expiration || ''}`,
    
    premium: (amount) => `💰 Premium: $${amount}`,
    credit: (amount) => `📊 Credit: $${amount}`,
    debit: (amount) => `📊 Debit: $${amount}`,
    
    distance: (points, symbol = 'SPX') => `📏 Distance: ${points} points from ${symbol}`,
    
    safetyMeter: (distance, customLevels = null) => {
      const levels = customLevels || {
        400: { emoji: '🟢🟢🟢', level: 'Ultra Safe' },
        300: { emoji: '🟢🟢', level: 'Very Safe' },
        200: { emoji: '🟢', level: 'Safe' },
        100: { emoji: '🟡', level: 'Moderate' },
        0: { emoji: '🔴', level: 'Risky' }
      };
      
      for (const threshold of Object.keys(levels).sort((a, b) => b - a)) {
        if (distance >= parseInt(threshold)) {
          return `🛡️ Safety Meter: ${levels[threshold].emoji} ${levels[threshold].level}`;
        }
      }
      return `🛡️ Safety Meter: ${levels[0].emoji} ${levels[0].level}`;
    },
    
    recommendation: {
      yes: () => '✅ YES',
      no: () => '❌ NO',
      maybe: () => '🤔 MAYBE',
      custom: (emoji, text) => `${emoji} ${text}`
    }
  },
  
  // Slack-specific shared components
  slack: {
    header: (title, subtitle = null) => ({
      type: 'header',
      text: {
        type: 'plain_text',
        text: subtitle ? `${title} - ${subtitle}` : title
      }
    }),
    
    infoSection: (fields) => ({
      type: 'section',
      fields: fields.map(field => ({
        type: 'mrkdwn',
        text: field
      }))
    }),
    
    divider: () => ({ type: 'divider' }),
    
    buttonGroup: (buttons, blockId) => ({
      type: 'actions',
      block_id: blockId || `buttons_${Date.now()}`,
      elements: buttons
    }),
    
    executeButton: (value = null) => ({
      type: 'button',
      text: {
        type: 'plain_text',
        text: '⚡ Execute Trade'
      },
      style: 'primary',
      action_id: 'execute_trade',
      value: value || Date.now().toString()
    }),
    
    refreshButton: () => ({
      type: 'button',
      text: {
        type: 'plain_text',
        text: '🔄 Refresh Scan'
      },
      action_id: 'refresh_scan'
    }),
    
    tradeAnywayButton: (value = null) => ({
      type: 'button',
      text: {
        type: 'plain_text',
        text: '⚠️ Trade Anyway'
      },
      style: 'danger',
      action_id: 'trade_anyway',
      value: value || Date.now().toString()
    })
  },
  
  // Common utility functions
  utils: {
    formatCurrency: (amount, decimals = 2) => {
      const num = parseFloat(amount);
      return num.toFixed(decimals);
    },
    
    formatPercent: (value, decimals = 2) => {
      return `${(value * 100).toFixed(decimals)}%`;
    },
    
    padNumber: (num, width, char = ' ') => {
      return num.toString().padStart(width, char);
    },
    
    createSeparator: (char = '─', length = 40) => {
      return char.repeat(length);
    },
    
    dateToString: (date, format = 'short') => {
      if (format === 'short') {
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
      }
      return date.toISOString();
    },
    
    getExpirationNote: (expirationDate) => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const expDate = new Date(expirationDate);
      
      if (expDate.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (expDate.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
      }
      
      // Check if next trading day (skip weekends)
      const nextTradingDay = new Date(today);
      do {
        nextTradingDay.setDate(nextTradingDay.getDate() + 1);
      } while (nextTradingDay.getDay() === 0 || nextTradingDay.getDay() === 6);
      
      if (expDate.toDateString() === nextTradingDay.toDateString()) {
        return 'Next Trading Day';
      }
      
      return null;
    }
  },
  
  // Error and status templates
  status: {
    error: (message) => `❌ ERROR: ${message}`,
    warning: (message) => `⚠️ WARNING: ${message}`,
    info: (message) => `ℹ️ INFO: ${message}`,
    success: (message) => `✅ SUCCESS: ${message}`,
    
    noData: () => '📭 No data available',
    loading: () => '⏳ Loading...',
    marketClosed: () => '🏪 Market is closed',
    
    slackError: (message) => ({
      blocks: [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `❌ *Error:* ${message}`
        }
      }]
    }),
    
    slackWarning: (message) => ({
      blocks: [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚠️ *Warning:* ${message}`
        }
      }]
    })
  },

  // Help template for bot documentation and guidance
  help1: {
    terminal: {
      header: () => '📖 LEE\'S AI TRADING BOT - v2',
      section: (title) => `\n## ${title}`,
      command: (cmd, description) => `• ${cmd} - ${description}`,
      example: (example, description) => `  ${example}  # ${description}`,
      note: (message) => `\n⚠️  ${message}`,
      quickStart: () => '\n⚡ Quick Start Examples:'
    },
    
    slack: {
      helpBlock: (content) => ({
        type: 'section',
        text: {
          type: 'mrkdwn', 
          text: content
        }
      }),
      
      categoryBlock: (title, commands) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${title}*\n${commands.map(cmd => `• ${cmd}`).join('\n')}`
        }
      }),
      
      strategyButton: (label, value, style = 'primary') => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: label
        },
        style: style,
        action_id: 'run_strategy',
        value: value
      }),
      
      strategySection: (title, strategies) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${title}*\n${strategies.map(s => `• \`${s.command}\` - ${s.description}`).join('\n')}`
        }
      }),
      
      strategyButtons: (strategies) => ({
        type: 'actions',
        elements: strategies.map(s => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: s.label
          },
          style: s.style || 'primary',
          action_id: 'run_strategy',
          value: s.command
        }))
      }),
      
      orderButton: () => ({
        type: 'actions',
        elements: [{
          type: 'button',
          text: {
            type: 'plain_text',
            text: '📋 View Orders'
          },
          style: 'primary',
          action_id: 'view_orders'
        }]
      })
    }
  },

  // === FUTURE SCRIPT TEMPLATES ===
  // These templates will be used by advanced Scripts (not current Commands)
  
  // Recommendation template for intelligent suggestions
  recommendation1: {
    terminal: {
      header: () => '🎯 INTELLIGENT RECOMMENDATIONS:',
      strategy: (name, confidence, reasoning) => `✅ ${name} (${confidence}% confidence)\n   Reasoning: ${reasoning}`,
      warning: (message) => `⚠️  Warning: ${message}`,
      insight: (message) => `💡 Market Insight: ${message}`,
      nextAction: (action) => `➡️  Next: ${action}`
    },
    
    slack: {
      recommendationBlock: (strategies) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🎯 INTELLIGENT RECOMMENDATIONS*\n${strategies.map(s => 
            `• *${s.name}* (${s.confidence}% confidence)\n  ${s.reasoning}`
          ).join('\n')}`
        }
      })
    }
  },

  // Comparison template for multi-strategy analysis
  comparison1: {
    terminal: {
      header: () => '⚖️  STRATEGY COMPARISON:',
      comparison: (strategies) => {
        let output = 'Strategy'.padEnd(20) + 'Risk'.padEnd(10) + 'Reward'.padEnd(10) + 'Score\n';
        output += '─'.repeat(50) + '\n';
        strategies.forEach(s => {
          output += `${s.name.padEnd(20)}${s.risk.padEnd(10)}${s.reward.padEnd(10)}${s.score}\n`;
        });
        return output;
      },
      winner: (strategy, reason) => `🏆 Best Strategy: ${strategy}\n   Reason: ${reason}`
    },
    
    slack: {
      comparisonBlock: (strategies) => ({
        type: 'section',
        fields: strategies.map(s => ({
          type: 'mrkdwn',
          text: `*${s.name}*\nRisk: ${s.risk} | Reward: ${s.reward}\nScore: ${s.score}`
        }))
      })
    }
  },

  // Reasoning template for AI explanations
  reasoning1: {
    terminal: {
      header: () => '🧠 MARKET ANALYSIS & REASONING:',
      factor: (name, impact, description) => `• ${name}: ${impact} impact\n  ${description}`,
      conclusion: (text) => `\n📊 Conclusion: ${text}`,
      confidence: (level, factors) => `\n🎯 Confidence: ${level}% (based on ${factors.join(', ')})`
    },
    
    slack: {
      reasoningBlock: (factors, conclusion) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🧠 MARKET ANALYSIS*\n${factors.map(f => 
            `• *${f.name}*: ${f.impact} impact\n  ${f.description}`
          ).join('\n')}\n\n*📊 Conclusion:* ${conclusion}`
        }
      })
    }
  }
};

// Template presets for trading strategies
// 
// ARCHITECTURE OVERVIEW:
// 
// === COMMANDS vs SCRIPTS ===
// 
// COMMANDS (Current Implementation):
//   - Direct execution with specific parameters
//   - Single query focus (e.g., SPX deep premium scan)
//   - Auto/Manual execution modes
//   - Fast, targeted results
//   - Examples: spx td1 minbid2 distance300, quote TSLA
// 
// SCRIPTS (Future Implementation):
//   - Multi-query logic and analysis
//   - Complex recommendation engines
//   - Market condition awareness
//   - Cross-strategy comparisons
//   - Advanced decision trees
//   - Examples: market-condition-scanner, multi-timeframe-analysis
// 
// Both Commands and Scripts will use these shared templates for consistent output
// 
export const TemplatePresets = {
  // SPX Deep Premium COMMAND (uses quote1 + optionschain1 + order1)
  // Command formats (ADVANCED REQUIRED FORMAT):
  // 
  // === CONSERVATIVE STRATEGIES ===
  //   spx td1 minbid2.5 distance350   - High premium, far OTM (safer)
  //   spx td1 minbid3.0 distance400   - Premium hunting, ultra-safe distance
  //   spx td0 minbid1.0 distance250   - 0DTE conservative with decent premium
  // 
  // === AGGRESSIVE STRATEGIES ===
  //   spx td1 minbid1.0 distance200   - Closer strikes, lower premium threshold
  //   spx td1 minbid0.5 distance150   - High risk/reward, close to money
  //   spx td0 minbid0.3 distance100   - 0DTE scalping (extreme risk)
  // 
  // === BALANCED STRATEGIES ===
  //   spx td1 minbid2.0 distance300   - Standard 1DTE strategy (recommended)
  //   spx td1 minbid1.5 distance250   - Moderate risk, decent premium
  //   spx td0 minbid0.8 distance200   - Standard 0DTE strategy
  // 
  // === MARKET CONDITION STRATEGIES ===
  //   spx td1 minbid4.0 distance500   - High volatility, max distance
  //   spx td1 minbid1.2 distance280   - Low volatility, tighter criteria
  //   spx td0 minbid0.6 distance180   - Quiet market 0DTE
  // 
  // === PREMIUM HUNTING ===
  //   spx td1 minbid5.0 distance600   - Chase maximum premium (rare setups)
  //   spx td1 minbid3.5 distance450   - High premium threshold
  //   spx td0 minbid1.5 distance300   - 0DTE premium focus
  // 
  // === STRATEGY SELECTION GUIDE ===
  // 
  // Market Volatility:
  //   High VIX (>25): Use distance400+ with minbid3.0+ for safety
  //   Normal VIX (15-25): Standard distance300 with minbid2.0
  //   Low VIX (<15): Can use distance200-250 with minbid1.5+
  // 
  // Time of Day:
  //   Morning (9:30-11): Use conservative distance300+ (higher volatility)
  //   Midday (11-2): Can use moderate distance250-300
  //   Close (2-4): 0DTE focus, distance200+ recommended
  // 
  // Market Direction:
  //   Trending Down: Increase distance by 50-100pts (more put buying)
  //   Sideways/Up: Standard distances work well
  //   Strong Rally: Consider distance400+ (extreme put protection)
  // 
  // Risk Tolerance:
  //   Conservative: minbid2.5+ distance350+ (focus on safety)
  //   Moderate: minbid1.5-2.5 distance250-350 (balanced approach)
  //   Aggressive: minbid0.5-1.5 distance150-250 (higher risk/reward)
  // 
  // === QUICK REFERENCE FOR COMMON SCENARIOS ===
  // 
  // "I want safe premium collection":
  //   → spx td1 minbid2.5 distance350
  // 
  // "Market is crazy volatile today":
  //   → spx td1 minbid4.0 distance500
  // 
  // "I'm feeling aggressive":
  //   → spx td1 minbid1.0 distance200
  // 
  // "Standard 1DTE strategy":
  //   → spx td1 minbid2.0 distance300
  // 
  // "0DTE scalping opportunity":
  //   → spx td0 minbid0.8 distance200
  // 
  // "Chase maximum premium":
  //   → spx td1 minbid5.0 distance600
  // 
  // "Market seems quiet":
  //   → spx td1 minbid1.2 distance280
  // 
  // All parameters are REQUIRED for meaningful trading strategies.
  // Old simple formats (spx 1, spx 0) are deprecated and will show error.
  // 
  // Refresh behavior: Slack bot saves last SPX command globally (lastSpxCommand)
  // and reuses it for "Refresh Scan" button to preserve all parameters
  spxDeepPremium: {
    templates: ['quote1', 'optionschain1', 'order1'],
    headerFormat: 'SPX DEEP PREMIUM SCAN: {runType} - SPX TD{expiration} MINBID${minPremium} DISTANCE{minDistance}PTS',
    terminal: [
      'header',
      'marketData',
      'criteria',
      'optionschain1.terminal',
      'order1.terminal',
      'recommendation'
    ],
    
    slack: [
      'header',
      'infoSection',
      'optionschain1.slack',
      'order1.slack',
      'buttons'
    ]
  },
  
  // Order Status View (uses orderstatus1)
  orderStatus: {
    templates: ['orderstatus1'],
    terminal: ['orderstatus1.terminal'],
    slack: ['orderstatus1.slack']
  },
  
  // Simple quote display (uses quote1)
  simpleQuote: {
    templates: ['quote1'],
    terminal: ['quote1.terminal'],
    slack: ['quote1.slack']
  },
  
  // Help documentation display (uses help1)
  helpDisplay: {
    templates: ['help1'],
    triggers: ['hi', 'hello', 'help', 'start'],
    autoDisplay: ['server-startup'],
    terminal: ['help1.terminal'],
    slack: ['help1.slack'],
    source: 'bot-help-v2.md'
  },
  
  // === FUTURE SCRIPT TEMPLATES ===
  // These will be implemented when Scripts are added
  
  // Market Condition Scanner SCRIPT (future)
  marketConditionScanner: {
    templates: ['quote1', 'optionschain1', 'order1', 'recommendation1'],
    capabilities: [
      'Multi-timeframe analysis',
      'VIX correlation analysis', 
      'Market trend detection',
      'Cross-strategy recommendations',
      'Risk assessment scoring'
    ],
    sampleCommands: [
      'market-scan aggressive',
      'market-scan conservative', 
      'market-scan auto-recommend'
    ]
  },
  
  // Multi-Strategy Analyzer SCRIPT (future)
  multiStrategyAnalyzer: {
    templates: ['quote1', 'optionschain1', 'order1', 'comparison1'],
    capabilities: [
      'Compare multiple SPX strategies',
      'Risk/reward optimization',
      'Portfolio impact analysis',
      'Diversification recommendations',
      'Time-based strategy selection'
    ],
    sampleCommands: [
      'analyze-strategies conservative balanced aggressive',
      'optimize-portfolio risk-level medium',
      'recommend-best-strategy current-market'
    ]
  },
  
  // Option Chain Analyzer Template
  optionChainAnalyzer: {
    terminal: {
      header: (spxPrice, dte, expDate, totalPuts) => [
        `📈 SPX: $${spxPrice.toFixed(2)}`,
        `📅 Analyzing ${dte === 0 ? '0DTE (today)' : '1DTE (next trading day)'} options`,
        `📅 Expiration: ${expDate}`,
        `📊 Total puts in chain: ${totalPuts}`
      ].join('\n'),
      
      // MAIN TEMPLATE: Show surrounding strikes with context
      contextHeader: (targetBid) => [
        `🎯 $${targetBid.toFixed(2)} BIDS WITH SURROUNDING CONTEXT:`,
        'Strike\tBid\tAsk\tDistance\tNote',
        '─'.repeat(50)
      ].join('\n'),
      
      // Enhanced data row with context markers
      contextRow: (strike, bid, ask, distance, note = '') => 
        `${strike}\t$${bid.toFixed(2)}\t$${ask.toFixed(2)}\t${distance} pts\t${note}`,
      
      // Legacy search header (keep for compatibility)
      searchHeader: (targetBid) => [
        `🎯 SEARCHING FOR $${targetBid.toFixed(2)} BIDS:`,
        'Strike\tBid\tAsk\tDistance',
        '─'.repeat(40)
      ].join('\n'),
      
      dataRow: (strike, bid, ask, distance) => 
        `${strike}\t$${bid.toFixed(2)}\t$${ask.toFixed(2)}\t${distance} pts`,
      
      summary: (count, targetBid, closest = null) => {
        let result = `✅ Found ${count} strikes with $${targetBid.toFixed(2)} bid`;
        if (closest) {
          const distance = Math.round(closest.spot - closest.strike);
          result += `\n💡 Closest: ${closest.strike} strike (${distance} points out)`;
        }
        return result;
      },
      
      // Proof of lowest bid section
      proofHeader: () => [
        `🔍 PROOF OF LOWEST BID:`,
        'Strike\tBid\tAsk\tDistance\tNote',
        '─'.repeat(50)
      ].join('\n'),
      
      noResults: (targetBid) => `❌ No exact $${targetBid.toFixed(2)} bids found`,
      
      nearbyHeader: (targetBid) => [
        `🔍 NEAREST BIDS TO $${targetBid.toFixed(2)}:`,
        'Strike\tBid\tAsk\tDistance',
        '─'.repeat(40)
      ].join('\n'),
      
      bidLevelSummary: (bid, count, furthest, spot) => {
        if (count === 0) {
          return `$${bid.toFixed(2)} bids: None found`;
        }
        const distance = Math.round(spot - furthest.strike);
        return `$${bid.toFixed(2)} bids: ${count} strikes, furthest at ${furthest.strike} (${distance} points out)`;
      }
    },
    
    errors: {
      noExpiration: (dte) => `❌ NO ${dte === 0 ? '0DTE' : '1DTE'} EXPIRATION AVAILABLE`,
      apiError: (message) => [
        `❌ Error fetching option chain: ${message}`,
        '💡 This could be due to:',
        '   - Market closed and no recent data available',
        '   - Yahoo Finance API issues',
        '   - Network connectivity problems',
        '   - Invalid expiration date'
      ].join('\n')
    }
  },

  // Intelligent Recommendation Engine SCRIPT (future)
  intelligentRecommendations: {
    templates: ['quote1', 'optionschain1', 'order1', 'recommendation1', 'reasoning1'],
    capabilities: [
      'AI-powered strategy selection',
      'Market condition interpretation',
      'Risk tolerance matching', 
      'Historical pattern analysis',
      'Real-time strategy adjustment'
    ],
    sampleCommands: [
      'recommend-strategy user-profile conservative',
      'auto-adjust current-positions',
      'market-intelligence-report'
    ]
  }
  
};