# SPX Put Seller

A command-line tool for screening SPX put options to sell based on customizable criteria. Fetches live option chain data from Yahoo Finance and automatically selects the highest strike (closest to SPX price) that matches your filter criteria.

## Purpose

This tool is designed for put-selling strategies where you want to:
- Sell out-of-the-money SPX puts
- Find puts with specific minimum bid prices
- Target puts at a certain distance from the current SPX price
- Automatically select the "safest" option (highest strike) among matches

## How It Works

1. Fetches current SPX price from Yahoo Finance
2. Downloads live option chain data
3. Applies your SQL-like filter criteria
4. **Selects the highest strike price that matches** (closest to current SPX)
5. Shows the selected option with context (strikes above/below)

## Usage

```bash
node spx-put-seller.js --filter "YOUR_FILTER_CRITERIA"
```

### Available Filter Fields

- `bid` - The bid price of the option
- `ask` - The ask price of the option
- `strike` - The strike price
- `volume` - Trading volume
- `awayfromstrike` - Absolute distance from current SPX price
- `distance_from_spx` - Signed distance (negative = above SPX)

### Filter Operators

- `>`, `>=`, `<`, `<=`, `=`, `==`
- `AND`, `OR` for combining conditions

## Examples

### Find puts 300+ points below SPX with at least $0.50 bid
```bash
node spx-put-seller.js --filter "bid>=0.50 AND awayfromstrike>300"
```

### Find puts between 200-400 points away from SPX
```bash
node spx-put-seller.js --filter "awayfromstrike>200 AND awayfromstrike<400"
```

### Find liquid puts (volume > 1000) with decent premiums
```bash
node spx-put-seller.js --filter "volume>1000 AND bid>=1.00"
```

### Find puts below 5800 strike with any bid
```bash
node spx-put-seller.js --filter "strike<5800 AND bid>0"
```

### Use a different expiration (0 = nearest)
```bash
node spx-put-seller.js --filter "bid>=0.50" --expiration 1
```

## Output Example

```
📊 Fetching current SPX data...
🎯 Current SPX: $5982.72
📡 Fetching live option chain from Yahoo Finance...
📅 Using expiration: 2025-06-17

Found 25 matching puts

📈 Option Chain Context:
Strike  | Bid    | Ask    | Last   | Volume | Distance | Match
--------|--------|--------|--------|--------|----------|------
5675    |   0.95 |   1.10 |   1.00 |    450 |      308 | 
5680    |   1.05 |   1.20 |   1.10 |    892 |      303 | ← SELECTED
5685    |   1.15 |   1.30 |   1.20 |    234 |      298 | 

💸 Order preview
    SELL 1 SPX 5680P
    LIMIT 1.05   Credit $105.00
```

## Strategy Notes

- The tool always selects the **highest strike** among matches (closest to SPX)
- This selection method prioritizes safety over premium
- For more aggressive selection, use tighter filters
- Check bid/ask spreads - wide spreads indicate low liquidity
- Consider using `--dry` flag to suppress order preview

## Options

- `--filter` (required) - SQL-like filter criteria
- `--expiration` - Expiration index (0 = nearest, 1 = next, etc.)
- `--dry` - Don't show order preview
- `--csv` - Use CSV file instead of live data (legacy)