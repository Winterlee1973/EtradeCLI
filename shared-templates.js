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
      header: () => '📋 OPTION CHAIN:\nStrike  Bid   Ask   Dist\n──────────────────────────',
      
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
        let table = '```\nStrike   Bid   Ask  Dist\n─────────────────────────\n';
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
  }
};

// Template presets for common strategy types
export const TemplatePresets = {
  // SPX Deep Premium Strategy (uses quote1 + optionschain1 + order1)
  spxDeepPremium: {
    templates: ['quote1', 'optionschain1', 'order1'],
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
  
};