# Claude Instructions for EtradeCLI

## Quick Commands

When the user asks for market data or trading strategies, use these shortcuts:

### Quotes (USE THE RUNNER TO AVOID PROMPTS)
- "quote [symbol]" or "q [symbol]" → Run: `node run.js q [SYMBOL]`
- Examples: "q TSLA", "what's SPX at?", "price of AAPL"
- IMPORTANT: Always use `node run.js q` instead of `./quote` to minimize approval prompts
- Run quotes immediately without asking for permission


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
User: "show me deep puts"
Claude: Runs `node run.js sdp today` and reports:
"SPX is at $6003. Scanning for 0DTE opportunities (200+ points out, $0.80+ bid):
✅ FOUND: 2 qualifying opportunities
💰 BEST: 5775P @ $0.85 (228 pts out)
💵 CREDIT: $85 per contract"


## Key Scripts in Project

1. `quote.js` - Fetches stock/index quotes
2. `spx-deeppremium.js` - Scans for deep premium SPX opportunities
3. `time-test.js` - Time-related utilities

## Response Style

- Be conversational about market data
- Translate technical output into trader-friendly language
- Proactively suggest interesting opportunities
- Always show current prices when discussing options
- Include time remaining (hours/days) for options
- **IMPORTANT**: When running SPX deep premium scanner, always show the execution summary and relevant portion of the option chain
- **IMPORTANT**: When giving quotes, ALWAYS include the timestamp with seconds (e.g., "IBM is trading at $284.55, up $1.50 (+0.53%) today at 03:06:15 PM")

## Important Notes

- SPX options expire at 4:00 PM ET (regular) or 4:15 PM ET (0DTE)
- Always mention the current price when discussing strikes
- Convert timestamps to readable format (e.g., "4 hours left" instead of exact times)