#!/usr/bin/env node
import yahooFinance from './yahoo-finance-quiet.js';
import { SharedTemplates } from './shared-templates.js';

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

async function main() {
  try {
    // Fetch current SPX data
    const quote = await yahooFinance.quote('^SPX');
    const spot = quote.regularMarketPrice;
    
    // Get option info to find next trading day expiration
    const optionInfo = await yahooFinance.options('^SPX');
    
    // Find next trading day (1DTE)
    let expiration = null;
    let expDate = null;
    
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
    
    if (!expiration) {
      console.log('❌ NO 1DTE EXPIRATION AVAILABLE');
      return;
    }
    
    // Get option chain for next trading day
    const chain = await yahooFinance.options('^SPX', { date: expiration });
    const puts = chain.options[0].puts;
    
    // Calculate target strikes at 150, 200, 250, 350 points out
    const targets = [
      { distance: 150, strike: Math.floor((spot - 150) / 5) * 5 },
      { distance: 200, strike: Math.floor((spot - 200) / 5) * 5 },
      { distance: 250, strike: Math.floor((spot - 250) / 5) * 5 },
      { distance: 350, strike: Math.floor((spot - 350) / 5) * 5 }
    ];
    
    // Get timestamp
    const timestamp = new Date().toLocaleString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
    
    // Format expiration date
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
    
    // Output using templates
    const template = SharedTemplates.spxProgram.terminal;
    
    console.log(template.header('1DTE1'));
    console.log(template.divider());
    console.log(template.time(timestamp));
    console.log(template.spxPrice(spot));
    console.log(template.expiration(`1DTE Expiration: ${expDateStr}`, dayNote));
    console.log('');
    console.log(template.bidSection.header());
    console.log(template.bidSection.divider());
    
    // Find and display bids
    for (const target of targets) {
      const put = puts.find(p => p.strike === target.strike);
      if (put && put.bid > 0) {
        // Find the lowest strike with the same bid
        const sameBidPuts = puts.filter(p => p.bid === put.bid && p.strike <= target.strike);
        const lowestStrike = sameBidPuts.reduce((min, p) => p.strike < min ? p.strike : min, target.strike);
        
        if (lowestStrike < target.strike) {
          console.log(template.bidSection.row(target.distance, target.strike, put.bid, `${lowestStrike}-${target.strike}`));
        } else {
          console.log(template.bidSection.row(target.distance, target.strike, put.bid));
        }
      } else if (put) {
        console.log(template.bidSection.row(target.distance, target.strike, 0));
      } else {
        console.log(template.bidSection.noData(target.distance, target.strike));
      }
    }
    
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();