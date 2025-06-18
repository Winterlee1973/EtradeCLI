#!/usr/bin/env node

import { spawn } from 'child_process';

// This is a universal runner to minimize Claude approval prompts
// Usage: node run.js quote TSLA
//        node run.js spx-put-seller --filter "bid>=0.10"

const [command, ...args] = process.argv.slice(2);

const commands = {
  'quote': ['node', 'quote.js'],
  'q': ['node', 'quote.js'],
  'spx': ['node', 'spx-put-seller.js'],
  'spx-put-seller': ['node', 'spx-put-seller.js'],
  'puts': ['node', 'spx-put-seller.js'],
  'sps': ['node', 'spx-put-seller.js'],
};

if (!command || !commands[command]) {
  console.log('Available commands:');
  console.log('  quote (or q) <symbol>     - Get stock quote');
  console.log('  spx, puts, sps <args>     - Run SPX put seller');
  process.exit(1);
}

const [cmd, script] = commands[command];
const child = spawn(cmd, [script, ...args], { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code);
});