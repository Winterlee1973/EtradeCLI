# 🤖 Lee's AI Trading Bot - v2

## 📊 **Quote Commands**
• `q TSLA` or `quote AAPL` - Get current price  
• "what's SPX at?" - Natural language quotes  
• Real-time price data with change indicators  

---

## 🎯 **SPX Deep Premium Scanner** 
*Powered by `Spx-DeepPremium.js` - Advanced Options Strategy Engine*

`spx WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300`

### **Conservative Strategies:**
• `spx WHERE tradingdays=1 AND minbid>=2.50 AND distance>=350` - Safe premium collection
• `spx WHERE tradingdays=1 AND minbid>=3.00 AND distance>=400` - Ultra-safe, high premium  
• `spx WHERE tradingdays=0 AND minbid>=1.00 AND distance>=250` - Conservative 0DTE

### **Balanced Strategies:**
• `spx WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300` - **Standard 1DTE (recommended)**
• `spx WHERE tradingdays=1 AND minbid>=1.50 AND distance>=250` - Moderate risk/reward
• `spx WHERE tradingdays=0 AND minbid>=0.80 AND distance>=200` - Standard 0DTE

### **Aggressive Strategies:**
• `spx WHERE tradingdays=1 AND minbid>=1.00 AND distance>=200` - Higher risk/reward
• `spx WHERE tradingdays=1 AND minbid>=0.50 AND distance>=150` - Close to money
• `spx WHERE tradingdays=0 AND minbid>=0.30 AND distance>=100` - 0DTE scalping (extreme risk)

### **Market Condition Strategies:**
• `spx WHERE tradingdays=1 AND minbid>=4.00 AND distance>=500` - High volatility days
• `spx WHERE tradingdays=1 AND minbid BETWEEN 3.00 AND 6.00 AND distance>=300` - Premium hunting
• `spx WHERE tradingdays=1 AND minbid>=1.20 AND distance>=280` - Quiet market conditions

### **Complex Queries:**
• `spx WHERE tradingdays=1 AND minbid BETWEEN 2.00 AND 4.00 AND distance>=300` - Premium range targeting
• `spx WHERE tradingdays=0 AND minbid>1.50 AND distance<=200` - Aggressive 0DTE with max distance
• `spx WHERE tradingdays=1 AND minbid<5.00 AND distance>=500` - Deep OTM with premium limit

---

## **Order Management**
• `orders` - View all order statuses

---

## 🤖 **AI-Powered Natural Language**  
*Intelligent strategy interpretation and suggestions*

### ⚡ **Quick Start Examples:**
```bash
q SPX                                                       # Check SPX price
spx WHERE tradingdays=1 AND minbid>=2.00 AND distance>=300 # Standard 1DTE scan
spx WHERE tradingdays=1 AND minbid>=2.50 AND distance>=350 # Conservative scan
spx WHERE tradingdays=0 AND minbid>=0.80 AND distance>=200 # 0DTE scan
orders                                                      # Check order status
```

### 🗣️ **Natural Language Commands:**
```bash
"premium possibilities going way out"     # AI interprets and suggests strategy
"conservative spx strategy"               # Auto-generates conservative approach  
"suggest aggressive strategies"           # Multiple strategy recommendations
"what should I try for high volatility"  # Context-aware suggestions
```

