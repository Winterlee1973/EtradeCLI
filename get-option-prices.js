#!/usr/bin/env node
import yahooFinance from 'yahoo-finance2';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Suppress notices
yahooFinance.suppressNotices(['yahooSurvey']);

const argv = yargs(hideBin(process.argv))
  .option('symbol', { 
    type: 'string', 
    default: '^SPX', 
    describe: 'Symbol to get options for' 
  })
  .option('strikes', { 
    type: 'array', 
    describe: 'Specific strikes to show (e.g., --strikes 5900 5950 6000)' 
  })
  .option('type', { 
    type: 'string', 
    default: 'puts', 
    choices: ['puts', 'calls', 'both'],
    describe: 'Option type' 
  })
  .option('expiration', { 
    type: 'number', 
    default: 0, 
    describe: 'Expiration index (0 = nearest)' 
  })
  .argv;

async function getOptionPrices() {
  try {
    // Get current price
    const quote = await yahooFinance.quote(argv.symbol);
    const spot = quote.regularMarketPrice;
    
    // Get available expirations
    const optionInfo = await yahooFinance.options(argv.symbol);
    const expiration = optionInfo.expirationDates[argv.expiration];
    
    // Get option chain
    const chain = await yahooFinance.options(argv.symbol, { date: expiration });
    const expDate = new Date(expiration * 1000).toISOString().split('T')[0];
    
    console.log(`${argv.symbol} @ $${spot.toFixed(2)}`);
    console.log(`Expiration: ${expDate}\n`);
    
    // Filter for specific strikes if provided
    const puts = chain.options[0].puts;
    const calls = chain.options[0].calls;
    
    if (argv.strikes) {
      // Show specific strikes
      console.log('Strike  | Type | Bid    | Ask    | Mid    | Last   | Volume');
      console.log('--------|------|--------|--------|--------|--------|-------');
      
      argv.strikes.forEach(strike => {
        if (argv.type === 'puts' || argv.type === 'both') {
          const put = puts.find(p => p.strike === Number(strike));
          if (put) {
            const mid = ((put.bid || 0) + (put.ask || 0)) / 2;
            console.log(
              `${strike.toString().padEnd(7)} | ` +
              `PUT  | ` +
              `${(put.bid || 0).toFixed(2).padStart(6)} | ` +
              `${(put.ask || 0).toFixed(2).padStart(6)} | ` +
              `${mid.toFixed(2).padStart(6)} | ` +
              `${(put.lastPrice || 0).toFixed(2).padStart(6)} | ` +
              `${(put.volume || 0).toString().padStart(6)}`
            );
          }
        }
        
        if (argv.type === 'calls' || argv.type === 'both') {
          const call = calls.find(c => c.strike === Number(strike));
          if (call) {
            const mid = ((call.bid || 0) + (call.ask || 0)) / 2;
            console.log(
              `${strike.toString().padEnd(7)} | ` +
              `CALL | ` +
              `${(call.bid || 0).toFixed(2).padStart(6)} | ` +
              `${(call.ask || 0).toFixed(2).padStart(6)} | ` +
              `${mid.toFixed(2).padStart(6)} | ` +
              `${(call.lastPrice || 0).toFixed(2).padStart(6)} | ` +
              `${(call.volume || 0).toString().padStart(6)}`
            );
          }
        }
      });
    } else {
      // Show 3 near-the-money options
      console.log('3 Nearest ' + argv.type.toUpperCase() + ':');
      console.log('Strike  | Bid    | Ask    | Mid    | Last   | Volume');
      console.log('--------|--------|--------|--------|--------|-------');
      
      const options = argv.type === 'calls' ? calls : puts;
      const sorted = [...options].sort((a, b) => 
        Math.abs(a.strike - spot) - Math.abs(b.strike - spot)
      );
      
      sorted.slice(0, 3).forEach(opt => {
        const mid = ((opt.bid || 0) + (opt.ask || 0)) / 2;
        console.log(
          `${opt.strike.toString().padEnd(7)} | ` +
          `${(opt.bid || 0).toFixed(2).padStart(6)} | ` +
          `${(opt.ask || 0).toFixed(2).padStart(6)} | ` +
          `${mid.toFixed(2).padStart(6)} | ` +
          `${(opt.lastPrice || 0).toFixed(2).padStart(6)} | ` +
          `${(opt.volume || 0).toString().padStart(6)}`
        );
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getOptionPrices();