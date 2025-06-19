#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import * as url from 'url';
import { parse } from 'csv-parse/sync';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import yahooFinance from 'yahoo-finance2';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Suppress Yahoo Finance notices and debug output
yahooFinance.suppressNotices(['yahooSurvey']);

// Redirect console output temporarily to suppress cookie/crumb messages
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// ----------------- CLI -----------------
const argv = yargs(hideBin(process.argv))
  .command('today', 'Scan today\'s expiration (0DTE)', {}, (argv) => {
    argv.expiration = 0;
    argv.minDistance = 200;
    argv.minPremium = 0.80;
    argv.strategy = 'today';
  })
  .command('tomorrow', 'Scan tomorrow\'s expiration (1DTE)', {}, (argv) => {
    argv.expiration = 1;
    argv.minDistance = 350;
    argv.minPremium = 2.00;
    argv.strategy = 'tomorrow';
  })
  .option('min-distance', { type: 'number', describe: 'Minimum distance from SPX (points)' })
  .option('min-premium', { type: 'number', describe: 'Minimum bid premium' })
  .option('expiration', { type: 'number', describe: 'Expiration index (0 = today, 1 = tomorrow)' })
  .example('$0 today', 'Scan today (200 points, $0.80 bid)')
  .example('$0 tomorrow', 'Scan tomorrow (350 points, $2.00 bid)')
  .example('$0 --min-distance 300 --min-premium 1.50', 'Custom parameters')
  .argv;

// Set defaults if not using commands
if (!argv.strategy) {
  argv.minDistance = argv.minDistance || 300;
  argv.minPremium = argv.minPremium || 2.00;
  argv.expiration = argv.expiration !== undefined ? argv.expiration : 1;
}

async function main() {
  // Temporarily suppress console output during Yahoo Finance operations
  console.log = () => {};
  console.error = () => {};
  
  // Fetch data silently
  let quote, optionInfo;
  try {
    quote = await yahooFinance.quote('^SPX');
    optionInfo = await yahooFinance.options('^SPX');
  } catch (err) {
    // Restore console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    throw err;
  }
  
  // Restore console output
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  
  // Display timestamp
  console.log(`📅 Timestamp: ${new Date().toLocaleString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: true 
  })}\n`);

  // Show strategy
  if (argv.strategy) {
    const strategyName = argv.strategy === 'today' ? 'TODAY (0DTE)' : 'TOMORROW (1DTE)';
    console.log(`🎯 Strategy: ${strategyName}`);
    console.log(`   Criteria: ${argv.minDistance}+ points out, $${argv.minPremium.toFixed(2)}+ bid\n`);
  }

  // 1) Use already fetched quote
  const spot = quote.regularMarketPrice;
  console.log(`🎯 Current SPX: $${spot.toFixed(2)}\n`);
  
  // 2) Use already fetched option info
  const expiration = optionInfo.expirationDates[argv.expiration];
  const expDate = new Date(expiration * 1000);
  const expDateStr = expDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  console.log(`📅 Searching expiration: ${expDateStr}\n`);
  
  // Suppress console output again for chain fetch
  console.log = () => {};
  console.error = () => {};
  
  let chain;
  try {
    chain = await yahooFinance.options('^SPX', { date: expiration });
  } catch (err) {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    throw err;
  }
  
  // Restore console output
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  const puts = chain.options[0].puts;
  
  // Convert Yahoo data to our format
  const records = puts.map(put => ({
    strike: put.strike,
    bid: put.bid || 0,
    ask: put.ask || 0,
    lastPrice: put.lastPrice || 0,
    volume: put.volume || 0,
    openInterest: put.openInterest || 0,
    impliedVolatility: (put.impliedVolatility || 0) * 100,
    distance_from_spx: spot - put.strike
  }));
  
  // 3) Filter for deep OTM opportunities
  const opportunities = records.filter(r => 
    r.distance_from_spx >= argv.minDistance && 
    r.bid >= argv.minPremium
  );
  
  // Sort all puts by strike for grid display
  const allPuts = records.sort((a, b) => a.strike - b.strike);
  
  // Find best opportunity (highest premium if any)
  let best = null;
  let bestIndex = -1;
  
  // POTENTIAL ORDER SUMMARY
  console.log('🎯 EXECUTION SUMMARY:');
  if (opportunities.length > 0) {
    opportunities.sort((a, b) => b.bid - a.bid);
    best = opportunities[0];
    bestIndex = allPuts.findIndex(p => p.strike === best.strike);
    console.log(`✅ FOUND: ${opportunities.length} qualifying opportunities`);
    console.log(`💰 BEST: ${best.strike}P @ $${best.bid.toFixed(2)} (${best.distance_from_spx.toFixed(0)} pts out)`);
    console.log(`💵 CREDIT: $${(best.bid * 100).toFixed(0)} per contract\n`);
  } else {
    console.log(`❌ NONE: No opportunities meet criteria`);
    console.log(`   📏 Min distance: ${argv.minDistance} points out`);
    console.log(`   💎 Min premium: $${argv.minPremium.toFixed(2)} bid\n`);
    
    // Still show grid around reasonable strikes for context
    const targetStrike = Math.floor((spot - argv.minDistance) / 5) * 5; // Round to nearest 5
    bestIndex = allPuts.findIndex(p => p.strike >= targetStrike);
    if (bestIndex === -1) bestIndex = allPuts.length - 6; // Show strikes near the bottom
    if (bestIndex < 5) bestIndex = 5; // Ensure we can show 5 above
  }
  
  console.log('📊 OPTION CHAIN:');
  console.log('Strike  │ Bid    │ Ask    │ Last   │ Volume │ Distance │ Status');
  console.log('────────┼────────┼────────┼────────┼────────┼──────────┼────────');
  
  // Show 5 strikes above and below
  const startIdx = Math.max(0, bestIndex - 5);
  const endIdx = Math.min(allPuts.length - 1, bestIndex + 5);
  
  for (let i = startIdx; i <= endIdx; i++) {
    const put = allPuts[i];
    const isSelected = best && i === bestIndex;
    const isMatch = opportunities.some(opp => opp.strike === put.strike);
    const status = isSelected ? '🎯 BEST' : isMatch ? '✅ QUAL' : '';
    console.log(
      `${put.strike.toString().padEnd(7)} │ ` +
      `${put.bid.toFixed(2).padStart(6)} │ ` +
      `${put.ask.toFixed(2).padStart(6)} │ ` +
      `${(put.lastPrice || 0).toFixed(2).padStart(6)} │ ` +
      `${put.volume.toString().padStart(6)} │ ` +
      `${put.distance_from_spx.toFixed(0).padStart(8)} │ ` +
      status
    );
  }
  
  if (best) {
    console.log(`\n🎯 EXECUTION READY:`);
    console.log(`   📍 Strike: ${best.strike}P (${best.distance_from_spx.toFixed(0)} pts below SPX)`);
    console.log(`   💰 Premium: $${best.bid.toFixed(2)} bid`);
    console.log(`   💵 Credit: $${(best.bid * 100).toFixed(0)} per contract`);
    console.log(`   📊 Volume: ${best.volume.toLocaleString()} contracts`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});