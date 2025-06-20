#!/usr/bin/env node
import yahooFinance from './yahoo-finance-quiet.js';
import { SharedTemplates, TemplatePresets } from './shared-templates.js';

// Market holidays for 2025 (US stock market)
function isMarketHoliday(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const holidays2025 = [
    '1/1', '1/20', '2/17', '4/18', '5/26', '6/19', '7/4', '9/1', '11/27', '12/25'
  ];
  
  if (year === 2025) {
    const dateStr = `${month}/${day}`;
    return holidays2025.includes(dateStr);
  }
  
  return false;
}

async function analyzeOptionChain(dte = 1, targetBid = null) {
  try {
    // Get current SPX price
    const quote = await yahooFinance.quote('^SPX');
    const spot = quote.regularMarketPrice;
    
    // Get option info
    const optionInfo = await yahooFinance.options('^SPX');
    let expiration = null;
    let expDate = null;
    
    if (dte === 0) {
      // Find today's expiration
      const today = new Date();
      for (const exp of optionInfo.expirationDates) {
        const utcDate = new Date(exp);
        const properDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
        if (properDate.toDateString() === today.toDateString()) {
          expiration = exp;
          expDate = properDate;
          break;
        }
      }
    } else {
      // Find next trading day
      for (const exp of optionInfo.expirationDates) {
        const utcDate = new Date(exp);
        const properDate = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
        if (properDate > new Date() && properDate.getDay() !== 0 && properDate.getDay() !== 6 && !isMarketHoliday(properDate)) {
          expiration = exp;
          expDate = properDate;
          break;
        }
      }
    }
    
    if (!expiration) {
      console.log(TemplatePresets.optionChainAnalyzer.errors.noExpiration(dte));
      return;
    }
    
    // Get full option chain
    const chain = await yahooFinance.options('^SPX', { date: expiration });
    const puts = chain.options[0].puts;
    
    // Format expiration date
    const expDateFormatted = expDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    // Print header using template
    console.log(TemplatePresets.optionChainAnalyzer.terminal.header(spot, dte, expDateFormatted, puts.length));
    
    if (targetBid) {
      // Find specific bid amount
      const targetStrikes = puts.filter(p => p.bid === targetBid).sort((a, b) => b.strike - a.strike);
      
      if (targetStrikes.length === 0) {
        console.log('\n' + TemplatePresets.optionChainAnalyzer.terminal.searchHeader(targetBid));
        console.log(TemplatePresets.optionChainAnalyzer.terminal.noResults(targetBid));
        
        // Find nearby bids
        const nearby = puts.filter(p => Math.abs(p.bid - targetBid) <= 0.01 && p.bid > 0)
          .sort((a, b) => Math.abs(a.bid - targetBid) - Math.abs(b.bid - targetBid))
          .slice(0, 10);
        
        if (nearby.length > 0) {
          console.log('\n' + TemplatePresets.optionChainAnalyzer.terminal.nearbyHeader(targetBid));
          
          nearby.forEach(put => {
            const distance = Math.round(spot - put.strike);
            console.log(TemplatePresets.optionChainAnalyzer.terminal.dataRow(put.strike, put.bid, put.ask, distance));
          });
        }
      } else {
        // NEW CONTEXT-AWARE DISPLAY
        console.log('\n' + TemplatePresets.optionChainAnalyzer.terminal.contextHeader(targetBid));
        
        // Show a few strikes above highest target for context
        const highestTargetStrike = Math.max(...targetStrikes.map(p => p.strike));
        const contextAbove = puts
          .filter(p => p.strike > highestTargetStrike)
          .sort((a, b) => a.strike - b.strike)
          .slice(0, 2);
        
        contextAbove.forEach(put => {
          const distance = Math.round(spot - put.strike);
          console.log(TemplatePresets.optionChainAnalyzer.terminal.contextRow(put.strike, put.bid, put.ask, distance, 'Context'));
        });
        
        // Show all target strikes, mark the lowest as SUGGESTED
        const lowestTargetStrike = Math.min(...targetStrikes.map(p => p.strike));
        targetStrikes.forEach(put => {
          const distance = Math.round(spot - put.strike);
          const note = put.strike === lowestTargetStrike ? '← SUGGESTED' : '← TARGET';
          console.log(TemplatePresets.optionChainAnalyzer.terminal.contextRow(put.strike, put.bid, put.ask, distance, note));
        });
        
        // Show proof: the immediate next strike down
        const nextLowerStrike = puts
          .filter(p => p.strike < lowestTargetStrike)
          .sort((a, b) => b.strike - a.strike)[0];
        
        if (nextLowerStrike) {
          const distance = Math.round(spot - nextLowerStrike.strike);
          console.log(TemplatePresets.optionChainAnalyzer.terminal.contextRow(nextLowerStrike.strike, nextLowerStrike.bid, nextLowerStrike.ask, distance, '← PROOF (Next Lower)'));
        }
        
        // Show a couple more strikes below for full context  
        const contextBelow = puts
          .filter(p => nextLowerStrike ? p.strike < nextLowerStrike.strike : p.strike < lowestTargetStrike)
          .sort((a, b) => b.strike - a.strike)
          .slice(0, 2);
        
        contextBelow.forEach(put => {
          const distance = Math.round(spot - put.strike);
          console.log(TemplatePresets.optionChainAnalyzer.terminal.contextRow(put.strike, put.bid, put.ask, distance, 'Context'));
        });
        
        const closest = targetStrikes.length > 0 ? { strike: targetStrikes[0].strike, spot } : null;
        console.log('\n' + TemplatePresets.optionChainAnalyzer.terminal.summary(targetStrikes.length, targetBid, closest));
      }
    } else {
      // Show summary of bid levels
      console.log('\n📊 BID LEVEL SUMMARY:');
      const bidLevels = {};
      
      puts.forEach(put => {
        if (put.bid > 0) {
          const bidKey = put.bid.toFixed(2);
          if (!bidLevels[bidKey]) {
            bidLevels[bidKey] = [];
          }
          bidLevels[bidKey].push(put);
        }
      });
      
      // Show interesting bid levels
      const interestingBids = [0.05, 0.10, 0.15, 0.20, 0.25, 0.50, 1.00];
      
      for (const bid of interestingBids) {
        const bidKey = bid.toFixed(2);
        const count = bidLevels[bidKey] ? bidLevels[bidKey].length : 0;
        const furthest = bidLevels[bidKey] ? bidLevels[bidKey].reduce((min, p) => p.strike < min.strike ? p : min) : null;
        console.log(TemplatePresets.optionChainAnalyzer.terminal.bidLevelSummary(bid, count, furthest, spot));
      }
    }
    
  } catch (error) {
    console.error(TemplatePresets.optionChainAnalyzer.errors.apiError(error.message));
    process.exit(1);
  }
}

// Command line interface
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node option-chain-analyzer.js [dte] [bid]');
  console.log('Examples:');
  console.log('  node option-chain-analyzer.js 1 0.05    # Find $0.05 bids for 1DTE');
  console.log('  node option-chain-analyzer.js 0 0.10    # Find $0.10 bids for 0DTE');
  console.log('  node option-chain-analyzer.js 1         # Show bid level summary for 1DTE');
  process.exit(0);
}

const dte = parseInt(args[0]) || 1;
const targetBid = args[1] ? parseFloat(args[1]) : null;

analyzeOptionChain(dte, targetBid);