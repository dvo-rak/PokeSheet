# PokeSheet

A lightweight Pokémon TCG collection and price tracker built with Google Sheets + Apps Script.
## Features

- Sidebar card entry for random bulk and same-set sorting
- Dynamic set list from TCGdex
- Card image preview and Normal / Holo / Reverse variants
- Custom / unlisted printing support using a TCGplayer Product ID
- Duplicate detection by Set ID + Card # + Variant; custom printings also include TCGplayer Product ID
- Automatic quantity increments for duplicates
- Cardmarket EUR and TCGplayer USD raw prices
- Automatic TCGplayer product ID storage
- Verified PriceCharting links matched by exact TCGplayer Product ID
- Optional PSA 10 price and sales data through Pokémon Price Tracker
- PSA 10 / raw multiplier
- PSA refresh caching with AUTO, HIGH, LOW, and OFF modes
- Per-user API key stored in Apps Script Script Properties

## Sheet contract

The spreadsheet must contain a sheet named Collection with these columns:

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

Variant values: Normal, Holo, Reverse.

PSA Watch values: AUTO, HIGH, LOW, OFF.

## Google Sheets template

**[Make a copy of the master tracker](https://docs.google.com/spreadsheets/d/1MzzMkVgVU4I-rDNRcX0lfRb3zWMuW_FvVD9bwZ8miZk/edit?usp=sharing)**

The master spreadsheet is intended to stay clean and contain no personal collection data or API keys. Make your own copy before using the tracker.

## Quick start

1. Make a copy of the Google Sheets template above.
2. Reload the spreadsheet and authorize the Apps Script when Google asks.
3. Use ⚡ Pokémon → ➕ Add cards to start adding cards.
4. For PSA 10 pricing, create your own API key at [Pokémon Price Tracker](https://www.pokemonpricetracker.com/).
5. In the spreadsheet, use ⚡ Pokémon → 🔑 Setup API key and paste your key.

Every user should use their own Pokémon Price Tracker API key. TCGdex raw pricing does not require this key.

## Pokémon Price Tracker API key

The API key is only required for PSA / graded-price updates. Get your own key from [Pokémon Price Tracker](https://www.pokemonpricetracker.com/), then save it through ⚡ Pokémon → 🔑 Setup API key.

## API key security

Never commit a real API key to this repository.

The tracker stores the Pokémon Price Tracker key in Apps Script Script Properties under the property name POKEMON_PRICE_API_KEY.

## Card entry

### Random bulk

Enter the card name and preferably the printed collector number, for example 136/189. The tracker searches TCGdex and shows matching cards with image and set information.

The internal TCGdex set ID is stored automatically; the collector does not need to know it.

### Same set

Select a set once, then enter collector numbers. The set list is loaded dynamically from TCGdex when the sidebar opens.

### Custom / unlisted printings

Some products reuse the same artwork and collector number but have a separate TCGplayer product, such as deck-exclusive or other special printings that TCGdex does not expose separately.

Enable **Custom / unlisted printing**, choose the physical variant, and enter the numeric TCGplayer Product ID from the product URL. PokeSheet preserves that Product ID as the printing identity. The custom Raw TCG price is populated from Pokémon Price Tracker during the next PSA update and is preserved by normal TCGdex raw-price refreshes.

## Pricing

Raw prices come from TCGdex:
- Cardmarket in EUR
- TCGplayer in USD

PSA data comes from Pokémon Price Tracker and is intentionally updated separately so that adding bulk cards does not consume graded-price API credits.

PriceCharting is used as a human-review fallback for graded market data. PokeSheet searches for a candidate product, verifies the product page's TCGplayer ID against column P, and only then writes a clickable `↗ PriceCharting` link to column Q. Newly added cards automatically attempt the PriceCharting lookup after their TCGplayer Product ID is written. Existing verified links are cached and are not fetched again during normal updates. Use **⚡ Pokémon → Update PriceCharting links** to backfill or retry missing links.

**API usage:** PSA / graded pricing uses Pokémon Price Tracker API credits and is subject to the provider's rate limits. PokeSheet limits PSA updates to **40 cards per run** to reduce quota usage. Standard raw pricing from TCGdex does not consume Pokémon Price Tracker API credits. Custom / unlisted printings reuse the Pokémon Price Tracker PSA response to populate their Raw TCG market price without an additional request.

PSA refresh behavior:

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

Cards that have never been checked are eligible for their initial PSA lookup regardless of raw price.

## Version

Current source version: 0.1.3

See CHANGELOG.md for release notes and CLAUDE.md for architecture and maintenance context.

## License

MIT License. See LICENSE.

## Disclaimer

This project is not affiliated with The Pokémon Company, TCGdex, TCGplayer, Cardmarket, PSA, or Pokémon Price Tracker.
