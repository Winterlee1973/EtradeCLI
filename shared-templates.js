#!/usr/bin/env node

/**
 * Simplified Shared Templates for EtradeCLI
 * TERMINAL: Option Chain Analyzer + SPX Deep Premium templates
 * SLACK: All templates preserved for Slack bot functionality
 */

export const SharedTemplates = {
  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  // ░░░ SLACK TEMPLATE #1: QUOTE DISPLAY ░░░
  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  //
  // 🔷 WHEN THIS GETS CALLED:
  // - When user asks for stock quotes in Slack: "q TSLA", "quote SPX"
  // - Real-time price updates with change/percentage
  // - Used by slack-bot.js when handling quote commands
  //
  // 🔷 SAMPLE SLACK CONVERSATIONS THAT USE THIS:
  // User: "q AAPL"
  // User: "quote TSLA"
  // User: "what's SPX at?"
  // User: "price of MSFT"
  //
  // 🔷 OUTPUT STYLE: Slack formatted block with symbol, price, change, timestamp
  //
  quote1: {
    // 🔷 SLACK QUOTE: Main quote display function
    // Shows symbol, price, change arrow, percentage, and timestamp
    slack: (symbol, price, change, percent, timestamp) => ({
      blocks: [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${symbol}*\n💰 $${price}\n${change >= 0 ? '⬆️' : '⬇️'} ${change >= 0 ? '+' : ''}${change} (${change >= 0 ? '+' : ''}${percent}%)\n📅 ${timestamp}`
        }
      }]
    })
  },

  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  // ░░░ SLACK TEMPLATE #2: OPTION CHAIN DISPLAY ░░░
  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  //
  // 🔷 WHEN THIS GETS CALLED:
  // - When displaying option chains in Slack channel
  // - Shows strikes, bids, asks, distances in formatted table
  // - Used with SPX strategies and option scanning
  //
  // 🔷 SAMPLE SLACK CONVERSATIONS THAT USE THIS:
  // User: "spx 1dte1"
  // User: "show me option chain for tomorrow"
  // User: "scan deep premium options"
  //
  // 🔷 OUTPUT STYLE: Code block table with proper alignment
  //
  optionschain1: {
    slack: {
      // 🔷 CHAIN HEADER: Shows expiration date and any notes
      header: (expiration, note = '') => ({
        type: 'section',
        text: {
          type: 'mrkdwn', 
          text: `*📋 OPTION CHAIN*\n*Expiration:* ${expiration} ${note}`
        }
      }),
      // 🔷 CHAIN TABLE: Formats option rows into code block table
      table: (rows) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '```\nStrike  Bid   Ask   Points Out\n' + '─'.repeat(30) + '\n' + rows.join('\n') + '\n```'
        }
      }),
      // 🔷 MARKER CONVERTER: Converts emojis to text for Slack compatibility
      marker: (marker) => {
        const markers = {
          '🎯': '[TARGET]',
          '✅': '[GOOD]', 
          '💰': '[ITM]',
          '🔥': '[HOT]'
        };
        return markers[marker] || marker;
      }
    }
  },

  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  // ░░░ SLACK TEMPLATE #3: ORDER EXECUTION ░░░
  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  //
  // 🔷 WHEN THIS GETS CALLED:
  // - When showing trade execution summaries in Slack
  // - Displays order details, premium, credit, safety rating
  // - Includes interactive buttons for execution
  //
  // 🔷 SAMPLE SLACK CONVERSATIONS THAT USE THIS:
  // User: "execute spx trade"
  // User: "place order for 5960P"
  // Bot: Shows execution summary with Execute/Refresh buttons
  //
  // 🔷 OUTPUT STYLE: Rich Slack blocks with buttons
  //
  order1: {
    slack: {
      // 🔷 ORDER SUMMARY: Complete trade execution details
      summary: (action, quantity, symbol, strike, premium, credit, distance, safety) => ({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*🎯 EXECUTION SUMMARY*\n${action} ${quantity}x ${symbol} ${strike}\n💰 Premium: $${premium}\n📊 Credit: $${credit}\n📏 Distance: ${distance} points from ${symbol.replace(/\d+[CP]$/, '')}\n🛡️ Safety: ${safety}`
            }
          }
        ]
      }),
      // 🔷 EXECUTE BUTTON: Green primary button to execute trade
      executeButton: () => ({
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: '✅ Execute Trade' },
          style: 'primary',
          action_id: 'execute_trade'
        }]
      }),
      // 🔷 REFRESH BUTTON: Neutral button to refresh data
      refreshButton: () => ({
        type: 'actions', 
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: '🔄 Refresh Data' },
          action_id: 'refresh_data'
        }]
      }),
      // 🔷 TRADE ANYWAY BUTTON: Red danger button for risky trades
      tradeAnywayButton: () => ({
        type: 'actions',
        elements: [{
          type: 'button', 
          text: { type: 'plain_text', text: '⚠️ Trade Anyway' },
          style: 'danger',
          action_id: 'trade_anyway'
        }]
      })
    }
  },

  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  // ░░░ SLACK TEMPLATE #4: ORDER STATUS TRACKING ░░░
  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  //
  // 🔷 WHEN THIS GETS CALLED:
  // - When checking order status in Slack: filled, pending, cancelled
  // - Shows summary of all orders with interactive cancel buttons
  // - Real-time order tracking updates
  //
  // 🔷 SAMPLE SLACK CONVERSATIONS THAT USE THIS:
  // User: "order status"
  // User: "check my orders"
  // User: "cancel order 12345"
  //
  // 🔷 OUTPUT STYLE: Sectioned blocks with order details and action buttons
  //
  orderstatus1: {
    slack: {
      sectionBlock: (title, orders) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${title}*\n${orders.length === 0 ? 'None' : orders.map(order => `• ${order.symbol} ${order.side} ${order.quantity} @ $${order.price}`).join('\n')}`
        }
      }),
      summaryBlock: (totalOrders, filled, pending, cancelled) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📊 Summary*\nTotal: ${totalOrders} | ✅ Filled: ${filled} | ⏳ Pending: ${pending} | ❌ Cancelled: ${cancelled}`
        }
      }),
      refreshButton: () => ({
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: '🔄 Refresh Orders' },
          action_id: 'refresh_orders'
        }]
      }),
      cancelOrderButton: (orderId) => ({
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: '❌ Cancel Order' },
          style: 'danger',
          action_id: `cancel_order_${orderId}`
        }]
      })
    }
  },

  // Market data templates - UTILITY ONLY
  marketData: {
    timestamp: (date, timezone = 'America/New_York') => {
      return date.toLocaleString('en-US', {
        timeZone: timezone,
        month: '2-digit',
        day: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    },
    price: (symbol, price, status) => `📈 ${symbol}: $${price.toFixed(2)} (${status})`,
    change: (amount, percent, isPositive) => {
      const arrow = isPositive ? '⬆️' : '⬇️';
      const sign = isPositive ? '+' : '';
      return `${arrow} ${sign}${amount.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
    }
  },

  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  // ░░░ SLACK TEMPLATE #5: HELP & DOCUMENTATION ░░░
  // ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  //
  // 🔷 WHEN THIS GETS CALLED:
  // - When user types "help" in Slack
  // - Shows available commands and strategies
  // - Interactive strategy buttons for quick execution
  //
  // 🔷 SAMPLE SLACK CONVERSATIONS THAT USE THIS:
  // User: "help"
  // User: "what commands are available?"
  // User: "show me SPX strategies"
  //
  // 🔷 OUTPUT STYLE: Categorized command lists with strategy buttons
  //
  help1: {
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
          text: `*${title}*\n${commands.map(cmd => `• \`${cmd.command}\` - ${cmd.description}`).join('\n')}`
        }
      }),
      strategyButton: (label, value, style = 'primary') => ({
        type: 'button',
        text: { type: 'plain_text', text: label },
        style: style,
        action_id: `strategy_${value}`
      })
    }
  },

  // ===== TERMINAL TEMPLATES =====
  
  // ██████████████████████████████████████████████████████████████████████████████
  // ███ TERMINAL TEMPLATE #1: OPTION CHAIN ANALYZER ███
  // ██████████████████████████████████████████████████████████████████████████████
  //
  // 🎯 WHEN THIS GETS CALLED:
  // - When user runs: node option-chain-analyzer.js [dte] [bid]
  // - Searches for specific bid amounts in option chains
  // - Shows context around target bids with surrounding strikes
  //
  // 📝 SAMPLE AI CONVERSATIONS THAT USE THIS:
  // User: "find me .20 bids for monday"
  // User: "show me where the .05 bids are tomorrow" 
  // User: "find nickel puts for today"
  // User: "how far out are the dime bids?"
  // User: "find me 50 cents 3 trading days from now"
  //
  // 🔧 COMMAND EXAMPLES:
  // node option-chain-analyzer.js 1 0.05    # Find $0.05 bids for 1DTE
  // node option-chain-analyzer.js 3 0.10    # Find $0.10 bids for 3DTE  
  // node option-chain-analyzer.js 0 0.50    # Find $0.50 bids for 0DTE
  // node option-chain-analyzer.js 7         # Show bid level summary for 7DTE
  //
  // 💡 OUTPUT STYLE: Context-aware table with surrounding strikes
  //
  optionChainAnalyzer: {
    terminal: {
      // 📊 HEADER: Shows SPX price, DTE, expiration, total puts
      // Called once at the top of every option chain analysis
      header: (spxPrice, dte, expDate, totalPuts) => {
        const dteText = dte === 0 ? '0DTE (today)' : `${dte}DTE`;
        return [
          `📈 SPX: $${spxPrice.toFixed(2)}`,
          `📅 Analyzing ${dteText} options`,
          `📅 Expiration: ${expDate}`,
          `📊 Total puts in chain: ${totalPuts}`
        ].join('\n');
      },
      
      // 🔍 SEARCH HEADER: When no exact bids found, shows "SEARCHING FOR $X BIDS"
      searchHeader: (targetBid) => `🎯 SEARCHING FOR $${targetBid.toFixed(2)} BIDS:`,
      
      // 📋 CONTEXT HEADER: Table header with columns when bids are found
      contextHeader: (targetBid) => `🎯 $${targetBid.toFixed(2)} BIDS WITH SURROUNDING CONTEXT:\nStrike\tBid\tAsk\tDistance\tNote\n${'─'.repeat(54)}`,
      
      // 🔍 NEARBY HEADER: When showing nearby bids instead of exact matches
      nearbyHeader: (targetBid) => `🔍 NEARBY BIDS (closest to $${targetBid.toFixed(2)}):`,
      
      // 📊 CONTEXT ROW: Each row in the context table (strike, bid, ask, distance, note)
      contextRow: (strike, bid, ask, distance, note) => {
        return `${strike}\t$${bid.toFixed(2)}\t$${ask.toFixed(2)}\t${distance} pts\t${note}`;
      },
      
      // 📊 DATA ROW: Simple row without notes (used for nearby bids)
      dataRow: (strike, bid, ask, distance) => {
        return `${strike}\t$${bid.toFixed(2)}\t$${ask.toFixed(2)}\t${distance} pts`;
      },
      
      // ❌ NO RESULTS: When no exact bid matches found
      noResults: (targetBid) => `❌ No exact $${targetBid.toFixed(2)} bids found`,
      
      // ✅ SUMMARY: Shows count and closest strike (REMOVED per user request)
      summary: (count, targetBid, closest) => {
        const lines = [`✅ Found ${count} strikes with $${targetBid.toFixed(2)} bid`];
        if (closest) {
          const distance = Math.round(closest.spot - closest.strike);
          lines.push(`💡 Closest: ${closest.strike} strike (${distance} points out)`);
        }
        return lines.join('\n');
      },
      
      // 📊 BID LEVEL SUMMARY: Used when no specific bid requested (shows all bid levels)
      bidLevelSummary: (bid, count, furthest, spot) => {
        if (count === 0) {
          return `$${bid.toFixed(2)} bids: None found`;
        }
        const distance = Math.round(spot - furthest.strike);
        return `$${bid.toFixed(2)} bids: ${count} strikes, furthest at ${furthest.strike} (${distance} points out)`;
      }
    },
    
    errors: {
      noExpiration: (dte) => `❌ No expiration found for ${dte}DTE`,
      apiError: (message) => `❌ API Error: ${message}`
    }
  },

  // ██████████████████████████████████████████████████████████████████████████████
  // ███ TERMINAL TEMPLATE #2: SPX DEEP PREMIUM SCANNER ███
  // ██████████████████████████████████████████████████████████████████████████████
  //
  // 🎯 WHEN THIS GETS CALLED:
  // - When user runs SQL commands: node spx-deeppremium.js 'WHERE...'
  // - Scans for high-premium options meeting specific criteria
  // - Shows execution summary with recommended trades
  //
  // 📝 SAMPLE AI CONVERSATIONS THAT USE THIS:
  // User: "spx WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300"
  // User: "find me dollar bids way out for tomorrow"
  // User: "show me high premium trades 1DTE at least 300 points out"
  // User: "SQL Example: spx WHERE tradingdays=1 AND minbid>=2.00 AND distance>=5"
  // User: "run a sql command of spx WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300"
  //
  // 🔧 COMMAND EXAMPLES:
  // node spx-deeppremium.js 'WHERE tradingdays=0 AND minbid>=1.50'
  // node spx-deeppremium.js 'WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300'
  // node spx-deeppremium.js 'WHERE tradingdays=3 AND minbid>=0.50 AND distance>=100'
  // node spx-deeppremium.js 'WHERE tradingdays=7 AND minbid>=1.00'
  //
  // 💡 OUTPUT STYLE: Trading-focused with execution summary and safety meter
  //
  spxDeepPremium: {
    terminal: {
      // 📊 HEADER: Shows SPX price, DTE, expiration, and search criteria
      // Called once at the top of every SQL query result
      header: (spxPrice, dte, expDate, dayNote, criteria) => {
        const dteText = dte === 0 ? '0DTE (today)' : `${dte}DTE`;
        return [
          `📈 SPX: $${spxPrice.toFixed(2)}`,
          `📅 Analyzing ${dteText} options`,
          `📅 Expiration: ${expDate} ${dayNote}`,
          `📊 Criteria: ${criteria}`
        ].join('\n');
      },
      
      // 📋 CHAIN HEADER: Table header for option chain results
      chainHeader: () => `📋 OPTION CHAIN:\nStrike  Bid   Ask   Points Out\n──────────────────────────────`,
      
      // 📊 CHAIN ROW: Each option row with strike, bid, ask, distance, and emoji markers
      // Markers: ✅ = qualifies, 💰 = ITM/high premium, 🎯 = target
      chainRow: (strike, bid, ask, distance, marker = '') => {
        const strikeStr = strike.toString().padEnd(6);
        const bidStr = bid.toFixed(2).padStart(5);
        const askStr = ask.toFixed(2).padStart(5);
        const distanceStr = distance.toFixed(0).padStart(4);
        return `${marker} ${strikeStr} ${bidStr} ${askStr} ${distanceStr}`;
      },
      
      // 🎯 EXECUTION HEADER: Header for recommended trade section
      executionHeader: () => '🎯 EXECUTION SUMMARY:',
      
      // 🎯 SELL ORDER: Shows recommended sell order (quantity, symbol, strike)
      sell: (quantity, symbol, strike) => `🎯 SELL ${quantity}x ${symbol} ${strike}P`,
      
      // 💰 PREMIUM: Shows premium per contract
      premium: (amount) => `💰 Premium: $${amount.toFixed(2)}`,
      
      // 📊 CREDIT: Shows total credit (premium × 100)
      credit: (amount) => `📊 Credit: $${amount.toFixed(0)}`,
      
      // 📏 DISTANCE: Shows points away from current SPX price
      distance: (points) => `📏 Distance: ${points.toFixed(0)} points from SPX`,
      
      // 🛡️ SAFETY METER: Risk assessment with emoji and level
      safety: (emoji, level) => `🛡️ Safety Meter: ${emoji} ${level}`,
      
      // ✅ YES: Trade recommendation positive
      yes: () => '✅ YES',
      
      // ❌ NO: Trade recommendation negative
      no: () => '❌ NO'
    }
  },

  // Status templates - UTILITY ONLY
  status: {
    error: (message) => `❌ Error: ${message}`,
    warning: (message) => `⚠️  Warning: ${message}`,
    info: (message) => `ℹ️  Info: ${message}`,
    success: (message) => `✅ Success: ${message}`,
    noData: () => '📭 No data available',
    loading: () => '⏳ Loading...',
    marketClosed: () => '🔒 Market is closed',
    slackError: (message) => ({
      type: 'section',
      text: { type: 'mrkdwn', text: `❌ *Error:* ${message}` }
    }),
    slackWarning: (message) => ({
      type: 'section', 
      text: { type: 'mrkdwn', text: `⚠️ *Warning:* ${message}` }
    })
  },

  // Utility functions
  utils: {
    formatCurrency: (amount, decimals = 2) => `$${amount.toFixed(decimals)}`,
    formatPercent: (value, decimals = 2) => `${value.toFixed(decimals)}%`,
    padNumber: (num, width, char = ' ') => num.toString().padStart(width, char),
    createSeparator: (char = '─', length = 50) => char.repeat(length),
    dateToString: (date, format = 'full') => {
      const options = {
        full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
        short: { month: 'short', day: 'numeric', year: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit', second: '2-digit' }
      };
      return date.toLocaleDateString('en-US', options[format] || options.full);
    },
    getExpirationNote: (expirationDate) => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (expirationDate.toDateString() === today.toDateString()) {
        return '(Today)';
      } else if (expirationDate.toDateString() === tomorrow.toDateString()) {
        return '(Tomorrow)';
      } else {
        return '(Future)';
      }
    }
  }
};

// Template Presets - TERMINAL TEMPLATES AVAILABLE
export const TemplatePresets = {
  // TERMINAL TEMPLATES
  optionChainAnalyzer: SharedTemplates.optionChainAnalyzer,
  spxDeepPremium: SharedTemplates.spxDeepPremium,
  
  // Slack presets remain unchanged
  spxDeepPremiumSlack: {
    slack: ['quote1.slack', 'optionschain1.slack', 'order1.slack']
  },
  orderStatus: {
    slack: ['orderstatus1.slack']
  },
  simpleQuote: {
    slack: ['quote1.slack']
  },
  helpDisplay: {
    slack: ['help1.slack']
  }
};