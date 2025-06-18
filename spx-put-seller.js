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

// Suppress Yahoo Finance notices
yahooFinance.suppressNotices(['yahooSurvey']);

// ----------------- CLI -----------------
const argv = yargs(hideBin(process.argv))
  .option('csv', { type: 'string', describe: 'Path to option chain CSV (optional - will fetch live data if not provided)' })
  .option('filter', { type: 'string', demandOption: true, describe: 'SQL‑ish filter string' })
  .option('dry', { type: 'boolean', default: false, describe: "Don't print order ticket" })
  .option('expiration', { type: 'number', default: 0, describe: 'Expiration index (0 = nearest)' })
  .example('$0 --filter "bid>=0.05 AND distance_from_spx>=300"')
  .example('$0 --csv chain.csv --filter "bid>=0.05 AND distance_from_spx>=300"')
  .argv;

// ----------------- Helpers -------------
function sqlCompare(a, op, b) {
  switch (op) {
    case '=':
    case '==': return a == b;
    case '>': return a > b;
    case '>=': return a >= b;
    case '<': return a < b;
    case '<=': return a <= b;
    default: return false;
  }
}

function evalFilter(row, tokens) {
  // tokens is array like ['bid>=0.05', 'AND', 'distance_from_spx>=300']
  let result = true;
  let currentOp = 'AND';
  for (const token of tokens) {
    if (token.toUpperCase() === 'AND' || token.toUpperCase() === 'OR') {
      currentOp = token.toUpperCase();
      continue;
    }
    const match = token.match(/(\w+)\s*(>=|<=|=|==|>|<)\s*('?[-\w.]+'?)/);
    if (!match) continue;
    let [, field, op, val] = match;
    val = val.replace(/'/g, '');
    if (!isNaN(val)) val = Number(val);
    const cmp = sqlCompare(row[field], op, val);
    result = currentOp === 'AND' ? (result && cmp) : (result || cmp);
  }
  return result;
}

async function main() {
  // 1) Fetch spot price first
  console.log('📊 Fetching current SPX data...');
  const quote = await yahooFinance.quote('^SPX');
  const spot = quote.regularMarketPrice;
  console.log(`\n🎯 Current SPX: $${spot.toFixed(2)}`);
  
  let records = [];
  
  if (argv.csv) {
    // Load from CSV if provided
    const raw = fs.readFileSync(path.resolve(argv.csv));
    records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  } else {
    // Fetch live option data from Yahoo Finance
    console.log('📡 Fetching live option chain from Yahoo Finance...');
    const optionInfo = await yahooFinance.options('^SPX');
    const expiration = optionInfo.expirationDates[argv.expiration];
    const expDate = new Date(expiration * 1000).toISOString().split('T')[0];
    console.log(`📅 Using expiration: ${expDate}\n`);
    
    const chain = await yahooFinance.options('^SPX', { date: expiration });
    const puts = chain.options[0].puts;
    
    // Convert Yahoo data to our format
    records = puts.map(put => ({
      strike: put.strike,
      bid: put.bid || 0,
      ask: put.ask || 0,
      lastPrice: put.lastPrice || 0,
      volume: put.volume || 0,
      openInterest: put.openInterest || 0,
      impliedVolatility: (put.impliedVolatility || 0) * 100
    }));
  }
  
  // 3) Augment each row
  records.forEach(r => {
    r.strike = Number(r.strike);
    r.bid = Number(r.bid);
    r.ask = Number(r.ask);
    r.volume = Number(r.volume);
    r.distance_from_spx = spot - r.strike;
    r.awayfromstrike = Math.abs(spot - r.strike);  // Absolute distance from SPX
    r.type = 'put';
    r.symbol = 'SPX';
  });
  
  // 4) Apply filter
  const tokens = argv.filter.split(/\s+(AND|OR)\s+/i).map(t => t.trim());
  const matches = records.filter(r => evalFilter(r, tokens));
  if (!matches.length) {
    console.log('🔍  No contracts match your filter.');
    return;
  }
  
  // 5) Pick highest strike (closest to spot)
  matches.sort((a, b) => b.strike - a.strike);
  const best = matches[0];
  
  // Find adjacent strikes
  const allPuts = records.sort((a, b) => a.strike - b.strike);
  const bestIndex = allPuts.findIndex(p => p.strike === best.strike);
  
  console.log(`Found ${matches.length} matching puts\n`);
  
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
  
  console.log('📈 Option Chain Context:');
  console.log('Strike  | Bid    | Ask    | Last   | Volume | Distance | Match');
  console.log('--------|--------|--------|--------|--------|----------|------');
  
  // Show 5 strikes below
  const startIdx = Math.max(0, bestIndex - 5);
  const endIdx = Math.min(allPuts.length - 1, bestIndex + 5);
  
  for (let i = startIdx; i <= endIdx; i++) {
    const put = allPuts[i];
    const isSelected = i === bestIndex;
    console.log(
      `${put.strike.toString().padEnd(7)} | ` +
      `${put.bid.toFixed(2).padStart(6)} | ` +
      `${put.ask.toFixed(2).padStart(6)} | ` +
      `${(put.lastPrice || 0).toFixed(2).padStart(6)} | ` +
      `${put.volume.toString().padStart(6)} | ` +
      `${put.distance_from_spx.toFixed(0).padStart(8)} | ` +
      (isSelected ? '← SELECTED' : '')
    );
  }
  
  if (!argv.dry) {
    console.log('\n💸 Order preview');
    console.log(`    SELL 1 SPX ${best.strike}P`);
    console.log(`    LIMIT ${best.bid}   Credit $${(best.bid * 100).toFixed(2)}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});