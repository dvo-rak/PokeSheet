# Changelog

## 0.1.4 - 2026-09-25

### Changed
- PSA 10 pricing now comes from the verified PriceCharting product page stored in column Q instead of Pokémon Price Tracker graded data.
- PSA 10 sold-listing count and sales volume are parsed from the same PriceCharting page.
- PSA refresh remains controlled by AUTO, HIGH, LOW, and OFF modes.
- PSA parsing fails closed: an unrecognized PriceCharting page does not erase previously stored PSA values.
- Removed the obsolete setup menu from the current application flow.
- Updated repository documentation for the TCGdex + PriceCharting data flow.

## 0.1.3 - 2026-09-25

### Fixed
- Automatic PriceCharting lookup after adding a new card now flushes raw-price/Product-ID writes and explicitly re-reads the effective TCGplayer Product ID before matching.

## 0.1.2 - 2026-09-25

### Added
- PriceCharting links in column Q with exact TCGplayer Product ID verification.
- Automatic PriceCharting lookup for newly added cards.
- Menu action to backfill missing PriceCharting links while preserving cached links.

## [0.1.1] - 2026-09-25

### Added

- Custom / unlisted printing entry using a manual TCGplayer Product ID.
- Raw TCGplayer market pricing for custom printings through Pokémon Price Tracker during PSA updates.

### Fixed

- Collector numbers with leading zeroes are preserved and resolved correctly, including values such as 034.
- Raw price refreshes no longer overwrite custom TCGplayer Product IDs or custom raw TCG prices.
- Custom duplicate detection includes the TCGplayer Product ID so separate printings can coexist.


## [0.1.0] - 2026-09-25

### Added

- Initial distributable Google Sheets tracker source.
- TCGdex-backed card search.
- Random bulk workflow using card name and collector number.
- Same-set workflow with dynamically loaded set list.
- Card image preview and variant selection.
- Duplicate detection using Set ID + Card # + Variant.
- Automatic quantity increments for duplicates.
- Cardmarket and TCGplayer raw pricing.
- Automatic TCGplayer product ID storage.
- PSA 10 pricing and sales count through Pokémon Price Tracker.
- PSA 10 / raw multiplier.
- PSA refresh cache with AUTO, HIGH, LOW, and OFF modes.
- API lookup cap for PSA refresh runs.
- In-sheet API key setup using Apps Script Script Properties.
- English source comments and repository documentation.
- CLAUDE.md development context.
