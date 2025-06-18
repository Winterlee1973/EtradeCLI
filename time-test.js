#!/usr/bin/env node
import yahooFinance from 'yahoo-finance2';

// Suppress Yahoo Finance notices
yahooFinance.suppressNotices(['yahooSurvey']);

async function timeQueries() {
  // Time SPX price fetch
  console.log('Starting SPX price fetch...');
  const priceStart = Date.now();
  const spxQuote = await yahooFinance.quote('^SPX');
  const priceTime = Date.now() - priceStart;
  console.log(`✓ SPX Price: $${spxQuote.regularMarketPrice.toFixed(2)} - took ${priceTime}ms\n`);

  // Time options chain fetch
  console.log('Starting options chain fetch...');
  const optionsStart = Date.now();
  const optionData = await yahooFinance.options('^SPX');
  const optionsTime = Date.now() - optionsStart;
  console.log(`✓ Options chain fetched - took ${optionsTime}ms`);
  console.log(`  Found ${optionData.expirationDates.length} expirations`);
  if (optionData.options && optionData.options[0]) {
    console.log(`  First expiration has ${optionData.options[0].puts.length} puts\n`);
  }

  console.log(`Total time: ${priceTime + optionsTime}ms`);
}

timeQueries().catch(console.error);