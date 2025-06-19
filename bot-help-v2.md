# Lee's AI Trading Bot - v2

## :bar_chart: Quote Commands:
• `q TSLA` or `quote AAPL` - Get current price
• "what's SPX at?" - Natural language quotes
• Real-time price data with change indicators

## :dart: SPX Deep Premium (ADVANCED COMMANDS):
**Required Format:** `spx td[0|1] minbid[amount] distance[points]`

### Conservative Strategies:
• `spx td1 minbid2.5 distance350` - Safe premium collection
• `spx td1 minbid3.0 distance400` - Ultra-safe, high premium
• `spx td0 minbid1.0 distance250` - Conservative 0DTE

### Balanced Strategies:
• `spx td1 minbid2.0 distance300` - **Standard 1DTE (recommended)**
• `spx td1 minbid1.5 distance250` - Moderate risk/reward
• `spx td0 minbid0.8 distance200` - Standard 0DTE

### Aggressive Strategies:
• `spx td1 minbid1.0 distance200` - Higher risk/reward
• `spx td1 minbid0.5 distance150` - Close to money
• `spx td0 minbid0.3 distance100` - 0DTE scalping (extreme risk)

### Market Condition Strategies:
• `spx td1 minbid4.0 distance500` - High volatility days
• `spx td1 minbid5.0 distance600` - Maximum premium hunting
• `spx td1 minbid1.2 distance280` - Quiet market conditions

**Parameters:**
- `td1` = 1 day to expiration, `td0` = same day (0DTE)
- `minbid2.0` = Minimum $2.00 bid requirement
- `distance300` = 300 points below current SPX price

## :clipboard: Order Management:
• `orders` or `order status` - View all order statuses
• Interactive buttons for trade execution
• Real-time order tracking (filled, pending, cancelled)

## :robot: Scripts (Advanced Multi-Query Analysis):
*Coming Soon - Intelligent recommendation engine*

### Market Intelligence Scripts (Future):
• `market-scan auto-recommend` - Analyze conditions and suggest strategies
• `intelligent-recommend current-market` - AI-powered strategy selection
• `optimize-portfolio risk-medium` - Portfolio optimization

### Strategy Analysis Scripts (Future):
• `analyze-strategies conservative balanced aggressive` - Compare approaches
• `multi-timeframe-analysis` - Cross-timeframe market analysis
• `risk-assessment current-strategy` - Risk evaluation and scoring

## :hammer_and_wrench: Current Templates:
• **quote1** - Price display with change indicators
• **optionschain1** - Strike/Bid/Ask/Distance grid
• **order1** - Execution summary with safety metrics
• **orderstatus1** - Order tracking (filled, pending, cancelled)
• **help1** - Bot documentation and command guidance (triggers: hi, hello, help, start)
• **recommendation1** - Intelligent suggestions (for future scripts)
• **comparison1** - Multi-strategy analysis (for future scripts)
• **reasoning1** - AI explanations and market analysis (for future scripts)

## :zap: Quick Start Examples:
```
q SPX                                    # Check SPX price
spx td1 minbid2 distance300             # Standard 1DTE scan
spx td1 minbid2.5 distance350           # Conservative scan
spx td0 minbid0.8 distance200           # 0DTE scan
orders                                   # Check order status
```

## :warning: Important Notes:
- All SPX parameters are **REQUIRED** (no more simple `spx 1` commands)
- Old formats will show helpful error messages
- Refresh scan preserves your exact command parameters
- Auto/Manual execution modes available