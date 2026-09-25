# CLAUDE.md

This file is the working context for Claude or another coding assistant maintaining this repository.

## Project summary

This is a small Google Sheets + Google Apps Script Pokémon TCG collection tracker. It is currently intended for a few friends using independent copies of a master spreadsheet.

Optimize for fast physical-card entry, understandable code, low maintenance, and minimal external-service setup. Do not turn it into a large framework without a concrete need.

## Runtime and files

- Google Sheets
- Google Apps Script V8 JavaScript
- HTML Service sidebar
- No build step
- No npm dependencies
- Code.gs: backend, APIs, spreadsheet writes, pricing logic
- Sidebar.html: card-entry UI and client-side JavaScript

## External services

TCGdex base URL: https://api.tcgdex.net/v2/en

TCGdex provides card search, details, sets, images, Cardmarket pricing, TCGplayer pricing, and TCGplayer product IDs for standard printings. Collector numbers are resolved defensively so leading zeroes such as 034 survive Google Sheets coercion.

PriceCharting provides verified product pages for PSA 10 price, sold-listing count, and sales volume. PokeSheet discovers candidate pages from PriceCharting search results and accepts a page only when its TCGplayer Product ID exactly matches column P. Existing links are cached. New-card entry flushes spreadsheet writes, re-reads the effective Product ID from column P, and then attempts PriceCharting matching.

PSA updates read the verified PriceCharting URL from column Q and parse PSA 10 price, sold-listing count, and volume from the product page. The parser fails closed and must not erase a previous PSA value when expected markup is missing.

## Spreadsheet contract

The sheet name must be Collection.

Columns are positional and are part of the application contract:

A Set ID
B Card #
C Variant
D Qty
E Name
F Rarity
G Raw CM €
H Raw TCG $
I PSA 10 $
J PSA10 Sales
K PSA10/Raw
L PSA Watch
M PSA Updated
N Grade Candidates
O Updated
P TCGplayer ID
Q PriceCharting

Do not reorder columns without migrating every positional read/write.

## Core invariants

Standard card identity is Set ID + Card # + Variant. Custom / unlisted printings additionally include the TCGplayer Product ID so multiple special printings with the same collector number can coexist.

Adding the same identity again increments Qty and must not create a second row. Normal and Reverse copies are separate rows.

Canonical variants are Normal, Holo, Reverse.

TCGplayer mappings:
- Normal → normal
- Holo → holofoil
- Reverse → reverse-holofoil

Raw Cardmarket price is EUR. Raw TCGplayer price is USD. PSA10/Raw intentionally uses TCGplayer USD so the ratio does not mix currencies.

PriceCharting matching uses the TCGplayer Product ID in column P. PSA refreshes use the verified PriceCharting URL in column Q. Missing PSA 10 data or unrecognized markup is a valid no-update state, not a reason to erase previous values.

## PSA refresh rules

OFF: never.
HIGH: every 3 days.
LOW: every 90 days.

AUTO:
- under $25: 90 days
- $25–49: 30 days
- $50–99: 14 days
- $100–249: 7 days
- $250 and above: 3 days

A card with no previous PSA update must always be eligible for its first lookup. A cheap raw card can still have a valuable PSA 10 market.

The updater currently caps a run at 40 lookups.

## Card-entry UX

The user should not need to know a TCGdex set ID.

Random bulk mode accepts card name plus an optional collector number, searches TCGdex, and displays candidates with image and set information.

Same set mode loads the set list dynamically from TCGdex. The user selects a set and then enters collector numbers.

A new card should:
1. write Set ID, card number, variant, and quantity;
2. set PSA Watch to AUTO;
3. preserve spreadsheet validation where possible;
4. fetch raw pricing immediately;
5. store the TCGplayer product ID;
6. attempt a best-effort PriceCharting link lookup after the effective TCGplayer Product ID is known;
7. NOT trigger a PSA lookup automatically.

PSA is batch-updated to avoid unnecessary PriceCharting page fetches.

Custom / unlisted printings are an escape hatch for products that TCGdex does not expose as a separate printing. The sidebar accepts a manual numeric TCGplayer Product ID. Normal TCGdex raw refreshes must preserve that Product ID and any existing custom Raw TCG value.

## Security

Do not commit credentials or personal collection data. PokeSheet currently requires no external service credentials.

## Coding conventions

- Code, comments, UI copy, and repository documentation are in English.
- Prefer complete readable functions over clever abstractions.
- Keep Apps Script compatibility; do not add a build system without a reason.
- Preserve explicit HTTP error handling.
- Avoid one API request per spreadsheet cell when batch access is practical.
- Private helper functions should end in an underscore where practical.

## Known trade-offs

- Spreadsheet columns are hard-coded by index.
- Full raw updates process rows sequentially.
- The TCGdex set list is loaded when the sidebar opens rather than cached.
- PSA refresh priority follows sheet order.
- Distribution currently uses independent copies of a Google Sheets template.
- Updating this repository does not automatically update existing spreadsheet copies.
- PriceCharting link discovery depends on public website HTML and can require maintenance if PriceCharting changes its markup or search behavior.

These are acceptable at the current scale.

## Likely future work

Possible improvements, not automatic requirements:

1. First-time setup/repair for headers, dropdowns, and formatting.
2. Version display and Check for updates.
3. Grading radar using PSA price, PSA/raw multiple, sales count, and confidence.
4. Better PSA refresh prioritization.
5. Cache the TCGdex set list.
6. Better distribution if the user base grows: clasp, Apps Script library, or Workspace add-on.
7. Optional phone/OCR card capture.

Confirm scope before implementing these.

## Grading radar context

Do not blindly rank cards by PSA/raw multiple. A high multiple with two sales and low confidence may be misleading.

A future signal should consider absolute PSA 10 price, PSA/raw multiple, PSA 10 sales count, and market confidence.

Column N, Grade Candidates, is a manual count of physical copies worth inspecting. It is not an automated grading score.

## Regression references

- TCGdex swsh3-136: Furret. Known during development to expose Normal and Reverse TCGplayer variants.
- TCGplayer product ID 637651: Ethan's Typhlosion 034/182 (Non-holo), Deck Exclusives. Used to validate custom printing identity, leading-zero collector numbers, PriceCharting matching, and PSA 10 parsing.
- TCGplayer product ID 704802: Rampardos ex #045. Used to validate the direct-product PriceCharting search path and low-volume PSA 10 parsing.

External market data changes over time, so historical prices and sale counts are not fixtures.

## Change workflow

For every meaningful change:
1. preserve the spreadsheet contract unless migration is explicit;
2. keep Code.gs and Sidebar.html synchronized with the deployed Sheet;
3. update CHANGELOG.md for user-visible changes;
4. bump the version for a release;
5. verify that no secrets are present;
6. test random search, same-set lookup, new add, duplicate increment, variant separation, raw pricing, product ID, PriceCharting matching, PSA with data, and PSA with missing/unrecognized data.
