# CLAWD Project Brief — E*TRADE Auto Trader (Terminal)

This repo is a **Node.js CLI** that:
1. Loads an SPX option-chain CSV (`strike,bid,ask,volume`).
2. Fetches current SPX spot from Yahoo Finance.
3. Computes `distance_from_spx = spot - strike`.
4. Applies a simple SQL‑style filter string passed via `--filter`.
5. Picks **first qualifying contract** (highest strike) and prints a mock sell‑order ticket.

### How to run
```bash
npm i
node index.js --csv path/to/chain.csv --filter "bid>=0.05 AND distance_from_spx>=300"
```

### Extend
Replace `src/dataLoader.js` with a live E*TRADE API call, or pipe real‑time data on the fly.

That’s it — minimal boilerplate so Claude can jump straight into coding enhancements.