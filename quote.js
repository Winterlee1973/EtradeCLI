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
  
  try {
    const quote = await yahooFinance.quote(yahooSymbol);
    
    const change = quote.regularMarketChange;
    const changePct = quote.regularMarketChangePercent;
    const changeIcon = change >= 0 ? '📈' : '📉';
    
    console.log(`📊 ${quote.longName || quote.shortName || quote.symbol}`);
    console.log(`💰 ${quote.symbol}: $${quote.regularMarketPrice.toFixed(2)}`);
    console.log(`${changeIcon} ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`);
    console.log(`📅 ${new Date().toLocaleString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    })}`);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

getQuote(argv.symbol);