# EtradeCLI

A command-line interface for real-time stock quotes and deep premium SPX options scanning.

## Quick Start

### Using with Claude Code (Recommended)

To minimize approval prompts when using with Claude, use the universal runner:

```bash
# Get a quote - just say:
"q msft"
"quote tesla"
"what's SPX at?"

# Run SPX deep premium scanner - just say:
"sdp today"
"sdp tomorrow"  
"find deep puts"
```

Claude will automatically run the appropriate commands.

**First time setup**: When you first use a command, select option 2: "Yes, and don't ask again for node run.js commands in this directory"

### Direct Terminal Usage

```bash
# Get quotes
./quote TSLA
node quote.js AAPL

# Run SPX deep premium scanner
node spx-deeppremium.js today
node spx-deeppremium.js tomorrow
```

## Features

### Stock Quotes (`quote.js`)
- Real-time stock prices via Yahoo Finance
- Shows company name, price, change, and percentage
- Timestamps with seconds precision
- Supports index shortcuts (SPX → ^SPX, VIX → ^VIX)

### SPX Deep Premium Scanner (`spx-deeppremium.js`)
- Live SPX price and option chains from Yahoo Finance
- Scans for deep out-of-the-money premium opportunities
- TODAY mode: 0DTE options 200+ points out with $0.80+ bid
- TOMORROW mode: 1DTE options 350+ points out with $2.00+ bid
- Shows option chain context with qualifying strikes highlighted

## Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `quote.js` | Get stock/index quotes | `./quote TSLA` |
| `spx-deeppremium.js` | Scan deep SPX premiums | `node spx-deeppremium.js today` |
| `run.js` | Universal runner for Claude | `node run.js q TSLA` |

## Command Examples

### Quote Examples
```bash
# Using the runner (for Claude)
node run.js q TSLA
node run.js quote SPX

# Direct usage
./quote MSFT
./quote ^GSPC  # S&P 500
```

### SPX Deep Premium Examples
```bash
# Scan today's 0DTE opportunities
node run.js sdp today

# Scan tomorrow's 1DTE opportunities
node run.js sdp tomorrow

# Custom parameters
node spx-deeppremium.js --min-distance 300 --min-premium 1.50
```

### Terminal Aliases

For direct terminal usage, you can create bash aliases:

```bash
# Add to your ~/.bashrc or ~/.zshrc
alias q='node /path/to/EtradeCLI/run.js q'
alias sdp='node /path/to/EtradeCLI/run.js sdp'

# Then use directly:
q TSLA
sdp today
```

## Deep Premium Strategy Reference

| Strategy | Distance | Min Bid | Use Case |
|----------|----------|---------|----------|
| TODAY (0DTE) | 200+ points | $0.80+ | Same-day expiration trades |
| TOMORROW (1DTE) | 350+ points | $2.00+ | Next-day expiration setup |
| Custom | User defined | User defined | Flexible scanning parameters |

## Troubleshooting

### Approval Prompts in Claude
1. Use `node run.js` instead of direct commands
2. On first use, select "don't ask again for node run.js commands"
3. This creates a single approval for all operations

### Yahoo Finance Warnings
The "redirect to guce.yahoo.com" warning is normal and can be ignored if data loads successfully.

### Invalid Symbols
If a symbol returns an error, verify it's:
- Currently listed and trading
- Using the correct ticker symbol
- Using ^ prefix for indices (^SPX, ^VIX)

### Bad Expiration Dates
Yahoo Finance API sometimes returns invalid dates. The data is usually still valid despite the date display issue.

## Trading Notes

- **SPX Options**: Trade until 4:15 PM ET (0DTE)
- **Dime bid**: $0.10 premium
- **Distance**: Points between current SPX price and strike
- **Put selling**: Collect premium, obligated to buy at strike if assigned

## Next Steps

- Add E*TRADE API integration for real orders
- Support for call options and spreads
- Portfolio tracking
- Risk management tools