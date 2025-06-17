#!/usr/bin/env node
import yahooFinance from 'yahoo-finance2';

// Suppress the survey notice
yahooFinance.suppressNotices(['yahooSurvey']);

async function pullOptionData() {
  console.log('=== Yahoo Finance Option Data Pull Example ===\n');
  
  // Step 1: Define the symbol
  const symbol = '^SPX';  // SPX index
  console.log(`1. Symbol: ${symbol}`);
  
  // Step 2: Get current quote
  console.log('\n2. Fetching current price...');
  const quote = await yahooFinance.quote(symbol);
  console.log(`   SPX Price: $${quote.regularMarketPrice}`);
  
  // Step 3: Get available expiration dates
  console.log('\n3. Fetching available expirations...');
  const optionInfo = await yahooFinance.options(symbol);
  console.log(`   Found ${optionInfo.expirationDates.length} expiration dates`);
  
  // Convert timestamps to readable dates
  const expirations = optionInfo.expirationDates.map(ts => {
    const date = new Date(ts * 1000);
    return {
      timestamp: ts,
      date: date.toISOString().split('T')[0]
    };
  });
  
  console.log('\n   First 5 expirations:');
  expirations.slice(0, 5).forEach(exp => {
    console.log(`   - ${exp.date}`);
  });
  
  // Step 4: Get option chain for specific expiration
  const targetExpiration = expirations[0].timestamp; // Use first expiration
  console.log(`\n4. Fetching option chain for ${expirations[0].date}...`);
  
  const optionChain = await yahooFinance.options(symbol, { 
    date: targetExpiration 
  });
  
  console.log(`   Retrieved ${optionChain.options[0].calls.length} calls`);
  console.log(`   Retrieved ${optionChain.options[0].puts.length} puts`);
  
  // Step 5: Display put options data
  console.log('\n5. Put Options Data (last 5, closest to money):');
  console.log('\n   Strike | Bid    | Ask    | Volume | Last   | IV     | ITM');
  console.log('   -------|--------|--------|--------|--------|--------|----');
  
  const currentPrice = optionChain.quote.regularMarketPrice;
  const puts = optionChain.options[0].puts.slice(-5);
  
  puts.forEach(put => {
    const inTheMoney = put.strike > currentPrice;
    console.log(
      `   ${put.strike.toString().padEnd(6)} | ` +
      `${(put.bid || 0).toFixed(2).padStart(6)} | ` +
      `${(put.ask || 0).toFixed(2).padStart(6)} | ` +
      `${(put.volume || 0).toString().padStart(6)} | ` +
      `${(put.lastPrice || 0).toFixed(2).padStart(6)} | ` +
      `${((put.impliedVolatility || 0) * 100).toFixed(1).padStart(5)}% | ` +
      `${inTheMoney ? 'Yes' : 'No'}`
    );
  });
  
  // Step 6: Show raw API response structure
  console.log('\n6. Raw API Response Structure (first put):');
  const firstPut = optionChain.options[0].puts[0];
  console.log(JSON.stringify({
    contractSymbol: firstPut.contractSymbol,
    strike: firstPut.strike,
    expiration: firstPut.expiration,
    bid: firstPut.bid,
    ask: firstPut.ask,
    lastPrice: firstPut.lastPrice,
    volume: firstPut.volume,
    openInterest: firstPut.openInterest,
    impliedVolatility: firstPut.impliedVolatility,
    inTheMoney: firstPut.inTheMoney
  }, null, 2));
}

// Run the example
pullOptionData().catch(console.error);