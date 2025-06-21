#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import * as url from 'url';
import { parse } from 'csv-parse/sync';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import yahooFinance from './yahoo-finance-quiet.js';
import { SharedTemplates } from './shared-templates.js';
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
// NEW SQL-LIKE QUERY FORMAT: 
// spx WHERE tradingdays=1 AND minbid>2.00 AND distance=300
// spx WHERE tradingdays=0 AND minbid>=1.50 AND distance<=250  
// spx WHERE tradingdays=1 AND minbid BETWEEN 1.00 AND 3.00 AND distance>200
function parseSpxCommand(args) {
  const commandText = args.join(' ');
  
  // Check if it's the new SQL format
  if (commandText.toUpperCase().includes('WHERE')) {
    return parseSQLQuery(commandText);
  }
  
  // Fallback to old format for backward compatibility
  return parseOldFormat(args);
}

function parseSQLQuery(query) {
  console.log('🔍 DEBUG: parseSQLQuery input:', query);
  
  // Decode HTML entities that might come from Slack
  const decodedQuery = query
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  console.log('🔍 DEBUG: after HTML decode:', decodedQuery);
  
  const params = {
    expiration: null,
    minPremium: null,
    maxPremium: null,
    minDistance: null,
    maxDistance: null,
    strategy: null,
    queryType: 'sql'
  };
  
  // Extract WHERE clause
  const whereMatch = decodedQuery.match(/WHERE\s+(.+)/i);
  if (!whereMatch) {
    console.log('🔍 DEBUG: No WHERE match found');
    showSQLHelp();
    process.exit(1);
  }
  
  const whereClause = whereMatch[1];
  console.log('🔍 DEBUG: WHERE clause:', whereClause);
  
  // Parse conditions using regex to properly handle AND separators
  // This regex splits on AND but not when it's part of BETWEEN...AND
  const conditions = [];
  let remaining = whereClause;
  let inBetween = false;
  
  // First pass: identify BETWEEN clauses to protect them
  const betweenRegex = /(\w+\s+BETWEEN\s+[\d.]+\s+AND\s+[\d.]+)/gi;
  const betweenClauses = [];
  let match;
  
  while ((match = betweenRegex.exec(whereClause)) !== null) {
    betweenClauses.push(match[1]);
  }
  
  // Replace BETWEEN clauses with placeholders
  betweenClauses.forEach((clause, index) => {
    remaining = remaining.replace(clause, `__BETWEEN_${index}__`);
  });
  
  // Split on AND (now safe since BETWEEN...AND is protected)
  const parts = remaining.split(/\s+AND\s+/i);
  
  // Restore BETWEEN clauses
  parts.forEach(part => {
    let restored = part.trim();
    betweenClauses.forEach((clause, index) => {
      restored = restored.replace(`__BETWEEN_${index}__`, clause);
    });
    if (restored) {
      conditions.push(restored);
    }
  });
  
  console.log('🔍 DEBUG: conditions array:', conditions);
  
  for (const condition of conditions) {
    const trimmed = condition.trim();
    console.log('🔍 DEBUG: processing condition:', trimmed);
    
    // Handle BETWEEN operator
    if (trimmed.match(/minbid\s+BETWEEN\s+([\d.]+)\s+AND\s+([\d.]+)/i)) {
      const match = trimmed.match(/minbid\s+BETWEEN\s+([\d.]+)\s+AND\s+([\d.]+)/i);
      params.minPremium = parseFloat(match[1]);
      params.maxPremium = parseFloat(match[2]);
      console.log('🔍 DEBUG: BETWEEN minbid:', params.minPremium, 'to', params.maxPremium);
    }
    // Handle comparison operators for minbid  
    else if (trimmed.match(/minbid\s*([><=]+)\s*([\d.]+)/i)) {
      const match = trimmed.match(/minbid\s*([><=]+)\s*([\d.]+)/i);
      const operator = match[1];
      const value = parseFloat(match[2]);
      console.log('🔍 DEBUG: minbid operator:', operator, 'value:', value);
      
      if (operator === '>' || operator === '>=') {
        params.minPremium = operator === '>' ? value : value;
      } else if (operator === '<' || operator === '<=') {
        params.maxPremium = operator === '<' ? value : value;
      } else if (operator === '=') {
        params.minPremium = value;
        params.maxPremium = value;
      }
      console.log('🔍 DEBUG: set minPremium to:', params.minPremium);
    }
    // Handle comparison operators for distance
    else if (trimmed.match(/distance\s*([><=]+)\s*(\d+)/i)) {
      const match = trimmed.match(/distance\s*([><=]+)\s*(\d+)/i);
      const operator = match[1];
      const value = parseInt(match[2]);
      console.log('🔍 DEBUG: distance operator:', operator, 'value:', value);
      
      if (operator === '>' || operator === '>=') {
        params.minDistance = operator === '>' ? value + 1 : value;
      } else if (operator === '<' || operator === '<=') {
        params.maxDistance = operator === '<' ? value - 1 : value;
      } else if (operator === '=') {
        params.minDistance = value;
        params.maxDistance = value;
      }
      console.log('🔍 DEBUG: set minDistance to:', params.minDistance);
    }
    // Handle tradingdays
    else if (trimmed.match(/tradingdays\s*=\s*(\d+)/i)) {
      const match = trimmed.match(/tradingdays\s*=\s*(\d+)/i);
      params.expiration = parseInt(match[1]);
      params.strategy = `${params.expiration}dte`;
      console.log('🔍 DEBUG: set expiration to:', params.expiration);
    }
    else {
      console.log('🔍 DEBUG: condition did not match any pattern');
    }
  }
  
  // Validate required parameters
  if (params.expiration === null) {
    console.error('❌ Error: tradingdays parameter is required');
    showSQLHelp();
    process.exit(1);
  }
  
  // Set defaults if not specified
  if (params.minPremium === null) params.minPremium = 0.10;
  if (params.minDistance === null) params.minDistance = 0;
  
  return params;
}

