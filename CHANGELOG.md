# Changelog

## 0.2.0 - 2026-09-25

### Changed
- PriceCharting is now the single pricing source.
- Raw $ is parsed from the TCGplayer comparison row on the verified PriceCharting product page.
- PSA 10 price, sold-listing count, and sales volume are parsed from the same page fetch.
- TCGdex is now used as the card catalog and TCGplayer Product ID source.
- Removed the Cardmarket EUR column.
- Existing sheets migrate automatically by removing the old Raw CM € column and shifting the remaining schema.
- Replaced separate raw/PSA menu actions with Update prices.
- New cards attempt verified PriceCharting matching and pricing immediately.

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
- Initial raw pricing support.
- Automatic TCGplayer product ID storage.
- PSA 10 / raw multiplier.
- PSA refresh cache with AUTO, HIGH, LOW, and OFF modes.
- Lookup cap for pricing refresh runs.
- English source comments and repository documentation.
- CLAUDE.md development context.
