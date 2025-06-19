#!/usr/bin/env node

import { spawn } from 'child_process';
import { registry, createRunner, parseStrategyCommand } from './strategy-framework.js';

// Universal runner to minimize Claude approval prompts
// Usage: node run.js q TSLA
//        node run.js spx 1

const [command, ...args] = process.argv.slice(2);

// Legacy script mappings (will be phased out)
const legacyCommands = {
  'quote': ['node', 'quote.js'],
  'q': ['node', 'quote.js'],
  'spx': ['node', 'spx-deeppremium.js'],
  'orders': ['node', 'order-status.js'],
};

if (!command) {
  console.log('🎯 Available commands:');
  console.log('  q, quote <symbol>         - Get stock quote');
  console.log('  spx <0|1> [premium]       - Run SPX deep premium scanner');
  console.log('  orders [filter]           - View orders (all, open, closed)');
  console.log('');
  console.log('📋 Templates: quote1, optionschain1, order1, orderstatus1');
  process.exit(1);
}

// Try strategy framework first (future)
if (registry.get(command)) {
  try {
    const runner = createRunner(command);
    const result = await runner.execute(args);
    console.log(result);
    process.exit(0);
  } catch (error) {
    console.error('Strategy error:', error.message);
    process.exit(1);
  }
}

// Fall back to legacy commands
if (legacyCommands[command]) {
  const [cmd, script] = legacyCommands[command];
  const child = spawn(cmd, [script, ...args], { stdio: 'inherit' });
  
  child.on('exit', (code) => {
    process.exit(code);
  });
} else {
  console.error(`❌ Unknown command: ${command}`);
  console.log('Run without arguments to see available commands.');
  process.exit(1);
}