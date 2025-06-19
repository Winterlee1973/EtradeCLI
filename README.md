# EtradeCLI - Modular Trading Strategy Framework

A conversational and automated trading analysis tool designed for Claude Code terminal sessions and Slack integration.

## Access Methods

### 1. Terminal + Claude Code
- **Interactive AI Assistant**: Claude can converse about market data and execute strategies
- **Natural Language**: "q TSLA", "find deep puts", "what's SPX at?"
- **Direct Commands**: `spx 1 1`, `node run.js q AAPL`

### 2. Slack Integration
- **Direct Commands**: `spx 1`, `sdp 0`, `q TSLA`
- **Scheduled Scans**: Automated cron jobs for market alerts
- **Rich Formatting**: Interactive buttons and structured displays

## Architecture Overview

### Modular Strategy System
```
strategy-framework.js     → Base classes and registry
shared-templates.js       → Reusable formatting templates  
claude-integration.js     → AI assistant conversational interface
strategies/               → Individual strategy implementations
  ├── spx-deep-premium-strategy.js
  ├── quote-strategy.js
  └── [future strategies]
```

### Template System

**Templates are modular and reusable across strategies:**

#### `quote1` - Simple Price Display
- **Terminal**: Symbol, price, change, timestamp
- **Slack**: Rich blocks with fields

#### `optionschain1` - Standard Grid (Strike/Bid/Ask/Distance)
- **Terminal**: Monospace table with markers (🎯✅💰)
- **Slack**: Code block table with converted markers (→✓$)

#### `order1` - Execution Summary
- **Terminal**: Trade details with safety meter
- **Slack**: Interactive buttons (Execute/Refresh/Trade Anyway)

#### `orderstatus1` - Order Tracking
- **Terminal**: All order statuses (filled, pending, cancelled, etc.)
- **Slack**: Grouped status display with action buttons

### Strategy Presets

Strategies combine templates for consistent output:

```javascript
spxDeepPremium: {
  templates: ['quote1', 'optionschain1', 'order1'],
  // Uses standardized Strike/Bid/Ask grid + execution summary
}

orderStatus: {
  templates: ['orderstatus1'],
  // Shows all order statuses (filled, pending, cancelled)
}

simpleQuote: {
  templates: ['quote1'],
  // Uses basic price display
}
```

## Quick Commands

### Quotes
```bash
node run.js q TSLA        # Direct quote
```
**Claude**: "q TSLA", "what's SPX at?", "quote AAPL"

### SPX Deep Premium Scanner
```bash
node spx-deeppremium.js 0     # 0DTE (same day)
node spx-deeppremium.js 1     # 1DTE (next trading day) 
node spx-deeppremium.js 1 1.5 # Custom premium target
```
**Claude**: "spx 1 1", "find deep puts", "sdp 0"

## Current Strategies

### 1. SPX Deep Premium (`spx-deep-premium`)
- **Purpose**: Find deep OTM SPX puts with high premium
- **Templates**: `quote1` + `optionschain1` + `order1`
- **Output**: Current SPX price, option chain grid, execution summary
- **Commands**: `spx 0`, `spx 1`, `spx 1 1.50`

### 2. Quote (`quote`) 
- **Purpose**: Real-time stock/index quotes
- **Templates**: `quote1`
- **Output**: Symbol, price, change, timestamp
- **Commands**: `q SYMBOL`

### 3. Order Status (`order-status`)
- **Purpose**: Track all order statuses and history
- **Templates**: `orderstatus1`
- **Output**: Filled, pending, cancelled orders with summary
- **Commands**: `order status`, `orders`

## Adding New Strategies

### 1. Create Strategy File
```javascript
// strategies/my-new-strategy.js
import { TradingStrategy, ScanResult, registry } from '../strategy-framework.js';
import { SharedTemplates, TemplatePresets } from '../shared-templates.js';

class MyStrategy extends TradingStrategy {
  constructor() {
    super('my-strategy', 'Description of strategy');
  }
  
  // Choose your templates
  getTemplates() {
    return ['optionschain1', 'order1']; // Reuse existing
  }
  
  async scan(params) {
    // Implementation using shared templates
    // this.scanResult = new MyScanResult();
  }
}

// Auto-register
registry.register(new MyStrategy());
```

