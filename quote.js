#!/usr/bin/env node
import yahooFinance from 'yahoo-finance2';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Suppress Yahoo Finance notices
yahooFinance.suppressNotices(['yahooSurvey']);

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <symbol>')
  .command('$0 <symbol>', 'Get quote for a symbol', (yargs) => {
    yargs.positional('symbol', {
      describe: 'Stock symbol to quote',
      type: 'string'
    });
  })
  .example('$0 SPX', 'Get SPX quote')
  .example('$0 AAPL', 'Get Apple quote')
  .example('$0 ^GSPC', 'Get S&P 500 quote')
  .help()
  .argv;

async function getQuote(symbol) {
  // Map common symbols to Yahoo Finance format
  const symbolMap = {
    'SPX': '^SPX',
    'VIX': '^VIX',
    'DJI': '^DJI',
    'IXIC': '^IXIC',
    'RUT': '^RUT'
  };
  
  const yahooSymbol = symbolMap[symbol.toUpperCase()] || symbol;
  
  console.log(`\n📊 Fetching quote for ${yahooSymbol}...`);
  
  const startTime = Date.now();
  
  try {
    const quote = await yahooFinance.quote(yahooSymbol);
    const queryTime = Date.now() - startTime;
    
    console.log(`\n✓ ${quote.longName || quote.shortName || quote.symbol}`);
    console.log(`  Symbol: ${quote.symbol}`);
    console.log(`  Price: $${quote.regularMarketPrice.toFixed(2)}`);
    console.log(`  Change: ${quote.regularMarketChange >= 0 ? '+' : ''}${quote.regularMarketChange.toFixed(2)} (${quote.regularMarketChangePercent >= 0 ? '+' : ''}${quote.regularMarketChangePercent.toFixed(2)}%)`);
    console.log(`  Day Range: $${quote.regularMarketDayLow.toFixed(2)} - $${quote.regularMarketDayHigh.toFixed(2)}`);
    console.log(`  Volume: ${(quote.regularMarketVolume || 0).toLocaleString()}`);
    console.log(`\n⏱️  Query time: ${queryTime}ms`);
    console.log(`📅 Timestamp: ${new Date().toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    })}\n`);
    
  } catch (error) {
    console.error(`\n❌ Error fetching quote for ${yahooSymbol}:`, error.message);
    process.exit(1);
  }
}

getQuote(argv.symbol);