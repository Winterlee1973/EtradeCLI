#!/usr/bin/env node
import { SharedTemplates, TemplatePresets } from './shared-templates.js';

// Sample data for "dime bids 3 days out"
const sampleData = {
  spot: 5967.84,
  dte: 3,
  expDate: 'Thursday, June 26',
  targetBid: 0.10,
  strikes: [
    { strike: 4900, bid: 0.15, ask: 0.30, distance: 1068, note: 'Context' },
    { strike: 4800, bid: 0.10, ask: 0.30, distance: 1168, note: 'TARGET' },
    { strike: 4700, bid: 0.10, ask: 0.25, distance: 1268, note: 'SUGGESTED' },
    { strike: 4600, bid: 0.05, ask: 0.25, distance: 1368, note: 'PROOF' }
  ],
  bidLevels: {
    '0.05': { count: 1, furthest: { strike: 4600 } },
    '0.10': { count: 2, furthest: { strike: 4700 } },
    '0.15': { count: 1, furthest: { strike: 4900 } }
  }
};

console.log('🎯 TEMPLATE SHOWCASE: DIME BIDS 3 DAYS OUT\n');
console.log('═'.repeat(60));

// 1. Option Chain Analyzer (current)
console.log('\n1️⃣ OPTION CHAIN ANALYZER TEMPLATE (current)');
console.log('─'.repeat(50));
console.log(TemplatePresets.optionChainAnalyzer.terminal.header(sampleData.spot, sampleData.dte, sampleData.expDate, 138));
console.log('\n' + TemplatePresets.optionChainAnalyzer.terminal.contextHeader(sampleData.targetBid));

sampleData.strikes.forEach(strike => {
  console.log(TemplatePresets.optionChainAnalyzer.terminal.contextRow(
    strike.strike, strike.bid, strike.ask, strike.distance, `← ${strike.note}`
  ));
});

console.log('\n' + TemplatePresets.optionChainAnalyzer.terminal.summary(2, sampleData.targetBid, { strike: 4800, spot: sampleData.spot }));

// 2. Basic Option Chain Template
console.log('\n\n2️⃣ BASIC OPTION CHAIN TEMPLATE');
console.log('─'.repeat(50));
console.log(SharedTemplates.optionschain1.terminal.header());

sampleData.strikes.forEach((strike, i) => {
  const marker = i === 1 ? '🎯' : i === 2 ? '✅' : i === 3 ? '💰' : '';
  console.log(SharedTemplates.optionschain1.terminal.row(
    strike.strike.toString(), strike.bid.toFixed(2), strike.ask.toFixed(2), strike.distance.toString(), marker
  ));
});

// 3. Bid Level Summary Template
console.log('\n\n3️⃣ BID LEVEL SUMMARY TEMPLATE');
console.log('─'.repeat(50));
console.log('📊 BID LEVEL SUMMARY:');
Object.entries(sampleData.bidLevels).forEach(([bid, data]) => {
  console.log(TemplatePresets.optionChainAnalyzer.terminal.bidLevelSummary(
    parseFloat(bid), data.count, data.furthest, sampleData.spot
  ));
});

// 4. Order Template
console.log('\n\n4️⃣ ORDER EXECUTION TEMPLATE');
console.log('─'.repeat(50));
console.log(SharedTemplates.order1.terminal.header());
console.log(SharedTemplates.order1.terminal.sell(1, 'SPX', '4800P', 'Jun 26'));
console.log(SharedTemplates.order1.terminal.premium(0.10));
console.log(SharedTemplates.order1.terminal.credit(10));
console.log(SharedTemplates.order1.terminal.distance(1168, 'SPX'));
console.log(SharedTemplates.order1.terminal.safety('🔴', 'Risky'));

// 5. Market Data Template
console.log('\n\n5️⃣ MARKET DATA TEMPLATE');
console.log('─'.repeat(50));
console.log(SharedTemplates.marketData.timestamp(new Date(), 'ET'));
console.log(SharedTemplates.marketData.price('SPX', sampleData.spot, 'CLOSED'));
console.log(SharedTemplates.marketData.change(-12.34, -0.21, false));

console.log('\n' + '═'.repeat(60));
console.log('🎯 END TEMPLATE SHOWCASE');