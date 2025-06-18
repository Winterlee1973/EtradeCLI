# EtradeCLI

A command-line interface for real-time stock quotes and SPX options trading strategies.

## Quick Start

### Using with Claude Code (Recommended)

To minimize approval prompts when using with Claude, use the universal runner:

```bash
# Get a quote - just say:
"q msft"
"quote tesla"
"what's SPX at?"

# Run SPX put seller - just say:
"sps"
"run puts"  
"find spx puts with dime bids"
"show me puts 300 points out"
```

Claude will automatically run the appropriate commands.

**First time setup**: When you first use a command, select option 2: "Yes, and don't ask again for node run.js commands in this directory"

### Direct Terminal Usage

```bash
# Get quotes
./quote TSLA
node quote.js AAPL

# Run SPX put seller
node spx-put-seller.js --filter "bid>=0.10"
node spx-put-seller.js --filter "bid>=0.05 AND distance_from_spx>=300"
```

## Features

### Stock Quotes (`quote.js`)
- Real-time stock prices via Yahoo Finance
- Shows company name, price, change, and percentage
- Timestamps with seconds precision
- Supports index shortcuts (SPX → ^SPX, VIX → ^VIX)

### SPX Put Seller (`spx-put-seller.js`)
- Live SPX price and option chains from Yahoo Finance
- SQL-style filtering for finding opportunities
- Shows 11-strike context window (5 above, 5 below selected)
- Displays bid, ask, last, volume, and distance from spot
- Highlights selected strike with order preview

## Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `quote.js` | Get stock/index quotes | `./quote TSLA` |
| `spx-put-seller.js` | Find SPX puts to sell | `node spx-put-seller.js --filter "bid>=0.10"` |
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

### SPX Put Seller Examples
```bash
# Find puts with at least 10 cent bid (using short alias)
node run.js sps --filter "bid>=0.10"

# Find puts 300+ points out of the money
node run.js sps --filter "distance_from_spx>=300"

# Combine filters
node run.js sps --filter "bid>=0.05 AND distance_from_spx>=200"

# Additional filters (all aliases work: sps, spx, puts)
node run.js sps --filter "bid>=0.15 AND volume>=100"
```

### Terminal Aliases

For direct terminal usage, you can create bash aliases:

```bash
# Add to your ~/.bashrc or ~/.zshrc
alias q='node /path/to/EtradeCLI/run.js q'
alias sps='node /path/to/EtradeCLI/run.js sps'

# Then use directly:
q TSLA
sps --filter "bid>=0.10"
```

## Filter Reference

| Filter | Description |
|--------|-------------|
| `bid>=0.10` | Minimum bid of 10 cents |
| `ask<=0.20` | Maximum ask of 20 cents |
| `distance_from_spx>=300` | Strike at least 300 points below SPX |
| `volume>=100` | Minimum volume of 100 contracts |
| `bid>=0.05 AND distance_from_spx>=200` | Combine with AND |
| `bid>=0.15 OR volume>=1000` | Combine with OR |

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