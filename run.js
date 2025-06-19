#!/usr/bin/env node

import { spawn } from 'child_process';

// This is a universal runner to minimize Claude approval prompts
// Usage: node run.js quote TSLA
//        node run.js sdp today

const [command, ...args] = process.argv.slice(2);

const commands = {
  'quote': ['node', 'quote.js'],
  'q': ['node', 'quote.js'],
  'sdp': ['node', 'spx-deeppremium.js'],
  'deep': ['node', 'spx-deeppremium.js'],
  'spx': ['node', 'spx-deeppremium.js'],
  'orders': ['node', 'order-status.js'],
};

if (!command || !commands[command]) {
  console.log('Available commands:');
  console.log('  quote (or q) <symbol>     - Get stock quote');
  console.log('  sdp, deep, spx <args>     - Run SPX deep premium scanner');
  console.log('  orders [filter]           - View orders (all, open, closed)');
  process.exit(1);
}

const [cmd, script] = commands[command];
const child = spawn(cmd, [script, ...args], { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code);
});