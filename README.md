# PokeSheet

A lightweight Pokémon TCG collection and price tracker built with Google Sheets and Apps Script.

## Features

- Fast sidebar card entry
- TCGdex card/set metadata, images, variants, and TCGplayer Product IDs
- Normal, Holo, Reverse, and custom/unlisted printing support
- Duplicate detection with automatic quantity increments
- Verified PriceCharting links matched by exact TCGplayer Product ID
- Raw TCGplayer comparison price from PriceCharting
- PSA 10 price, sold-listing count, and sales volume from PriceCharting
- PSA 10 / raw multiplier
- No account configuration required

## Data sources

**TCGdex** is the card catalog. It supplies search, set/card metadata, images, variants, and TCGplayer Product IDs.

**PriceCharting** is the pricing source. PokeSheet verifies the PriceCharting product page against the exact TCGplayer Product ID before using it. The verified page supplies the TCGplayer comparison raw price plus PSA 10 pricing and sales data.

PriceCharting data is parsed from product-page HTML, so markup changes may require maintenance.

## Sheet contract

| Column | Header |
|---|---|
| A | Set ID |
| B | Card # |
| C | Variant |
| D | Qty |
| E | Name |
| F | Rarity |
| G | Raw $ |
| H | PSA 10 $ |
| I | PSA10 Sales |
| J | PSA10/Raw |
| K | Refresh |
| L | Grade Candidates |
| M | Updated |
| N | TCGplayer ID |
| O | PriceCharting |

The sheet name must be `Collection`.

## Quick start

1. Make a copy of the master tracker.
2. Reload it and authorize Apps Script when Google asks.
3. Use **⚡ Pokémon → ➕ Add cards**.
4. Use **Update prices** to refresh PriceCharting raw and PSA data.

Master tracker:
https://docs.google.com/spreadsheets/d/1MzzMkVgVU4I-rDNRcX0lfRb3zWMuW_FvVD9bwZ8miZk/edit?usp=sharing

## Pricing

A verified PriceCharting page is the single pricing source.

PokeSheet extracts the TCGplayer comparison price into `Raw $`, the PSA 10 price, PSA 10 sold-listing count, and sales volume. `PSA10/Raw` is calculated from those two USD prices.

New cards attempt PriceCharting matching immediately after the TCGplayer Product ID is known. Existing verified links are cached. **Update PriceCharting links** can backfill missing links.

Price updates respect Refresh caching: HIGH = 3 days, LOW = 90 days, and AUTO = 90/30/14/7/3 days based on PSA 10 value (<$25 / $25–49 / $50–99 / $100–249 / $250+). OFF skips automatic refreshes. A card without an Updated timestamp is refreshed on its first run. Raw and PSA data are refreshed together from one page fetch.\n\nPrice updates are capped at 40 PriceCharting product-page fetches per run.

## Custom / unlisted printings

For products that TCGdex does not expose separately, enable **Custom / unlisted printing** and enter the numeric TCGplayer Product ID. That ID becomes part of the printing identity and is used to verify the correct PriceCharting page.

This allows standard and special printings with the same collector number to use the correct pricing page.

## Version

Current source version: **0.2.1**

See `CHANGELOG.md` for release notes and `CLAUDE.md` for architecture and maintenance context.

## License

MIT License. See `LICENSE`.

## Disclaimer

PokeSheet is not affiliated with The Pokémon Company, TCGdex, TCGplayer, PSA, or PriceCharting. Market data can be incomplete, delayed, estimated, or reclassified by its source.
