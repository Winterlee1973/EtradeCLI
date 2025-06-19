#!/usr/bin/env node

/**
 * Slack-specific formatting utilities
 * Converts terminal output to Slack-friendly format
 */

import { SharedTemplates } from './shared-templates.js';

export function formatForSlack(terminalOutput) {
  // Check if this is SPX Deep Premium output
  if (terminalOutput.includes('SPX DEEP PREMIUM SCAN')) {
    return formatSPXForSlack(terminalOutput);
  }
  
  // Replace box drawing characters with simple alternatives for better Slack display
  let formatted = terminalOutput
    .replace(/│/g, '|')  // Replace box drawing vertical
    .replace(/┼/g, '+')  // Replace box drawing cross
    .replace(/────────/g, '--------')  // Replace box drawing horizontal
    
  // Make key sections more Slack-friendly
  formatted = formatted
    .replace(/📊 OPTION CHAIN:/g, '*📊 OPTION CHAIN:*')
    .replace(/🎯 EXECUTION SUMMARY:/g, '*🎯 EXECUTION SUMMARY:*')
    .replace(/🎯 EXECUTION READY:/g, '*🎯 EXECUTION READY:*')
    .replace(/🎯 ORDER PREVIEW:/g, '*🎯 ORDER PREVIEW:*')
    .replace(/🔍 FOUND:/g, '*🔍 FOUND:*')
    
  // Wrap in code block for monospace formatting
  return '```\n' + formatted + '\n```';
}

