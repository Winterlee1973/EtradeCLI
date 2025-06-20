#!/usr/bin/env node
import yahooFinance from './yahoo-finance-quiet.js';
import { SharedTemplates } from './shared-templates.js';

async function main() {
  try {
    // Fetch current SPX data
    const quote = await yahooFinance.quote('^SPX');
    const spot = quote.regularMarketPrice;
    
    // Get option info to find same-day expiration (0DTE)
    const optionInfo = await yahooFinance.options('^SPX');
    
    // Find same-day expiration (0DTE)
    let expiration = null;
    let expDate = null;
    
    const today = new Date();
    for (let i = 0; i < optionInfo.expirationDates.length; i++) {
      const testExp = optionInfo.expirationDates[i];
      const utcDate = new Date(testExp);
      const properDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
      
      // Check if this is today's date
      if (properDate.toDateString() === today.toDateString()) {
        expiration = testExp;
        expDate = properDate;
        break;
      }
    }
    
    if (!expiration) {
      console.log('❌ NO 0DTE EXPIRATION AVAILABLE TODAY');
      return;
    }
    
    // Get option chain for same day
    const chain = await yahooFinance.options('^SPX', { date: expiration });
    const puts = chain.options[0].puts;
    
    // Calculate target strikes at 100, 150, 200 points out
    const targets = [
      { distance: 100, strike: Math.floor((spot - 100) / 5) * 5 },
      { distance: 150, strike: Math.floor((spot - 150) / 5) * 5 },
      { distance: 200, strike: Math.floor((spot - 200) / 5) * 5 }
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
    
    // Output header
    console.log('🤖 0DTE1 PROGRAM RESULTS');
    console.log('─────────────────────────');
    console.log(`⏰ Time: ${timestamp}`);
    console.log(`📈 SPX: ${spot.toFixed(2)}`);
    console.log(`📅 0DTE Expiration: ${expDateStr} (Today)`);
    console.log('');
    console.log('💰 BID PRICES AT KEY LEVELS:');
    console.log('─────────────────────────');
    
    // Find and display bids
    for (const target of targets) {
      const put = puts.find(p => p.strike === target.strike);
      if (put && put.bid > 0) {
        // Find the lowest strike with the same bid
        const sameBidPuts = puts.filter(p => p.bid === put.bid && p.strike <= target.strike);
        const lowestStrike = sameBidPuts.reduce((min, p) => p.strike < min ? p.strike : min, target.strike);
        
        if (lowestStrike < target.strike) {
          console.log(`${target.distance} pts out (${lowestStrike}-${target.strike}): $${put.bid.toFixed(2)} bid`);
        } else {
          console.log(`${target.distance} pts out (${target.strike}-${target.strike}): $${put.bid.toFixed(2)} bid`);
        }
      } else if (put) {
        console.log(`${target.distance} pts out (${target.strike}): $0.00 bid`);
      } else {
        console.log(`${target.distance} pts out (${target.strike}): No data`);
      }
    }
    
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();