### 2. Update Claude Integration
```javascript
// claude-integration.js - add pattern detection
isMyStrategyRequest(command) {
  return /my.*pattern/i.test(command);
}
```

### 3. Add to Scheduler (Optional)
```javascript
// scheduler.js - add cron job
cron.schedule('0 9 * * 1-5', async () => {
  const runner = createRunner('my-strategy');
  const result = await runner.execute();
  // Send to Slack
});
```

## File Structure

```
EtradeCLI/
├── README.md                          # This file
├── CLAUDE.md                          # Claude Code instructions
├── strategy-framework.js              # Base architecture
├── shared-templates.js                # Template system (quote1, optionschain1, orders1)
├── claude-integration.js              # AI conversation interface
├── scheduler.js                       # Cron jobs for automated scans
├── slack-bot.js                       # Slack command handling
├── slack-formatter.js                 # Slack-specific formatting (uses templates)
├── run.js                             # Command runner
├── spx-deeppremium.js                 # SPX strategy (legacy, being migrated)
├── quote.js                           # Quote strategy (legacy)
├── strategies/                        # Strategy implementations
│   ├── spx-deep-premium-strategy.js   # SPX using new framework
│   └── quote-strategy.js              # Quote using new framework
└── [other legacy files]               # Utilities, configs, etc.
```

## Development Workflow

### For Claude Code Sessions:
1. Claude can run any command: `node run.js q TSLA`
2. Claude can parse natural language: "what's SPX at?"
3. Claude gets conversational responses using `claude-integration.js`

### For Slack Integration:
1. Commands use `slack-bot.js` → `strategy-framework.js` → `shared-templates.js`
2. Consistent formatting between manual and scheduled runs
3. Interactive buttons for trade execution

### For New Strategies:
1. Inherit from `TradingStrategy` base class
2. Choose appropriate templates: `quote1`, `optionschain1`, `order1`, `orderstatus1`, etc.
3. Auto-register with the framework
4. Add conversational patterns to Claude integration

## Template Evolution

As strategies grow, new templates can be added:
- `optionschain2` - Extended data with Vol/OI/IV
- `optionschain3` - Spread analysis
- `order2` - Multi-leg order management
- `orderstatus2` - Advanced order analytics
- `quote2` - Extended fundamental data
- `risk1` - Portfolio risk metrics

Templates remain backward compatible, and strategies can migrate incrementally.

## Environment Variables

```bash
SLACK_BOT_TOKEN=xoxb-...          # Slack bot token
SLACK_USER_ID=U...                # Target user for DMs
AUTO_SCHEDULED=true               # Set by cron jobs
NODE_ENV=development              # Enable debug features
```

## Scheduled Runs

- **0DTE Alerts**: Tue/Wed/Thu at 9:40 AM EST
- **1DTE Alert**: Friday at 3:50 PM EST  
- **Test Scans**: Every 5 minutes during market hours (dev mode)

All scheduled runs use the same templates as manual commands for consistency.

## Legacy Commands (Backwards Compatible)

### Stock Quotes (`quote.js`)
```bash
./quote TSLA
node quote.js AAPL
```

### SPX Deep Premium Scanner (`spx-deeppremium.js`)
```bash
node spx-deeppremium.js 0        # 0DTE (same day)
node spx-deeppremium.js 1        # 1DTE (next trading day)
```

## Trading Notes

- **SPX Options**: Trade until 4:15 PM ET (0DTE)
- **Dime bid**: $0.10 premium
- **Distance**: Points between current SPX price and strike
- **Deep premium**: High-probability trades far out of the money

## Next Steps

- Add E*TRADE API integration for real orders
- Support for call options and spreads
- Portfolio tracking and risk management
- Additional strategies (iron condors, strangles, etc.)