export function formatSPXForSlack(terminalOutput) {
  if (!terminalOutput || typeof terminalOutput !== 'string') {
    console.error('Invalid terminal output for Slack formatting:', terminalOutput);
    return { blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Error: Invalid scan output' } }] };
  }
  
  console.log('🔍 Parsing SPX output for Slack:', terminalOutput.substring(0, 200) + '...');
  
  const lines = terminalOutput.split('\n');
  let header = {};
  let chainData = [];
  let tradeData = {};
  let noExpiration = false;
  let fullHeaderTitle = null;
  
  // Parse the output
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || typeof line !== 'string') continue;
    
    const trimmedLine = line.trim();
    
    // Capture the full header with Manual/Auto Scheduled and command
    if (trimmedLine.includes('🎯 SPX DEEP PREMIUM SCAN:')) {
      fullHeaderTitle = trimmedLine.replace('🎯 ', '');
    } else if (trimmedLine.includes('Time:')) {
      header.time = trimmedLine.replace('⏰ Time: ', '');
    } else if (trimmedLine.includes('SPX:')) {
      header.spx = trimmedLine.replace('📈 SPX: ', '');
    } else if (trimmedLine.includes('Exp:')) {
      header.exp = trimmedLine.replace('📅 Exp: ', '');
    } else if (trimmedLine.includes('0DTE: No same-day expiration available')) {
      header.exp = '0DTE: No same-day expiration available';
      noExpiration = true;
    } else if (trimmedLine.includes('0DTE: Market closed')) {
      header.exp = '0DTE: Market closed';
      noExpiration = true;
    } else if (trimmedLine.includes('🎯 Target:')) {
      header.criteria = trimmedLine.replace('🎯 Target: ', '');
    } else if (trimmedLine.includes('🎲 Criteria:')) {
      header.criteria = trimmedLine.replace('🎲 Criteria: ', '');
    } else if (trimmedLine.includes('🎯 SELL 1x')) {
      tradeData.sell = trimmedLine.replace('🎯 ', '');
    } else if (trimmedLine.includes('💰 Premium:')) {
      tradeData.premium = trimmedLine.replace('💰 Premium: ', '');
    } else if (trimmedLine.includes('📊 Credit:')) {
      tradeData.credit = trimmedLine.replace('📊 Credit: ', '');
    } else if (trimmedLine.includes('📏 Distance:')) {
      tradeData.distance = trimmedLine.replace('📏 Distance: ', '');
    } else if (trimmedLine.includes('🛡️  Safety Meter:')) {
      tradeData.safety = trimmedLine.replace('🛡️  Safety Meter: ', '');
    } else if (trimmedLine.includes('❌ NO')) {
      tradeData.noTrade = true;
    } else if (trimmedLine.match(/^\s*[🎯✅💰 ]*\s*\d{4}/)) {
      // Parse chain data - handle indented lines with or without markers
      const cleanLine = line.trim();
      const parts = cleanLine.split(/\s+/);
      if (parts.length >= 4) {
        // Check if first part is a marker or strike
        let marker = ' ';
        let startIndex = 0;
        
        if (parts[0].match(/[🎯✅💰]/)) {
          marker = parts[0];
          startIndex = 1;
        }
        
        if (parts[startIndex] && parts[startIndex].match(/^\d{4}/)) {
          chainData.push({
            marker: marker,
            strike: parts[startIndex],
            bid: parts[startIndex + 1] || '0.00',
            ask: parts[startIndex + 2] || '0.00',
            dist: parts[startIndex + 3] || '0'
          });
        }
      }
    }
  }
  
  // Handle no expiration case
  if (noExpiration) {
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎯 SPX Deep Premium Scan - 0DTE'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*📈 SPX:* ${header.spx}`
            },
            {
              type: 'mrkdwn',
              text: `*⏰ Time:* ${header.time}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📅 ${header.exp}*`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*❌ NO TRADE AVAILABLE*'
          }
        }
      ]
    };
  }
  
  // Use the full header title if captured, otherwise build it
  let headerTitle = fullHeaderTitle || '🎯 SPX Deep Premium Scan';
  if (!fullHeaderTitle && header.criteria) {
    if (header.criteria.includes('Target:')) {
      headerTitle += ` - 1DTE ${header.criteria}`;
    } else if (header.criteria.includes('pts/')) {
      // Regular scan format like "300pts/2.00bid"
      const isDTE = header.criteria.includes('200pts') ? '0DTE' : '1DTE';
      headerTitle += ` - ${isDTE}`;
    }
  }
  
  // Find target strike info for top section
  let targetStrike = null;
  if (chainData.length > 0) {
    targetStrike = chainData.find(row => row.marker === '🎯');
  }
  
  // Create rich Slack blocks
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: headerTitle
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*📈 SPX:* ${header.spx}`
        },
        {
          type: 'mrkdwn',
          text: `*⏰ Time:* ${header.time}`
        }
      ]
    }
  ];
  
  // Add target info row if we have a target strike
  if (targetStrike) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🎯 Target:* ${targetStrike.strike}P @ $${targetStrike.bid}`
      }
    });
  }
  
  // Add distance as separate row if target found
  if (targetStrike) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📏 Distance:* ${targetStrike.dist} points from current SPX`
      }
    });
  }
  
  // Add chain data
  if (chainData.length > 0) {
    let chainHeader = '*📋 OPTION CHAIN*';
    if (header.exp) {
      chainHeader += ` - *📅 ${header.exp}*`;
    }
    let chainText = chainHeader + '\n```';
    chainText += 'Strike   Bid   Ask  Dist\n';
    chainText += '─────────────────────────\n';
    
    chainData.forEach(row => {
      const marker = row.marker === '🎯' ? '→' : row.marker === '✅' ? '✓' : row.marker === '💰' ? '$' : ' ';
      const lineText = `${marker} ${row.strike.padEnd(6)} ${row.bid.padStart(5)} ${row.ask.padStart(5)} ${row.dist.padStart(4)}`;
      chainText += `${lineText}\n`;
    });
    chainText += '```';
    
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: chainText
      }
    });
  }
  
  // Add trade recommendation or no trade message
  console.log('🎯 Trade data found:', tradeData);
  
  blocks.push({
    type: 'divider'
  });
  
  if (tradeData.sell) {
    // Trade recommended
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🎯 ${tradeData.sell}*\nPremium: ${tradeData.premium} | Credit: ${tradeData.credit}\nDistance: ${tradeData.distance}${tradeData.safety ? ` | Safety: ${tradeData.safety}` : ''}`
      }
    });
    
    // Add action buttons with timestamp
    const now = new Date();
    const timestamp = now.getTime();
    
    blocks.push({
      type: 'actions',
      block_id: `trade_buttons_${timestamp}`,
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '⚡ Execute Trade'
          },
          style: 'primary',
          action_id: 'execute_trade',
          value: timestamp.toString()
        },
        {
          type: 'button', 
          text: {
            type: 'plain_text',
            text: '🔄 Refresh Scan'
          },
          action_id: 'refresh_scan'
        }
      ]
    });
  } else {
    // No trade recommended
    const criteriaText = header.criteria || '300pts/2.00bid';
    const minPremium = criteriaText.match(/(\d+\.?\d*)bid/) ? criteriaText.match(/(\d+\.?\d*)bid/)[1] : '2.00';
    
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*❌ Trade Not Recommended*\n$${minPremium} premium not obtained`
      }
    });
    
    // Add Trade Anyway and Refresh buttons
    const now = new Date();
    const timestamp = now.getTime();
    
    blocks.push({
      type: 'actions',
      block_id: `no_trade_buttons_${timestamp}`,
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '⚠️ Trade Anyway'
          },
          style: 'danger',
          action_id: 'trade_anyway',
          value: timestamp.toString()
        },
        {
          type: 'button', 
          text: {
            type: 'plain_text',
            text: '🔄 Refresh Scan'
          },
          action_id: 'refresh_scan'
        }
      ]
    });
  }
  
  return {
    blocks: blocks
  };
}

export function formatQuoteForSlack(terminalOutput) {
  // For quotes, use a more conversational format instead of code blocks
  const lines = terminalOutput.split('\n');
  
  if (lines.length >= 3) {
    const company = lines[0].replace('📊 ', '');
    const price = lines[1].replace('💰 ', '');
    const change = lines[2];
    const time = lines[3] ? lines[3].replace('📅 ', '') : '';
    
    return `*${company}*\n${price}\n${change}${time ? `\n_Updated: ${time}_` : ''}`;
  }
  
  // Fallback to code block if parsing fails
  return '```\n' + terminalOutput + '\n```';
}