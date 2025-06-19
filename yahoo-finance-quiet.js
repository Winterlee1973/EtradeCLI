#!/usr/bin/env node

/**
 * Wrapper for yahoo-finance2 that suppresses all debug output
 */

import yahooFinance from 'yahoo-finance2';

// Suppress all notices
yahooFinance.suppressNotices(['yahooSurvey']);

// Store original console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// Patterns to suppress
const suppressPatterns = [
  /fetching crumb/i,
  /fetching cookies/i,
  /cookie expires/i,
  /new crumb/i,
  /success\. cookie/i,
  /fetch.*getcrumb/i,
  /we expected a redirect to guce\.yahoo\.com/i,
  /we'll try to continue anyway/i
];

// Override console methods to filter messages
const filterConsole = (originalMethod) => {
  return (...args) => {
    const message = args.join(' ').toLowerCase();
    const shouldSuppress = suppressPatterns.some(pattern => pattern.test(message));
    if (!shouldSuppress) {
      originalMethod.apply(console, args);
    }
  };
};

console.log = filterConsole(originalLog);
console.error = filterConsole(originalError);
console.warn = filterConsole(originalWarn);

// Export the quiet version
export default yahooFinance;
export { yahooFinance };