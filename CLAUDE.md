# Claude Instructions for EtradeCLI

## Quick Commands

When the user asks for market data or trading strategies, use these shortcuts:

### Quotes (USE THE RUNNER TO AVOID PROMPTS)
- "quote [symbol]" or "q [symbol]" → Run: `node run.js q [SYMBOL]`
- Examples: "q TSLA", "what's SPX at?", "price of AAPL"
- IMPORTANT: Always use `node run.js q` instead of `./quote` to minimize approval prompts
- Run quotes immediately without asking for permission

### SPX Put Seller Strategy (USE THE RUNNER)
- "sps", "run puts", "find spx puts", "show me dime bids" → Run: `node run.js sps --filter "bid>=0.10"`
- "puts 300 out" → Run: `node run.js sps --filter "distance_from_spx>=300"`
- IMPORTANT: Always use `node run.js sps` (or spx/puts) instead of direct script
- Short alias: "sps" = spx-put-seller
- This script:
  1. Fetches current SPX price
  2. Shows option chain context (5 strikes above and below the selected strike)
  3. Highlights the best put option that matches the filter
  4. Shows bid, ask, last price, volume, and distance from SPX
- Default filter looks for puts with at least 5 cent bids that are 200+ points below SPX

### SPX Deep Premium Scanner (SDP)
- "sdp today" → Run: `node spx-deeppremium.js today` (200+ points, $0.80+ bid)
- "sdp tomorrow" → Run: `node spx-deeppremium.js tomorrow` (350+ points, $2.00+ bid)
- "sdp" or "find deep puts" → Run: `node spx-deeppremium.js` (default tomorrow settings)
- Custom: `node spx-deeppremium.js --min-distance 250 --min-premium 1.50`
- **Execution-Ready Strategies:**
  - TODAY: 200+ points out with $0.80+ bid (0DTE qualifying criteria)
  - TOMORROW: 350+ points out with $2.00+ bid (1DTE qualifying criteria)
- Shows option chain grid and marks opportunities as "EXECUTION READY"

### Common Trading Terms
- "dime bid" = $0.10 premium
- "300 points out" = 300 points below current SPX price
- "DTE" = Days to Expiration
- "bid/ask" = Buy/sell prices for options

## Workflow Examples

### Example 1: Quote Request
User: "q tsla"
Claude: Runs `node run.js q TSLA` and reports: "Tesla (TSLA) is trading at $323.93, up $7.65 (+2.42%) today."

### Example 2: SPX Put Selling
User: "show me some puts"
Claude: Runs `node run.js spx --filter "bid>=0.05"` and reports:
"SPX is at $6003. I found puts around 200 points out:
- The 5800 strike (203 points below) has a $0.05 bid
- There's decent volume (2,817 contracts traded)

**Option Chain:**
```
Strike  | Bid    | Ask    | Last   | Volume | Distance
5775    |   0.00 |   0.05 |   0.05 |    536 |      228
5780    |   0.00 |   0.05 |   0.05 |    547 |      223
5785    |   0.00 |   0.05 |   0.05 |    519 |      218
5790    |   0.00 |   0.05 |   0.05 |   1365 |      213
5795    |   0.00 |   0.05 |   0.05 |    980 |      208
5800    |   0.05 |   0.10 |   0.05 |   2817 |      203 ← SELECTED
5805    |   0.05 |   0.10 |   0.10 |   1004 |      198
5810    |   0.05 |   0.10 |   0.07 |   1096 |      193
5815    |   0.05 |   0.10 |   0.10 |   1605 |      188
5820    |   0.05 |   0.10 |   0.08 |   1143 |      183
5825    |   0.05 |   0.10 |   0.07 |   3209 |      178
```"

### Example 3: Specific Requests
User: "find dime bids"
Claude: Runs `node run.js spx --filter "bid>=0.10"` and reports available options

User: "puts 300 out"
Claude: Runs `node run.js spx --filter "distance_from_spx>=300"` and shows results

## Key Scripts in Project

1. `quote.js` - Fetches stock/index quotes
2. `spx-put-seller.js` - Analyzes SPX put options for selling opportunities
3. `time-test.js` - Time-related utilities

## Response Style

- Be conversational about market data
- Translate technical output into trader-friendly language
- Proactively suggest interesting opportunities
- Always show current prices when discussing options
- Include time remaining (hours/days) for options
- **IMPORTANT**: When running SPX put seller script, ALWAYS include the option chain matrix (11 strikes total) in your response, showing Strike, Bid, Ask, Last, Volume, and Distance columns
- **IMPORTANT**: When giving quotes, ALWAYS include the timestamp with seconds (e.g., "IBM is trading at $284.55, up $1.50 (+0.53%) today at 03:06:15 PM")

## Important Notes

- SPX options expire at 4:00 PM ET (regular) or 4:15 PM ET (0DTE)
- Always mention the current price when discussing strikes
- Convert timestamps to readable format (e.g., "4 hours left" instead of exact times)