#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import * as url from 'url';
import { parse } from 'csv-parse/sync';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import yahooFinance from './yahoo-finance-quiet.js';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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
    argv.minDistance = 300;
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
  // Fetch data silently
  let quote, optionInfo;
  try {
    quote = await yahooFinance.quote('^SPX');
    optionInfo = await yahooFinance.options('^SPX');
  } catch (err) {
    throw err;
  }
  
  // Prepare data
  const timestamp = new Date().toLocaleString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: true 
  });
  
  const spot = quote.regularMarketPrice;
  const expiration = optionInfo.expirationDates[argv.expiration];
  const expDate = new Date(expiration);
  const expDateStr = expDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  
  // STRICT TEMPLATE OUTPUT
  console.log('🎯 SPX DEEP PREMIUM SCAN');
  console.log('─────────────────────────');
  console.log(`⏰ Time: ${timestamp}`);
  console.log(`📈 SPX: ${spot.toFixed(2)}`);
  console.log(`📅 Exp: ${expDateStr}`);
  console.log(`🎲 Criteria: ${argv.minDistance}pts/${argv.minPremium.toFixed(2)}bid`);
  console.log('');
  
  // Fetch option chain
  let chain;
  try {
    chain = await yahooFinance.options('^SPX', { date: expiration });
  } catch (err) {
    throw err;
  }
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
  
  // Find OTM strikes with minimum premium (center display around these)
  const premiumStrikes = records.filter(r => 
    r.bid >= argv.minPremium && 
    r.distance_from_spx > 0  // Only OTM puts (below current SPX)
  );
  
  let best = null;
  let bestIndex = -1;
  
  if (premiumStrikes.length > 0) {
    // Sort by highest premium and find best
    premiumStrikes.sort((a, b) => b.bid - a.bid);
    best = premiumStrikes[0];
    bestIndex = allPuts.findIndex(p => p.strike === best.strike);
    
    // Check if any premium strikes meet distance criteria for opportunities
    opportunities.length = 0; // Clear and rebuild based on both criteria
    opportunities.push(...premiumStrikes.filter(r => r.distance_from_spx >= argv.minDistance));
  } else {
    // No premium strikes found, show around target distance area
    const targetStrike = Math.floor((spot - argv.minDistance) / 5) * 5;
    bestIndex = allPuts.findIndex(p => p.strike >= targetStrike);
    if (bestIndex === -1) bestIndex = allPuts.length - 5;
    if (bestIndex < 4) bestIndex = 4;
  }
  
  // RESULTS SECTION
  console.log('📊 RESULTS:');
  if (premiumStrikes.length > 0) {
    console.log(`💰 Premium strikes ($${argv.minPremium.toFixed(2)}+): ${premiumStrikes.length}`);
    console.log(`🎯 Best premium: ${best.strike}P @ ${best.bid.toFixed(2)}`);
    console.log(`📏 Distance: ${best.distance_from_spx.toFixed(0)}pts`);
    
    // Check if best qualifies by distance
    if (best.distance_from_spx >= argv.minDistance) {
      console.log(`✅ Qualifies: >${argv.minDistance}pts + $${argv.minPremium.toFixed(2)}bid`);
    } else {
      console.log(`❌ Too close: Only ${best.distance_from_spx.toFixed(0)}pts (need ${argv.minDistance}pts)`);
    }
  } else {
    console.log(`❌ No strikes with $${argv.minPremium.toFixed(2)}+ premium found`);
  }
  console.log('');
  
  console.log('📋 CHAIN:');
  console.log('Strike  Bid   Ask   Dist');
  console.log('──────────────────────────');
  
  // Show 4 strikes above and below (9 total)
  const startIdx = Math.max(0, bestIndex - 4);
  const endIdx = Math.min(allPuts.length - 1, bestIndex + 4);
  
  for (let i = startIdx; i <= endIdx; i++) {
    const put = allPuts[i];
    const isSelected = best && i === bestIndex;
    const hasPremium = put.bid >= argv.minPremium;
    const hasDistance = put.distance_from_spx >= argv.minDistance;
    const fullyQualifies = hasPremium && hasDistance;
    
    let marker = ' ';
    if (isSelected) marker = '→';
    else if (fullyQualifies) marker = '✅';
    else if (hasPremium) marker = '💰';
    
    console.log(
      `${marker} ${put.strike.toString().padEnd(5)} ` +
      `${put.bid.toFixed(2).padStart(5)} ` +
      `${put.ask.toFixed(2).padStart(5)} ` +
      `${put.distance_from_spx.toFixed(0).padStart(5)}`
    );
  }
  
  // SUGGESTED TRADE SECTION
  console.log('');
  if (opportunities.length > 0) {
    const bestQualified = opportunities.sort((a, b) => b.bid - a.bid)[0];
    console.log('💡 SUGGESTED TRADE:');
    console.log(`   🎯 SELL 1x ${bestQualified.strike}P`);
    console.log(`   💰 Premium: $${bestQualified.bid.toFixed(2)}`);
    console.log(`   📊 Credit: $${(bestQualified.bid * 100).toFixed(0)}`);
    console.log('   ✅ EXECUTION READY');
  } else {
    console.log('💡 SUGGESTED TRADE:');
    console.log('   ⚠️  NO TRADE RECOMMENDED');
    if (premiumStrikes.length > 0) {
      console.log('   📉 Premium found but too close to SPX');
    } else {
      console.log('   📉 No premium strikes found');
    }
    console.log('   🔄 Try different parameters');
  }
  console.log('');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});