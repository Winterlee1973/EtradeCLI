# Claude Instructions for EtradeCLI

## Commands vs Scripts Architecture

**COMMANDS** (Current - Fast, Direct Execution):
- Single-query focus with specific parameters
- Auto/Manual execution modes  
- Examples: SPX scans, quotes, order status

**SCRIPTS** (Future - Multi-Query Intelligence):
- Complex analysis with recommendations
- Market condition awareness
- Cross-strategy comparisons
- AI-powered decision making

## Quick Commands

When the user asks for market data or trading strategies, use these shortcuts:

### Quotes (USE THE RUNNER TO AVOID PROMPTS)
- "quote [symbol]" or "q [symbol]" → Run: `node run.js q [SYMBOL]`
- Examples: "q TSLA", "what's SPX at?", "price of AAPL"
- IMPORTANT: Always use `node run.js q` instead of `./quote` to minimize approval prompts
- Run quotes immediately without asking for permission


### SPX Deep Premium Scanner (SQL FORMAT)
**New SQL Format:** `spx WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300`
**Shell Usage:** `node spx-deeppremium.js 'WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300'`

#### Quick Command Reference:
- **Conservative:** `spx WHERE tradingdays=1 AND minbid>=2.50 AND distance>=350` - Safe premium collection
- **Standard:** `spx WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300` - Recommended 1DTE strategy  
- **Aggressive:** `spx WHERE tradingdays=1 AND minbid>=1.00 AND distance>=200` - Higher risk/reward
- **0DTE Safe:** `spx WHERE tradingdays=0 AND minbid>=0.80 AND distance>=200` - Same day expiration
- **High Vol:** `spx WHERE tradingdays=1 AND minbid>=4.00 AND distance>=500` - Crazy market days
- **Premium Hunt:** `spx WHERE tradingdays=1 AND minbid>=5.00 AND distance>=600` - Maximum premium focus

#### Strategy Categories:
**Conservative Strategies:**
- `spx WHERE tradingdays=1 AND minbid>=2.50 AND distance>=350` - High premium, far OTM (safer)
- `spx WHERE tradingdays=1 AND minbid>=3.00 AND distance>=400` - Premium hunting, ultra-safe distance
- `spx WHERE tradingdays=0 AND minbid>=1.00 AND distance>=250` - 0DTE conservative with decent premium

**Balanced Strategies:**
- `spx WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300` - Standard 1DTE strategy (recommended)
- `spx WHERE tradingdays=1 AND minbid>=1.50 AND distance>=250` - Moderate risk, decent premium
- `spx WHERE tradingdays=0 AND minbid>=0.80 AND distance>=200` - Standard 0DTE strategy

**Aggressive Strategies:**
- `spx WHERE tradingdays=1 AND minbid>=1.00 AND distance>=200` - Closer strikes, lower premium threshold
- `spx WHERE tradingdays=1 AND minbid>=0.50 AND distance>=150` - High risk/reward, close to money
- `spx WHERE tradingdays=0 AND minbid>=0.30 AND distance>=100` - 0DTE scalping (extreme risk)

**Complex Queries:**
- `spx WHERE tradingdays=1 AND minbid BETWEEN 2.00 AND 4.00 AND distance>=300` - Premium range targeting
- `spx WHERE tradingdays=0 AND minbid>1.50 AND distance<=200` - Aggressive 0DTE with max distance
- `spx WHERE tradingdays=1 AND minbid<5.00 AND distance>=500` - Deep OTM with premium limit

#### Parameters Explained:
- **tradingdays=1** = Time to expiration (1 day), **tradingdays=0** = same day (0DTE)
- **minbid>=2.00** = Minimum $2.00 bid requirement (premium threshold)
- **distance>=300** = 300+ points below current SPX price (safety buffer)
- **Operators**: `=`, `>`, `<`, `>=`, `<=`, `BETWEEN value1 AND value2`

**Legacy Format Still Supported**: `spx td1 minbid2 distance300`

### Future Scripts (Not Yet Implemented)
When these become available, use for complex analysis:

**Market Intelligence Scripts:**
- "analyze market conditions" → `market-scan auto-recommend`
- "what's the best strategy right now?" → `intelligent-recommend current-market`
- "compare strategies" → `analyze-strategies conservative balanced aggressive`

**Portfolio Optimization Scripts:**
- "optimize my approach" → `optimize-portfolio risk-medium`
- "suggest best entry" → `market-intelligence-report`
- "adjust for market conditions" → `auto-adjust current-positions`

**Advanced Analysis Scripts:**
- "multi-timeframe analysis" → `market-scan multi-timeframe`
- "risk assessment" → `assess-risk current-strategy`
- "historical pattern analysis" → `pattern-analysis spx-premium`

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
Claude: Runs `node spx-deeppremium.js 1` and reports:
"SPX is at $6003. Scanning for 1DTE opportunities (300+ points out, $2.00+ bid):
✅ FOUND: 1 qualifying opportunity
💰 BEST: 5700P @ $2.15 (303 pts out)
💵 CREDIT: $215 per contract"


## Key Scripts in Project

1. `quote.js` - Fetches stock/index quotes
2. `spx-deeppremium.js` - Scans for deep premium SPX opportunities  
3. `time-test.js` - Time-related utilities
4. `bot-help-v2.md` - Template source for help documentation (help1 template)

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