function parseOldFormat(args) {
  const params = {
    expiration: null,
    minPremium: null,
    minDistance: null,
    strategy: null,
    queryType: 'old'
  };
  
  for (const arg of args) {
    if (arg.startsWith('td')) {
      const days = parseInt(arg.substring(2));
      params.expiration = days;
      params.strategy = `${days}dte`;
    } else if (arg.startsWith('minbid')) {
      params.minPremium = parseFloat(arg.substring(6));
    } else if (arg.startsWith('distance')) {
      params.minDistance = parseInt(arg.substring(8));
    }
  }
  
  // Validate required parameters for old format
  if (params.expiration === null || params.minPremium === null || params.minDistance === null) {
    console.error('❌ Error: SPX strategy requires all parameters');
    showSQLHelp();
    process.exit(1);
  }
  
  return params;
}

function showSQLHelp() {
  // Copy and paste look from Option Chain Analyzer style
  console.error('❌ SPX SQL Query Help:');
  console.error('Usage: node spx-deeppremium.js "WHERE tradingdays=X AND minbid>=Y"');
  console.error('Examples:');
  console.error('  WHERE tradingdays=1 AND minbid>=0.50');
  console.error('  WHERE tradingdays=3 AND minbid>=0.10');
}

function formatCommandString(argv) {
  if (argv.queryType === 'sql') {
    let parts = [`TRADINGDAYS=${argv.expiration}`];
    
    if (argv.minPremium !== null && argv.maxPremium !== null) {
      if (argv.minPremium === argv.maxPremium) {
        parts.push(`MINBID=$${argv.minPremium.toFixed(2)}`);
      } else {
        parts.push(`MINBID BETWEEN $${argv.minPremium.toFixed(2)} AND $${argv.maxPremium.toFixed(2)}`);
      }
    } else if (argv.minPremium !== null) {
      parts.push(`MINBID>=$${argv.minPremium.toFixed(2)}`);
    } else if (argv.maxPremium !== null) {
      parts.push(`MINBID<=$${argv.maxPremium.toFixed(2)}`);
    }
    
    if (argv.minDistance !== null && argv.maxDistance !== null) {
      if (argv.minDistance === argv.maxDistance) {
        parts.push(`DISTANCE=${argv.minDistance}PTS`);
      } else {
        parts.push(`DISTANCE BETWEEN ${argv.minDistance}PTS AND ${argv.maxDistance}PTS`);
      }
    } else if (argv.minDistance !== null) {
      parts.push(`DISTANCE>=${argv.minDistance}PTS`);
    } else if (argv.maxDistance !== null) {
      parts.push(`DISTANCE<=${argv.maxDistance}PTS`);
    }
    
    return `SPX WHERE ${parts.join(' AND ')}`;
  } else {
    // Old format
    return `SPX TD${argv.expiration} MINBID$${argv.minPremium.toFixed(2)} DISTANCE${argv.minDistance}PTS`;
  }
}

