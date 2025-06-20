#!/usr/bin/env node

/**
 * Simplified Shared Templates for EtradeCLI
 * TERMINAL: Only Option Chain Analyzer template allowed
 * SLACK: All templates preserved for Slack bot functionality
 */

export const SharedTemplates = {
  // Quote templates - SLACK ONLY
  quote1: {
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

  // Option chain templates - SLACK ONLY  
  optionschain1: {
    slack: {
      header: (expiration, note = '') => ({
        type: 'section',
        text: {
          type: 'mrkdwn', 
          text: `*📋 OPTION CHAIN*\n*Expiration:* ${expiration} ${note}`
        }
      }),
      table: (rows) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '```\nStrike  Bid   Ask   Points Out\n' + '─'.repeat(30) + '\n' + rows.join('\n') + '\n```'
        }
      }),
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

  // Order templates - SLACK ONLY
  order1: {
    slack: {
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
      executeButton: () => ({
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: '✅ Execute Trade' },
          style: 'primary',
          action_id: 'execute_trade'
        }]
      }),
      refreshButton: () => ({
        type: 'actions', 
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: '🔄 Refresh Data' },
          action_id: 'refresh_data'
        }]
      }),
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

  // Order status templates - SLACK ONLY
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

  // Help templates - SLACK ONLY
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

  // ===== ONLY TERMINAL TEMPLATE ALLOWED =====
  // Option Chain Analyzer - THE ONLY TERMINAL TEMPLATE
  optionChainAnalyzer: {
    terminal: {
      header: (spxPrice, dte, expDate, totalPuts) => {
        const dteText = dte === 0 ? '0DTE (today)' : `${dte}DTE`;
        return [
          `📈 SPX: $${spxPrice.toFixed(2)}`,
          `📅 Analyzing ${dteText} options`,
          `📅 Expiration: ${expDate}`,
          `📊 Total puts in chain: ${totalPuts}`
        ].join('\n');
      },
      
      searchHeader: (targetBid) => `🎯 SEARCHING FOR $${targetBid.toFixed(2)} BIDS:`,
      
      contextHeader: (targetBid) => `🎯 $${targetBid.toFixed(2)} BIDS WITH SURROUNDING CONTEXT:\nStrike\tBid\tAsk\tDistance\tNote\n${'─'.repeat(54)}`,
      
      nearbyHeader: (targetBid) => `🔍 NEARBY BIDS (closest to $${targetBid.toFixed(2)}):`,
      
      contextRow: (strike, bid, ask, distance, note) => {
        return `${strike}\t$${bid.toFixed(2)}\t$${ask.toFixed(2)}\t${distance} pts\t${note}`;
      },
      
      dataRow: (strike, bid, ask, distance) => {
        return `${strike}\t$${bid.toFixed(2)}\t$${ask.toFixed(2)}\t${distance} pts`;
      },
      
      noResults: (targetBid) => `❌ No exact $${targetBid.toFixed(2)} bids found`,
      
      summary: (count, targetBid, closest) => {
        const lines = [`✅ Found ${count} strikes with $${targetBid.toFixed(2)} bid`];
        if (closest) {
          const distance = Math.round(closest.spot - closest.strike);
          lines.push(`💡 Closest: ${closest.strike} strike (${distance} points out)`);
        }
        return lines.join('\n');
      },
      
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

// Template Presets - ONLY OPTION CHAIN ANALYZER FOR TERMINAL
export const TemplatePresets = {
  // ALL TERMINAL OUTPUT USES OPTION CHAIN ANALYZER
  optionChainAnalyzer: SharedTemplates.optionChainAnalyzer,
  
  // Slack presets remain unchanged
  spxDeepPremium: {
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