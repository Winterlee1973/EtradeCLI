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

// ----------------- CLI -----------------
const argv = yargs(hideBin(process.argv))
  .option('csv', { type: 'string', demandOption: true, describe: 'Path to option chain CSV' })
  .option('filter', { type: 'string', demandOption: true, describe: 'SQL‑ish filter string' })
  .option('dry', { type: 'boolean', default: false, describe: "Don't print order ticket" })
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
    if (token === 'AND' || token === 'OR') {
      currentOp = token;
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
  // 1) Load CSV
  const raw = fs.readFileSync(path.resolve(argv.csv));
  const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  // 2) Fetch spot
  const quote = await yahooFinance.quote('^SPX');
  const spot = quote.regularMarketPrice;
  // 3) Augment each row
  records.forEach(r => {
    r.strike = Number(r.strike);
    r.bid = Number(r.bid);
    r.ask = Number(r.ask);
    r.volume = Number(r.volume);
    r.distance_from_spx = spot - r.strike;
    r.type = 'put';
    r.symbol = 'SPX';
  });
  // 4) Apply filter
  const tokens = argv.filter.split(/\s+(AND|OR)\s+/i).map(t => t.trim().toUpperCase());
  const matches = records.filter(r => evalFilter(r, tokens));
  if (!matches.length) {
    console.log('🔍  No contracts match your filter.');
    return;
  }
  // 5) Pick highest strike (closest to spot)
  matches.sort((a, b) => b.strike - a.strike);
  const best = matches[0];
  console.log(`Spot SPX: ${spot.toFixed(2)}`);
  console.log(`Found ${matches.length} matching puts`);
  console.log(`Selected ${best.strike}p @ ${best.bid} (distance ${best.distance_from_spx.toFixed(0)} pts)`);
  if (!argv.dry) {
    console.log('💸  Order preview');
    console.log(`    SELL 1 SPX W 2025-06-18 ${best.strike}P`);
    console.log(`    LIMIT ${best.bid}   Credit $${(best.bid * 100).toFixed(2)}`);
  }
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});