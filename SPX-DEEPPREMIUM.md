# SPX Deep Premium Scanner

A specialized script for finding high-premium SPX put options that are deep out of the money, typically for next-day expiration.

## Overview

The SPX Deep Premium Scanner finds tomorrow's SPX puts with significant premium values, focusing on strikes that are deep OTM (out of the money). This is useful for identifying high-reward opportunities while maintaining distance from current price levels.

## Usage

### With Claude Code
Just say:
- "spx 1"
- "run deep premium" 
- "find deep puts"
- "deep puts 250 out"

### Direct Command Line
```bash
node spx-deeppremium.js 1
node spx-deeppremium.js 1 --min-distance 250
node spx-deeppremium.js 1 --min-premium 1.50
```

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--min-premium` | $2.00 | Minimum bid premium required |
| `--min-distance` | 300 | Minimum points below SPX price |
| `--max-results` | 20 | Maximum number of results to show |

## Examples

```bash
# Find puts with $3+ premium, 400+ points out
node spx-deeppremium.js 1 --min-premium 3.00 --min-distance 400

# Find puts 200+ points out with $1+ premium
node spx-deeppremium.js 1 --min-premium 1.00 --min-distance 200

# Show top 10 deep premium opportunities
node spx-deeppremium.js 1 --max-results 10
```

## Output Format

The script displays:
- Current SPX price and timestamp
- Tomorrow's expiration date
- All qualifying puts sorted by highest premium
- Strike, bid, ask, premium amount, distance from SPX
- Time until expiration

## Trading Strategy

Deep premium scanning is used for:
- **High premium collection**: Target puts with $2+ premiums
- **Safety margin**: 300+ points OTM provides buffer
- **Next-day expiration**: Capture time decay quickly
- **Volume consideration**: Higher premiums often have lower volume

## Risk Considerations

- **Assignment risk**: Deep OTM puts can still be assigned in extreme market moves
- **Liquidity**: Higher premium puts may have wider bid/ask spreads
- **Market events**: Overnight news can cause significant SPX gaps
- **Time decay**: Premium erodes rapidly as expiration approaches

## Integration with Other Scripts

- Use `spx 0` for current-day opportunities (0DTE)
- Use `spx 1` for next-day high-premium hunting (1DTE)
- Both scripts show 11-strike context windows for decision making

## Expected Results

Typical SPX results show:
- 5-15 qualifying put options
- Premiums ranging from $2.00 to $10.00+
- Strikes 300-800 points below current SPX
- Next business day expiration (usually 0-1 DTE)