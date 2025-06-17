# E*TRADE Auto Trader (Terminal Edition)

**Purpose**  
Quick‑start Node.js CLI for **screening SPX weekly put options** with SQL‑style filters
and simulating “sell 1 contract” orders.  
Built so you can plug in **real E*TRADE API calls later**.

——  
### Features
* **Live SPX price** via Yahoo Finance.
* **CSV loader** – pass in a full option chain (e.g. exported from your broker).
* **SQL‑ish filter** – exactly like:
  ```sql
  symbol='SPX' AND type='put' AND bid>=0.05 AND distance_from_spx>=300
  ```
* Chooses **first (highest‑strike) contract** that matches, per Lee’s spec.
* Prints mock order ticket + premium received.
* 100% offline if you use the bundled sample data.

——  
### Install

```bash
git clone <your‑fork‑url>
cd etrade_auto_trader_terminal
npm i     # installs dependencies
```

——  
### Usage

```
node index.js --csv sample_data/spx_puts_sample.csv --filter "bid>=0.05 AND distance_from_spx>=300"
```

Flags | Meaning
----- | -------
`--csv` | Path to CSV with at least `strike,bid,ask,volume` columns.
`--filter` | SQL‑ish filter string (see examples below).
`--dry` | (Optional) Do **not** “place” the mock order; just show candidate.

——  
### Filter Cheat‑Sheet

| Expression | Result |
|------------|--------|
| `bid>=0.10` | Bid 10¢ or more |
| `distance_from_spx>=500` | Put strike ≥500 pts below spot |
| Combine with `AND` / `OR` | `(bid>=0.05 AND distance_from_spx>=300)` |

Distance is computed on the fly:  
`distance_from_spx = spot_price - strike`

——  
### Sample session

```bash
$ node index.js --csv sample_data/spx_puts_sample.csv --filter "bid>=0.05 AND distance_from_spx>=300"

Spot SPX: 5 950.12
Found 217 matching puts
Selected 5 650p @ 0.05 (distance 300 pts)
💸  Order preview
     SELL  1  SPX W 2025‑06‑18 5650P
     LIMIT 0.05   Credit  $5.00
```

——  
### Next Steps

* Replace the CSV loader with live pulls from E*TRADE (see `/todo/etrade_integration.md`).
* Add OAuth flow and account selection.
* Expand to calls / spreads / multi‑leg.
* Wrap everything in a Dockerfile.

——  
### Credits
Written for **Lee** by **GPT‑4o** · 2025‑06‑17  
Licensed MIT.