const rawArgs = process.argv.slice(2);
const argv = parseSpxCommand(rawArgs);

// SPX strategy parameters are now required and validated in parseSpxCommand

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
  
  // Find the right expiration date based on trading days
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
      const isAutoScheduled = process.env.AUTO_SCHEDULED === 'true';
      const runType = isAutoScheduled ? 'Auto Scheduled' : 'Manual';
      const commandStr = formatCommandString(argv);
      // Use Option Chain Analyzer template format
      console.log(`📈 SPX: $${spot.toFixed(2)}`);
      console.log(`📅 Analyzing 0DTE (today) options`);
      console.log(`📅 0DTE: No same-day expiration available`);
      console.log('');
      console.log('💡 SUGGESTED TRADE:');
      console.log('   ❌ NO');
      console.log('');
      return;
    }
    
    // If market is closed, show message and exit
    if (marketStatus === 'CLOSED') {
      const isAutoScheduled = process.env.AUTO_SCHEDULED === 'true';
      const runType = isAutoScheduled ? 'Auto Scheduled' : 'Manual';
      const commandStr = `spx ${argv.expiration}${argv.targetBid ? ` ${argv.targetBid}` : ''}`;
      // Use Option Chain Analyzer template format
      console.log(`📈 SPX: $${spot.toFixed(2)}`);
      console.log(`📅 Analyzing 0DTE (today) options`);
      console.log(`📅 0DTE: Market closed`);
      console.log('');
      console.log('💡 SUGGESTED TRADE:');
      console.log('   ❌ NO');
      console.log('');
      return;
    }
  } else {
    // Count forward the specified number of trading days
    const today = new Date();
    let currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow
    let tradingDaysFound = 0;
    let targetDate = null;
    
    // Count trading days forward
    while (tradingDaysFound < argv.expiration) {
      // Check if this is a trading day (not weekend, not holiday)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6 && !isMarketHoliday(currentDate)) {
        tradingDaysFound++;
        if (tradingDaysFound === argv.expiration) {
          targetDate = new Date(currentDate);
          break;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Safety check to prevent infinite loops
      if (currentDate.getTime() - today.getTime() > 365 * 24 * 60 * 60 * 1000) {
        console.log(`⚠️  Could not find ${argv.expiration} trading days within a year`);
        return;
      }
    }
    
    // Find the closest available expiration to our target date
    let closestExp = null;
    let closestDiff = Infinity;
    
    for (const testExp of optionInfo.expirationDates) {
      const utcDate = new Date(testExp);
      const properDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
      
      // Only consider dates on or after our target date
      if (properDate >= targetDate) {
        const diff = Math.abs(properDate.getTime() - targetDate.getTime());
        if (diff < closestDiff) {
          closestDiff = diff;
          closestExp = testExp;
          expDate = properDate;
        }
      }
    }
    
    expiration = closestExp;
    
    if (!expiration) {
      console.log(`⚠️  No expiration found for ${argv.expiration} trading days out`);
      return;
    }
  }
  
  const expDateStr = expDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  
  // Calculate day note based on DTE
  let dayNote = '';
  if (argv.expiration === 0) {
    dayNote = '(Today)';
  } else if (argv.expiration === 1) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = expDate.toDateString() === tomorrow.toDateString();
    dayNote = isTomorrow ? '(Tomorrow)' : '(Next Trading Day)';
  } else {
    dayNote = `(${argv.expiration} Trading Days)`;
  }
  
  // STRICT TEMPLATE OUTPUT using SharedTemplates
  const isAutoScheduled = process.env.AUTO_SCHEDULED === 'true';
  const runType = isAutoScheduled ? 'Auto Scheduled' : 'Manual';
  const commandStr = formatCommandString(argv);
  
  // Minimal header
  const criteria = `${argv.minDistance}pts/${argv.minPremium.toFixed(2)}bid`;
  console.log(SharedTemplates.optionChainTemplate2.terminal.header(
    spot, argv.expiration, expDateStr.replace(/,.*/, ''), dayNote, criteria
  ));
  
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
  const opportunities = records.filter(r => {
    // Distance filtering
    let distanceOk = true;
    const minDist = argv.minDistance || 0;
    const maxDist = argv.maxDistance || Infinity;
    if (r.distance_from_spx < minDist || r.distance_from_spx > maxDist) distanceOk = false;
    
    // Premium filtering  
    let premiumOk = true;
    const minPrem = argv.minPremium || 0;
    const maxPrem = argv.maxPremium || Infinity;
    if (r.bid < minPrem || r.bid > maxPrem) premiumOk = false;
    
    return distanceOk && premiumOk;
  });
  
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
      // No premium strikes found - show the highest bid strikes available
      // This will show the closest thing to dollar bids, even if they don't qualify
      const highestBidStrike = records
        .filter(r => r.bid > 0 && r.distance_from_spx > 0)
        .sort((a, b) => b.bid - a.bid)[0];
      
      if (highestBidStrike) {
        bestIndex = allPuts.findIndex(p => p.strike === highestBidStrike.strike);
        if (bestIndex === -1) bestIndex = Math.floor(allPuts.length / 2);
      } else {
        // Fallback to target distance area
        const targetStrike = Math.floor((spot - argv.minDistance) / 5) * 5;
        bestIndex = allPuts.findIndex(p => p.strike >= targetStrike);
        if (bestIndex === -1) bestIndex = allPuts.length - 5;
      }
      if (bestIndex < 4) bestIndex = 4;
    }
  }
  
  
  // Use SharedTemplates for option chain display
  console.log(SharedTemplates.optionChainTemplate2.terminal.chainHeader());
  
  // Show 4 strikes above and below (9 total)
  const startIdx = Math.max(0, bestIndex - 4);
  const endIdx = Math.min(allPuts.length - 1, bestIndex + 4);
  
  for (let i = startIdx; i <= endIdx; i++) {
    const put = allPuts[i];
    let status = 'CONTEXT';
    
    if (argv.targetBid) {
      // TARGET BID MODE: Mark the closest match
      if (best && put.strike === best.strike) {
        status = 'TARGET';
      }
    } else {
      // REGULAR MODE: Determine qualification based on criteria
      const hasPremium = put.bid >= argv.minPremium;
      const hasDistance = put.distance_from_spx >= argv.minDistance;
      const fullyQualifies = hasPremium && hasDistance;
      
      if (fullyQualifies) {
        status = 'QUALIFIES';
      } else if (hasPremium) {
        status = "DOESN'T QUALIFY";
      } else {
        status = 'CONTEXT';
      }
    }
    
    // Use SPX Deep Premium template with new grid format
    console.log(SharedTemplates.optionChainTemplate2.terminal.chainRow(
      put.strike, put.bid, put.ask, put.distance_from_spx, status
    ));
  }
  
  // Use minimal execution summary
  console.log('');
  if (opportunities.length > 0) {
    const bestQualified = opportunities.sort((a, b) => b.bid - a.bid)[0];
    
    // Add Safety Meter calculation
    const distance = bestQualified.distance_from_spx;
    let safetyLevel;
    
    if (distance >= 300) {
      safetyLevel = '🟢🟢 Very Safe';
    } else if (distance >= 200) {
      safetyLevel = '🟢 Safe';
    } else if (distance >= 100) {
      safetyLevel = '🟡 Moderate';
    } else {
      safetyLevel = '🔴 Risky';
    }
    
    // Use minimal execution format
    console.log(SharedTemplates.optionChainTemplate2.terminal.execution(
      bestQualified.strike, 
      bestQualified.bid, 
      bestQualified.bid * 100,
      bestQualified.distance_from_spx,
      safetyLevel
    ));
    
    console.log(SharedTemplates.optionChainTemplate2.terminal.result(true));
  } else {
    console.log(SharedTemplates.optionChainTemplate2.terminal.result(false));
  }
  console.log('');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});