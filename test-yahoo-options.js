#!/usr/bin/env node
import yahooFinance from 'yahoo-finance2';

async function testOptionChain() {
  try {
    console.log('Testing Yahoo Finance option chain retrieval...\n');
    
    // Test with SPX
    const symbol = '^SPX';
    console.log(`Fetching option chain for ${symbol}...`);
    
    const optionChain = await yahooFinance.options(symbol);
    
    console.log('\nOption Chain Summary:');
    console.log(`Symbol: ${optionChain.symbol}`);
    console.log(`Underlying Price: $${optionChain.quote.regularMarketPrice}`);
    console.log(`Expiration Dates: ${optionChain.expirationDates.length} available`);
    
    // Show first few expiration dates
    console.log('\nFirst 5 expiration dates:');
    optionChain.expirationDates.slice(0, 5).forEach((exp, i) => {
      const date = new Date(exp * 1000);
      console.log(`  ${i + 1}. ${date.toISOString().split('T')[0]}`);
    });
    
    // Get options for the first expiration
    if (optionChain.expirationDates.length > 0) {
      const firstExpiration = optionChain.expirationDates[0];
      const optionsForDate = await yahooFinance.options(symbol, { date: firstExpiration });
      
      console.log(`\nOptions for ${new Date(firstExpiration * 1000).toISOString().split('T')[0]}:`);
      console.log(`  Calls: ${optionsForDate.options[0].calls.length}`);
      console.log(`  Puts: ${optionsForDate.options[0].puts.length}`);
      
      // Show more puts with better formatting
      console.log('\nPUT options (showing 10):');
      console.log('Strike    Bid     Ask     Volume   Last    IV      ITM');
      console.log('------    ---     ---     ------   ----    --      ---');
      
      const puts = optionsForDate.options[0].puts.slice(-10); // Last 10 (closer to money)
      puts.forEach(put => {
        const itm = put.strike > optionsForDate.quote.regularMarketPrice ? 'Y' : 'N';
        console.log(
          `${put.strike.toString().padEnd(9)} ` +
          `${(put.bid || 0).toFixed(2).padEnd(7)} ` +
          `${(put.ask || 0).toFixed(2).padEnd(7)} ` +
          `${(put.volume || 0).toString().padEnd(8)} ` +
          `${(put.lastPrice || 0).toFixed(2).padEnd(7)} ` +
          `${((put.impliedVolatility || 0) * 100).toFixed(1).padEnd(7)} ` +
          `${itm}`
        );
      });
      
      console.log('\nRaw data for first put:');
      console.log(JSON.stringify(optionsForDate.options[0].puts[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error fetching option chain:', error.message);
  }
}

testOptionChain();