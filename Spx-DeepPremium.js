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

// Market holidays for 2025 (US stock market)
function isMarketHoliday(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JS months are 0-indexed
  const day = date.getDate();
  
  // 2025 market holidays
  const holidays2025 = [
    '1/1',   // New Year's Day
    '1/20',  // MLK Day
    '2/17',  // Presidents Day
    '4/18',  // Good Friday
    '5/26',  // Memorial Day
    '6/19',  // Juneteenth
    '7/4',   // Independence Day
    '9/1',   // Labor Day
    '11/27', // Thanksgiving
    '12/25'  // Christmas
  ];
  
  if (year === 2025) {
    const dateStr = `${month}/${day}`;
    return holidays2025.includes(dateStr);
  }
  
  return false; // No holiday data for other years
}


// ----------------- CLI -----------------
const argv = yargs(hideBin(process.argv))
  .command('0', 'Scan 0DTE (same day expiration)', {}, (argv) => {
    argv.expiration = 0;
    argv.minDistance = 200;
    argv.minPremium = 0.80;
    argv.strategy = '0dte';
  })
  .command('1', 'Scan next trading day (1DTE)', {}, (argv) => {
    argv.expiration = 1;
    argv.minDistance = 300;
    argv.minPremium = 2.00;
    argv.strategy = '1dte';
  })
  .option('min-distance', { type: 'number', describe: 'Minimum distance from SPX (points)' })
  .option('min-premium', { type: 'number', describe: 'Minimum bid premium' })
  .option('target-bid', { type: 'number', describe: 'Target bid amount to find closest strike' })
  .option('expiration', { type: 'number', describe: 'Expiration index (0 = today, 1 = tomorrow)' })
  .example('$0 0', 'Scan 0DTE (200 points, $0.80 bid)')
  .example('$0 1', 'Scan 1DTE (300 points, $2.00 bid)')
  .example('$0 --min-distance 300 --min-premium 1.50', 'Custom parameters')
  .argv;

// Set defaults if not using commands
if (!argv.strategy) {
  argv.minDistance = argv.minDistance || 300;
  argv.minPremium = argv.minPremium || 2.00;
  argv.expiration = argv.expiration !== undefined ? argv.expiration : 1;
  argv.strategy = '1dte';
}

