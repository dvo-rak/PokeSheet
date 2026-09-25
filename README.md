# PokeSheet

A lightweight Pokémon TCG collection and price tracker built with Google Sheets and Apps Script.

## Features

- Fast card entry from a sidebar
- TCGdex card search, sets, images, variants, raw prices, and TCGplayer Product IDs
- Normal, Holo, Reverse, and custom/unlisted printing support
- Duplicate detection and automatic quantity increments
- Cardmarket EUR and TCGplayer USD raw prices for standard printings
- Verified PriceCharting links matched by exact TCGplayer Product ID
- PSA 10 price, sold-listing count, and sales volume from PriceCharting
- PSA 10 / raw multiplier
- AUTO, HIGH, LOW, and OFF PSA refresh modes
- No account configuration required

## Data sources

**TCGdex** supplies card search, metadata, images, Cardmarket raw pricing, TCGplayer raw pricing, and TCGplayer Product IDs for standard printings.

**PriceCharting** supplies the verified product pages used for PSA 10 pricing, sold-listing count, and sales volume. PokeSheet verifies the TCGplayer Product ID on the matched product page before storing the link in column Q.

PriceCharting data is read from its product pages. If its page structure changes, the parser may require maintenance.

## Sheet contract

| Column | Header |
|---|---|
| A | Set ID |
| B | Card # |
| C | Variant |
| D | Qty |
| E | Name |
| F | Rarity |
| G | Raw CM € |
| H | Raw TCG $ |
| I | PSA 10 $ |
| J | PSA10 Sales |
| K | PSA10/Raw |
| L | PSA Watch |
| M | PSA Updated |
| N | Grade Candidates |
| O | Updated |
| P | TCGplayer ID |
| Q | PriceCharting |

The sheet name must be `Collection`.

Variants: `Normal`, `Holo`, `Reverse`.

PSA Watch: `AUTO`, `HIGH`, `LOW`, `OFF`.

## Google Sheets template

Open the master tracker:
https://docs.google.com/spreadsheets/d/1MzzMkVgVU4I-rDNRcX0lfRb3zWMuW_FvVD9bwZ8miZk/edit?usp=sharing

Keep the master clean and make your own copy before adding collection data.

## Quick start

1. Make a copy of the master tracker.
2. Reload it and authorize Apps Script when Google asks.
3. Use **⚡ Pokémon → ➕ Add cards**.
4. Use **Update raw prices** for raw market data.
5. Use **Update PSA prices** for PriceCharting PSA 10 data.

## Card entry

### Random bulk

Enter a card name and preferably its printed collector number. PokeSheet searches TCGdex and shows matching cards with image and set information.

### Same set

Select a set once and then enter collector numbers. The set list loads dynamically from TCGdex.

### Custom / unlisted printings

For a printing that TCGdex does not expose separately, enable **Custom / unlisted printing**, choose the physical variant, and enter its numeric TCGplayer Product ID.

The Product ID becomes part of that printing's identity and is also used to verify the matching PriceCharting page.

TCGdex may not expose a raw TCGplayer price for a custom printing. PokeSheet preserves an existing Raw TCG value instead of overwriting it during normal raw-price refreshes.

## Pricing

Standard raw prices come from TCGdex:
- Cardmarket in EUR
- TCGplayer in USD

PSA 10 data comes from the verified PriceCharting page in column Q. PokeSheet extracts the PSA 10 price, sold-listing count, and sales volume. Column K is calculated from PSA 10 price divided by Raw TCG price.

If the expected PSA markup cannot be identified safely, PokeSheet keeps the previous PSA value instead of clearing it.

New cards automatically attempt PriceCharting matching after their TCGplayer Product ID is known. Existing verified links are cached. **Update PriceCharting links** can backfill or retry missing links.

PSA updates are capped at 40 PriceCharting page fetches per run.

## PSA refresh behavior

| Mode / PSA 10 price | Refresh |
|---|---:|
| HIGH | 3 days |
| LOW | 90 days |
| AUTO < $25 | 90 days |
| AUTO $25–49 | 30 days |
| AUTO $50–99 | 14 days |
| AUTO $100–249 | 7 days |
| AUTO >= $250 | 3 days |
| OFF | Never |

A card with no previous PSA update is eligible for its first lookup.

## Version

Current source version: **0.1.4**

See `CHANGELOG.md` for release notes and `CLAUDE.md` for architecture and maintenance context.

## License

MIT License. See `LICENSE`.

## Disclaimer

PokeSheet is not affiliated with The Pokémon Company, TCGdex, TCGplayer, Cardmarket, PSA, or PriceCharting. Market data can be incomplete, delayed, estimated, or reclassified by its source.
