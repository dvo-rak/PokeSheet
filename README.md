# Pokémon TCG Collection Tracker

A lightweight Google Sheets + Apps Script tracker for Pokémon TCG collections.

## Features

- Sidebar card entry for random bulk and same-set sorting
- Dynamic set list from TCGdex
- Card image preview and Normal / Holo / Reverse variants
- Duplicate detection by Set ID + Card # + Variant
- Automatic quantity increments for duplicates
- Cardmarket EUR and TCGplayer USD raw prices
- Automatic TCGplayer product ID storage
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

Variant values: Normal, Holo, Reverse.

PSA Watch values: AUTO, HIGH, LOW, OFF.

## Installation for a small private group

The simplest distribution method is a prepared Google Sheets template.

1. Make a copy of the template spreadsheet.
2. Reload the spreadsheet and authorize the Apps Script when Google asks.
3. Use ⚡ Pokémon → ➕ Add cards to open the sidebar.
4. If PSA pricing is wanted, create a personal Pokémon Price Tracker API key.
5. Use ⚡ Pokémon → 🔑 Setup API key to save it.

Every user should use their own API key.

## API key security

Never commit a real API key to this repository.

The tracker stores the Pokémon Price Tracker key in Apps Script Script Properties under the property name POKEMON_PRICE_API_KEY.

## Card entry

### Random bulk

Enter the card name and preferably the printed collector number, for example 136/189. The tracker searches TCGdex and shows matching cards with image and set information.

The internal TCGdex set ID is stored automatically; the collector does not need to know it.

### Same set

Select a set once, then enter collector numbers. The set list is loaded dynamically from TCGdex when the sidebar opens.

## Pricing

Raw prices come from TCGdex:
- Cardmarket in EUR
- TCGplayer in USD

PSA data comes from Pokémon Price Tracker and is intentionally updated separately so that adding bulk cards does not consume graded-price API credits.

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

Current source version: 0.1.0

See CHANGELOG.md for release notes and CLAUDE.md for architecture and maintenance context.

## Disclaimer

This project is not affiliated with The Pokémon Company, TCGdex, TCGplayer, Cardmarket, PSA, or Pokémon Price Tracker.