async function main() {
  // Check market hours (EST/EDT)
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const currentHour = easternTime.getHours();
  const currentMinute = easternTime.getMinutes();
  const currentTime = currentHour * 100 + currentMinute; // HHMM format
  
  // Market hours: 9:30 AM - 4:00 PM EST/EDT (930 - 1600)
  const isWeekend = easternTime.getDay() === 0 || easternTime.getDay() === 6;
  const isMarketHours = currentTime >= 930 && currentTime <= 1600;
  
  // Show market status but continue with scan
  const marketStatus = (isWeekend || !isMarketHours) ? 'CLOSED' : 'OPEN';
  
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
  
  // Find the right expiration date, skipping weekends
  let expiration, expDate;
  if (argv.expiration === 0) {
    // 0DTE - check if today has an expiration and if market is open
    const today = new Date();
    const todayStr = today.toDateString();
    
    // Look for today's expiration in the available dates
    let foundToday = false;
    for (let i = 0; i < optionInfo.expirationDates.length; i++) {
      const testExp = optionInfo.expirationDates[i];
      const utcDate = new Date(testExp);
      const properDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
      
      if (properDate.toDateString() === todayStr) {
        expiration = testExp;
        expDate = properDate;
        foundToday = true;
        break;
      }
    }
    
    // If no same-day expiration found, show message and exit
    if (!foundToday) {
      console.log('🎯 SPX DEEP PREMIUM SCAN');
      console.log('─────────────────────────');
      console.log(`⏰ Time: ${timestamp}`);
      console.log(`📈 SPX: ${spot.toFixed(2)} (${marketStatus})`);
      console.log(`📅 0DTE: No same-day expiration available`);
      console.log('');
      console.log('💡 SUGGESTED TRADE:');
      console.log('   ❌ NO');
      console.log('');
      return;
    }
    
    // If market is closed, show message and exit
    if (marketStatus === 'CLOSED') {
      console.log('🎯 SPX DEEP PREMIUM SCAN');
      console.log('─────────────────────────');
      console.log(`⏰ Time: ${timestamp}`);
      console.log(`📈 SPX: ${spot.toFixed(2)} (${marketStatus})`);
      console.log(`📅 0DTE: Market closed`);
      console.log('');
      console.log('💡 SUGGESTED TRADE:');
      console.log('   ❌ NO');
      console.log('');
      return;
    }
  } else {
    // 1DTE - find next trading day's expiration  
    // Start from index 0 since it could be tomorrow's expiration
    for (let i = 0; i < optionInfo.expirationDates.length; i++) {
      const testExp = optionInfo.expirationDates[i];
      const utcDate = new Date(testExp);
      const properDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
      
      // Skip weekends and holidays, and only use dates after today
      if (properDate > new Date() && properDate.getDay() !== 0 && properDate.getDay() !== 6 && !isMarketHoliday(properDate)) {
        expiration = testExp;
        expDate = properDate;
        break;
      }
    }
    // Fallback if no weekday found
    if (!expiration) {
      expiration = optionInfo.expirationDates[argv.expiration];
      expDate = new Date(expiration);
    }
  }
  
  const expDateStr = expDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  
  // Check if this is actually tomorrow or a different day due to holidays
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = expDate.toDateString() === tomorrow.toDateString();
  const dayNote = isTomorrow ? '(Tomorrow)' : '(Next Trading Day)';
  
  // STRICT TEMPLATE OUTPUT
  const isAutoScheduled = process.env.AUTO_SCHEDULED === 'true';
  const commandStr = isAutoScheduled ? 
    `spx ${argv.expiration}${argv.targetBid ? ` ${argv.targetBid}` : ''}` : 
    `spx ${argv.expiration}${argv.targetBid ? ` ${argv.targetBid}` : ''}`;
  
  console.log(`🎯 SPX DEEP PREMIUM SCAN${isAutoScheduled ? ' - Auto Scheduled' : ''}`);
  console.log('─────────────────────────');
  console.log(`🤖 Command: ${commandStr}`);
  console.log(`⏰ Time: ${timestamp}`);
  console.log(`📈 SPX: ${spot.toFixed(2)} (${marketStatus})`);
  console.log(`📅 Exp: ${expDateStr} ${argv.strategy === '1dte' ? dayNote : ''}`);
  if (argv.targetBid) {
    console.log(`🎯 Target: $${argv.targetBid.toFixed(2)} bid`);
  } else {
    console.log(`🎲 Criteria: ${argv.minDistance}pts/${argv.minPremium.toFixed(2)}bid`);
  }
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
  
  // Handle target bid mode vs regular scanning
  let best = null;
  let bestIndex = -1;
  
  if (argv.targetBid) {
    // TARGET BID MODE: Find lowest strike with exact target bid amount
    const targetBid = argv.targetBid;
    
    // Find all puts with exact target bid, then pick lowest strike
    const exactMatches = records.filter(put => put.bid === targetBid);
    
    if (exactMatches.length > 0) {
      // Sort by strike and take the lowest (first)
      exactMatches.sort((a, b) => a.strike - b.strike);
      best = exactMatches[0];
      bestIndex = allPuts.findIndex(p => p.strike === best.strike);
      
      // In target bid mode, the "opportunity" is the exact match
      opportunities.push(best);
    } else {
      // Fallback: if no exact match, find closest bid amount
      let closestPut = null;
      let smallestDiff = Infinity;
      
      records.forEach(put => {
        if (put.bid > 0) {
          const diff = Math.abs(put.bid - targetBid);
          if (diff < smallestDiff) {
            smallestDiff = diff;
            closestPut = put;
          }
        }
      });
      
      if (closestPut) {
        best = closestPut;
        bestIndex = allPuts.findIndex(p => p.strike === closestPut.strike);
        opportunities.push(closestPut);
      }
    }
  } else {
    // REGULAR MODE: Find strikes with minimum premium
    const premiumStrikes = records.filter(r => 
      r.bid >= argv.minPremium && 
      r.distance_from_spx > 0  // Only OTM puts (below current SPX)
    );
    
    if (premiumStrikes.length > 0) {
      // Sort by highest premium and find best
      premiumStrikes.sort((a, b) => b.bid - a.bid);
      best = premiumStrikes[0];
      
      // Center display around the target distance area where we expect to find qualifying strikes
      const targetStrike = Math.floor((spot - argv.minDistance) / 5) * 5;
      bestIndex = allPuts.findIndex(p => p.strike >= targetStrike);
      if (bestIndex === -1) bestIndex = allPuts.length - 5;
      if (bestIndex < 4) bestIndex = 4;
      
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
  }
  
  
  console.log('📋 CHAIN:');
  console.log('Strike  Bid   Ask   Dist');
  console.log('──────────────────────────');
  
  // Show 4 strikes above and below (9 total)
  const startIdx = Math.max(0, bestIndex - 4);
  const endIdx = Math.min(allPuts.length - 1, bestIndex + 4);
  
  for (let i = startIdx; i <= endIdx; i++) {
    const put = allPuts[i];
    let marker = ' ';
    
    if (argv.targetBid) {
      // TARGET BID MODE: Mark the closest match
      if (best && put.strike === best.strike) {
        marker = '🎯';
      }
    } else {
      // REGULAR MODE: Mark based on criteria
      const hasPremium = put.bid >= argv.minPremium;
      const hasDistance = put.distance_from_spx >= argv.minDistance;
      const fullyQualifies = hasPremium && hasDistance;
      
      if (fullyQualifies) marker = '✅';
      else if (hasPremium) marker = '💰';
    }
    
    console.log(
      `${marker} ${put.strike.toString().padEnd(5)} ` +
      `${put.bid.toFixed(2).padStart(5)} ` +
      `${put.ask.toFixed(2).padStart(5)} ` +
      `${put.distance_from_spx.toFixed(0).padStart(5)}`
    );
  }
  
  // TRADE SECTION
  console.log('');
  if (opportunities.length > 0) {
    const bestQualified = opportunities.sort((a, b) => b.bid - a.bid)[0];
    console.log(`🎯 SELL 1x ${bestQualified.strike}P`);
    console.log(`💰 Premium: $${bestQualified.bid.toFixed(2)}`);
    console.log(`📊 Credit: $${(bestQualified.bid * 100).toFixed(0)}`);
    console.log(`📏 Distance: ${bestQualified.distance_from_spx.toFixed(0)} points`);
    
    // Add Safety Meter based on distance
    const distance = bestQualified.distance_from_spx;
    let safetyLevel, safetyEmoji;
    
    if (distance >= 300) {
      safetyLevel = 'Extremely Safe';
      safetyEmoji = '🟢🟢🟢';
    } else if (distance >= 200) {
      safetyLevel = 'Very Safe';
      safetyEmoji = '🟢🟢';
    } else if (distance >= 100) {
      safetyLevel = 'Somewhat Safe';
      safetyEmoji = '🟡';
    } else {
      safetyLevel = 'Risky';
      safetyEmoji = '🔴';
    }
    
    console.log(`🛡️  Safety Meter: ${safetyEmoji} ${safetyLevel}`);
    
    // Only show YES/NO for regular scanning, not target bid mode
    if (!argv.targetBid) {
      console.log('✅ YES');
    }
  } else {
    if (!argv.targetBid) {
      console.log('❌ NO');
    }
  }
  console.log('');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});