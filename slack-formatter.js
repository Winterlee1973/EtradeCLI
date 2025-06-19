#!/usr/bin/env node

/**
 * Slack-specific formatting utilities
 * Converts terminal output to Slack-friendly format
 */

export function formatForSlack(terminalOutput) {
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