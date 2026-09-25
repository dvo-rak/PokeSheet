const CONFIG = {
  SHEET: 'Collection',
  TCGDEX_BASE: 'https://api.tcgdex.net/v2/en',
  VERSION: '0.2.1',
  PSA_REFRESH: { CHEAP: 90, LOW: 30, MEDIUM: 14, HIGH: 7, VERY_HIGH: 3 }
};

function onOpen() {
  ensureV021Schema_();
  applySheetFormatting_();
  ensureCollectionSummary_();

  SpreadsheetApp.getUi().createMenu('⚡ Pokémon')
    .addItem('➕ Add cards', 'showCardSidebar')
    .addSeparator()
    .addItem('Update prices', 'updatePrices')
    .addItem('Update PriceCharting links', 'updatePriceChartingLinks')
    .addSeparator()
    .addItem('Update everything', 'updateEverything')
    .addToUi();
}

function updateEverything() {
  updatePrices();
  updatePriceChartingLinks();
  applySheetFormatting_();
  ensureCollectionSummary_();
}

// TCGdex helpers

function tcgdexFetch_(url) {
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const status = response.getResponseCode();
  if (status !== 200) throw new Error('TCGdex HTTP ' + status);
  return JSON.parse(response.getContentText());
}

function normalizeCollectorNumber_(value) {
  let text = String(value || '').trim();
  if (text.includes('/')) text = text.split('/')[0].trim();
  return text;
}

function comparableCollectorNumber_(value) {
  const text = normalizeCollectorNumber_(value).toLowerCase();
  if (/^\d+$/.test(text)) return String(parseInt(text, 10));
  return text;
}

function normalizeVariant_(variant) {
  const value = String(variant || '').trim().toLowerCase();
  if (value === 'normal') return 'Normal';
  if (value === 'holo' || value === 'holofoil') return 'Holo';
  if (value === 'reverse' || value === 'reverse holo' || value === 'reverse holofoil') return 'Reverse';
  throw new Error('Invalid card variant.');
}

function getAvailableVariants_(card) {
  const tcg = card.pricing?.tcgplayer || {};
  const variants = [];
  if (tcg.normal) variants.push('Normal');
  if (tcg.holofoil) variants.push('Holo');
  if (tcg['reverse-holofoil']) variants.push('Reverse');

  // Fall back to TCGdex variant metadata when TCGplayer pricing is unavailable.
  if (variants.length === 0) {
    if (card.variants?.holo === true) variants.push('Holo');
    if (card.variants?.reverse === true) variants.push('Reverse');
    if (card.variants?.normal === true) variants.push('Normal');
  }
  return [...new Set(variants)];
}

function getTcgdexCard_(setId, collectorNumber) {
  const cleanSetId = String(setId || '').trim();
  const cleanNumber = normalizeCollectorNumber_(collectorNumber);
  if (!cleanSetId || !cleanNumber) throw new Error('Set ID or card number is missing.');

  const exactUrl = CONFIG.TCGDEX_BASE + '/cards/' + encodeURIComponent(cleanSetId + '-' + cleanNumber);
  const exactResponse = UrlFetchApp.fetch(exactUrl, { muteHttpExceptions: true });
  if (exactResponse.getResponseCode() === 200) return JSON.parse(exactResponse.getContentText());

  const set = tcgdexFetch_(CONFIG.TCGDEX_BASE + '/sets/' + encodeURIComponent(cleanSetId));
  const cards = Array.isArray(set.cards) ? set.cards : [];
  const wanted = comparableCollectorNumber_(cleanNumber);
  const match = cards.find(card => comparableCollectorNumber_(card.localId) === wanted);
  if (!match) throw new Error('Card #' + cleanNumber + ' was not found in TCGdex set ' + cleanSetId + '.');

  return tcgdexFetch_(CONFIG.TCGDEX_BASE + '/cards/' + encodeURIComponent(match.id));
}

function getTcgdexProductIds_(card) {
  const tcg = card.pricing?.tcgplayer || {};
  return [tcg.normal?.productId, tcg.holofoil?.productId, tcg['reverse-holofoil']?.productId]
    .filter(value => value !== null && value !== undefined && value !== '')
    .map(String);
}

function isCustomPrinting_(card, productId) {
  const id = String(productId || '').trim();
  if (!id) return false;
  const ids = getTcgdexProductIds_(card);
  if (ids.length === 0) return false;
  return !ids.includes(id);
}

// Sidebar

function showCardSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('Pokémon Collection');
  SpreadsheetApp.getUi().showSidebar(html);
}

function searchCardsForSidebar(name, collectorNumber) {
  const cleanName = String(name || '').trim();
  const cleanNumber = normalizeCollectorNumber_(collectorNumber);
  if (!cleanName) throw new Error('Enter a card name.');

  const cards = tcgdexFetch_(CONFIG.TCGDEX_BASE + '/cards?name=' + encodeURIComponent(cleanName));
  if (!Array.isArray(cards)) return [];

  let candidates = cards;
  if (cleanNumber) {
    candidates = cards.filter(card =>
      comparableCollectorNumber_(card.localId) === comparableCollectorNumber_(cleanNumber)
    );
  }

  // Limit broad searches so the sidebar stays responsive.
  candidates = candidates.slice(0, 20);
  const results = [];

  for (const brief of candidates) {
    try {
      const detail = tcgdexFetch_(CONFIG.TCGDEX_BASE + '/cards/' + encodeURIComponent(brief.id));
      const setId = detail.set?.id || String(brief.id).split('-').slice(0, -1).join('-');

      results.push({
        id: brief.id,
        setId,
        setName: detail.set?.name || setId,
        localId: detail.localId || brief.localId || '',
        name: detail.name || brief.name || '',
        rarity: detail.rarity || '',
        image: detail.image || brief.image || '',
        variants: getAvailableVariants_(detail)
      });
    } catch (error) {
      console.log('Search detail ' + brief.id + ': ' + error.message);
    }
  }
  return results;
}

function getSetsForSidebar() {
  const sets = tcgdexFetch_(CONFIG.TCGDEX_BASE + '/sets');
  if (!Array.isArray(sets)) return [];

  return sets.map(set => ({
    id: set.id,
    name: set.name,
    logo: set.logo || '',
    symbol: set.symbol || '',
    officialCount: set.cardCount?.official || '',
    totalCount: set.cardCount?.total || ''
  })).sort((a, b) => a.name.localeCompare(b.name));
}

function findCardInSetForSidebar(setId, collectorNumber) {
  const cleanSetId = String(setId || '').trim();
  const cleanNumber = normalizeCollectorNumber_(collectorNumber);
  if (!cleanSetId) throw new Error('Select a set.');
  if (!cleanNumber) throw new Error('Enter a card number.');

  const card = getTcgdexCard_(cleanSetId, cleanNumber);

  return {
    id: card.id,
    setId: card.set?.id || cleanSetId,
    setName: card.set?.name || cleanSetId,
    localId: card.localId || cleanNumber,
    name: card.name || '',
    rarity: card.rarity || '',
    image: card.image || '',
    variants: getAvailableVariants_(card)
  };
}

function addCardFromSidebar(data) {
  if (!data) throw new Error('Card data is missing.');

  ensureV021Schema_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  if (!sheet) throw new Error('Collection sheet was not found.');

  const setId = String(data.setId || '').trim();
  const requestedCardNumber = normalizeCollectorNumber_(data.cardNumber);
  const variant = normalizeVariant_(data.variant);
  const qty = Number(data.qty);
  const customPrinting = data.customPrinting === true;
  const customProductId = String(data.productId || '').trim();

  if (!setId) throw new Error('Set ID is missing.');
  if (!requestedCardNumber) throw new Error('Card number is missing.');
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Quantity must be a whole number greater than 0.');
  if (customPrinting && !/^\d+$/.test(customProductId)) {
    throw new Error('Custom printing requires a valid numeric TCGplayer Product ID.');
  }

  const card = getTcgdexCard_(setId, requestedCardNumber);
  const cardNumber = String(card.localId || requestedCardNumber);
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
    for (let index = 0; index < values.length; index++) {
      const row = index + 2;
      const sameCard =
        String(values[index][0] || '').trim().toLowerCase() === setId.toLowerCase() &&
        comparableCollectorNumber_(values[index][1]) === comparableCollectorNumber_(cardNumber) &&
        String(values[index][2] || '').trim().toLowerCase() === variant.toLowerCase();

      if (!sameCard) continue;
      if (customPrinting && String(values[index][13] || '').trim() !== customProductId) continue;

      const oldQty = Number(values[index][3]) || 0;
      const newQty = oldQty + qty;
      sheet.getRange(row, 4).setValue(newQty);
      return { status: 'updated', row, oldQty, newQty, name: sheet.getRange(row, 5).getValue() || data.name || setId + '-' + cardNumber };
    }
  }

  const newRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(newRow, 1).setValue(setId);
  sheet.getRange(newRow, 2).setNumberFormat('@').setValue(cardNumber);
  sheet.getRange(newRow, 3).setValue(variant);
  sheet.getRange(newRow, 4).setValue(qty);
  sheet.getRange(newRow, 5).setValue(card.name || data.name || '');
  sheet.getRange(newRow, 6).setValue(card.rarity || data.rarity || '');
  sheet.getRange(newRow, 11).setValue('AUTO');

  const variantValidation = sheet.getRange(2, 3).getDataValidation();
  if (variantValidation) sheet.getRange(newRow, 3).setDataValidation(variantValidation);

  const watchValidation = sheet.getRange(2, 11).getDataValidation();
  if (watchValidation) sheet.getRange(newRow, 11).setDataValidation(watchValidation);

  let productId = customProductId;
  if (!customPrinting) {
    productId = getProductIdForVariant_(card, variant);
  }
  sheet.getRange(newRow, 14).setValue(productId);

  SpreadsheetApp.flush();

  try {
    const url = updatePriceChartingLinkForRow_(newRow, {
      name: card.name || data.name || '',
      cardNumber,
      productId
    });
    if (url) updatePriceChartingPricesForRow_(newRow, url);
  } catch (error) {
    console.log('Row ' + newRow + ': PriceCharting pricing failed: ' + error.message);
  }

  return {
    status: 'created',
    row: newRow,
    qty,
    name: sheet.getRange(newRow, 5).getValue(),
    rawTCG: sheet.getRange(newRow, 7).getValue(),
    productId: sheet.getRange(newRow, 14).getValue(),
    customPrinting
  };
}

function getProductIdForVariant_(card, variant) {
  const tcg = card.pricing?.tcgplayer || {};
  let item = null;
  if (variant === 'Normal') item = tcg.normal;
  else if (variant === 'Holo') item = tcg.holofoil;
  else if (variant === 'Reverse') item = tcg['reverse-holofoil'];
  if (item?.productId) return String(item.productId);

  for (const candidate of [tcg.normal, tcg.holofoil, tcg['reverse-holofoil']]) {
    if (candidate?.productId) return String(candidate.productId);
  }
  return '';
}

// PriceCharting pricing

function updatePrices() {
  ensureV021Schema_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  if (!sheet) throw new Error('Collection sheet was not found.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const MAX_LOOKUPS = 40;
  let lookups = 0, updated = 0, cached = 0, off = 0, missing = 0, errors = 0;

  for (let row = 2; row <= lastRow && lookups < MAX_LOOKUPS; row++) {
    try {
      const oldPSA10 = Number(sheet.getRange(row, 8).getValue()) || 0;
      let watchMode = String(sheet.getRange(row, 11).getValue() || '').trim().toUpperCase();
      const lastUpdated = sheet.getRange(row, 13).getValue();

      if (!watchMode) {
        watchMode = 'AUTO';
        sheet.getRange(row, 11).setValue('AUTO');
      }

      if (watchMode === 'OFF') {
        off++;
        continue;
      }

      if (!shouldRefreshPrice_(oldPSA10, lastUpdated, watchMode)) {
        cached++;
        continue;
      }

      refreshCardIdentity_(row);

      let url = sheet.getRange(row, 15).getRichTextValue()?.getLinkUrl() || '';
      if (!url) url = updatePriceChartingLinkForRow_(row) || '';
      if (!url) {
        missing++;
        continue;
      }

      updatePriceChartingPricesForRow_(row, url);
      lookups++;
      updated++;
      Utilities.sleep(300);
    } catch (error) {
      errors++;
      console.log('Row ' + row + ': price update ERROR: ' + error.message);
    }
  }

  console.log(
    'Price update finished. Updated: ' + updated +
    ', fetches: ' + lookups + '/' + MAX_LOOKUPS +
    ', cached: ' + cached +
    ', OFF: ' + off +
    ', missing: ' + missing +
    ', errors: ' + errors
  );
}

function shouldRefreshPrice_(price, lastUpdated, watchMode) {
  if (watchMode === 'OFF') return false;
  if (!lastUpdated) return true;

  const ageDays = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
  if (watchMode === 'HIGH') return ageDays >= 3;
  if (watchMode === 'LOW') return ageDays >= 90;

  let refreshDays;
  if (!price || price < 25) refreshDays = CONFIG.PSA_REFRESH.CHEAP;
  else if (price < 50) refreshDays = CONFIG.PSA_REFRESH.LOW;
  else if (price < 100) refreshDays = CONFIG.PSA_REFRESH.MEDIUM;
  else if (price < 250) refreshDays = CONFIG.PSA_REFRESH.HIGH;
  else refreshDays = CONFIG.PSA_REFRESH.VERY_HIGH;

  return ageDays >= refreshDays;
}

function refreshCardIdentity_(row) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  const setId = String(sheet.getRange(row, 1).getValue() || '').trim();
  const cardNumber = String(sheet.getRange(row, 2).getDisplayValue() || '').trim();
  const variant = String(sheet.getRange(row, 3).getValue() || '').trim();
  if (!setId || !cardNumber) return;

  const existingProductId = String(sheet.getRange(row, 14).getDisplayValue() || '').trim();
  const card = getTcgdexCard_(setId, cardNumber);
  const exactLocalId = String(card.localId || cardNumber);

  if (exactLocalId !== cardNumber) sheet.getRange(row, 2).setNumberFormat('@').setValue(exactLocalId);
  sheet.getRange(row, 5).setValue(card.name || '');
  sheet.getRange(row, 6).setValue(card.rarity || '');

  if (!isCustomPrinting_(card, existingProductId)) {
    sheet.getRange(row, 14).setValue(getProductIdForVariant_(card, variant));
  }

}

function updatePriceChartingPricesForRow_(row, url) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  const response = fetchPriceChartingPage_(url);
  if (response.getResponseCode() !== 200) throw new Error('PriceCharting HTTP ' + response.getResponseCode());

  const data = extractPriceChartingPrices_(response.getContentText());
  if (data.raw === null && data.psa10 === null) throw new Error('PriceCharting price structure was not recognized.');

  if (data.raw !== null) {
    sheet.getRange(row, 7).setValue(data.raw);
    sheet.getRange(row, 7).setNote(
      'TCGplayer comparison price from PriceCharting.\n' +
      'Last checked by PriceCharting: ' + (data.rawChecked || 'unknown')
    );
  }

  if (data.psa10 !== null) {
    sheet.getRange(row, 8).setValue(data.psa10);
    sheet.getRange(row, 9).setValue(data.sales);
    sheet.getRange(row, 8).setNote([
      'PSA 10 — PriceCharting',
      'Price: $' + data.psa10.toFixed(2),
      'Sold listings: ' + data.sales,
      'Volume: ' + (data.volume || 'unknown')
    ].join('\n'));

    if (data.raw !== null && data.raw > 0) sheet.getRange(row, 10).setValue(data.psa10 / data.raw);
    else sheet.getRange(row, 10).clearContent();

    sheet.getRange(row, 13).setValue(new Date());
  }
}

function extractPriceChartingPrices_(html) {
  if (!html) return { raw: null, rawChecked: null, psa10: null, sales: 0, volume: null };

  const rawRow = html.match(/<tr[^>]*data-source-name=["']TCGPlayer["'][^>]*>[\s\S]*?<\/tr>/i);
  let raw = null;
  let rawChecked = null;

  if (rawRow) {
    const priceMatch = rawRow[0].match(/<span[^>]*class=["'][^"']*\bjs-price\b[^"']*["'][^>]*>\s*\$([\d,.]+)\s*<\/span>/i);
    const checkedMatch = rawRow[0].match(/title=["']Last checked:\s*([^"']+)["']/i);
    if (priceMatch) {
      const value = Number(priceMatch[1].replace(/,/g, ''));
      if (Number.isFinite(value)) raw = value;
    }
    if (checkedMatch) rawChecked = decodeHtmlEntities_(checkedMatch[1]).trim();
  }

  const psa = extractPriceChartingPSA10_(html);
  return { raw, rawChecked, psa10: psa.price, sales: psa.sales, volume: psa.volume };
}

function extractPriceChartingPSA10_(html) {
  if (!html) return { price: null, sales: 0, volume: null };

  const priceMatch = html.match(/<td[^>]*id=["']manual_only_price["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*\bprice\b[^"']*["'][^>]*>\s*\$([\d,.]+)\s*<\/span>/i);
  const salesMatch = html.match(/<option[^>]*value=["']completed-auctions-manual-only["'][^>]*>\s*PSA\s*10\s*\(([\d,]+)\)\s*<\/option>/i);
  const volumeMatch = html.match(/<td[^>]*data-show-tab=["']completed-auctions-manual-only["'][^>]*>[\s\S]*?<a[^>]*>\s*([^<]+?)\s*<\/a>/i);

  const price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : null;
  const sales = salesMatch ? Number(salesMatch[1].replace(/,/g, '')) : 0;
  const volume = volumeMatch ? decodeHtmlEntities_(volumeMatch[1]).replace(/\s+/g, ' ').trim() : null;

  return {
    price: Number.isFinite(price) ? price : null,
    sales: Number.isFinite(sales) ? sales : 0,
    volume
  };
}

function ensureV021Schema_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  if (!sheet) return;

  // v0.1.x -> v0.2.x: remove the old Cardmarket EUR column.
  if (String(sheet.getRange(1, 7).getValue() || '').trim() === 'Raw CM €') {
    sheet.deleteColumn(7);
  }

  // v0.2.0 -> v0.2.1: Raw and PSA now refresh together, so one timestamp is enough.
  if (String(sheet.getRange(1, 12).getValue() || '').trim() === 'PSA Updated') {
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const psaUpdated = sheet.getRange(2, 12, lastRow - 1, 1).getValues();
      const updated = sheet.getRange(2, 14, lastRow - 1, 1).getValues();
      for (let i = 0; i < psaUpdated.length; i++) {
        if (psaUpdated[i][0]) updated[i][0] = psaUpdated[i][0];
      }
      sheet.getRange(2, 14, lastRow - 1, 1).setValues(updated);
    }
    sheet.deleteColumn(12);
  }

  const headers = [
    'Set ID', 'Card #', 'Variant', 'Qty', 'Name', 'Rarity',
    'Raw 

// Sheet presentation

function applySheetFormatting_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  if (!sheet) return;

  // Keep the underlying ratio precise; only round its display.
  sheet.getRange('J2:J').setNumberFormat('0.00x');
  sheet.getRange('G2:H').setNumberFormat('$0.00');
}

function ensureCollectionSummary_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  if (!sheet) return;

  // Keep the summary outside the application contract (A:O).
  sheet.getRange('R1').setValue('Collection Summary');
  sheet.getRange('R2').setValue('Raw Total');
  sheet.getRange('S2').setFormula('=SUMPRODUCT(D2:D,G2:G)');
  sheet.getRange('S2').setNumberFormat('$0.00');
  sheet.getRange('R1:S1').setFontWeight('bold');
  sheet.getRange('R2').setFontWeight('bold');
}

// PriceCharting links

function ensurePriceChartingColumn_() {
  ensureV021Schema_();
}

function updatePriceChartingLinks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  if (!sheet) throw new Error('Collection sheet was not found.');
  ensurePriceChartingColumn_();

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  let matched = 0, skipped = 0, missing = 0, errors = 0;

  for (let row = 2; row <= lastRow; row++) {
    const linkCell = sheet.getRange(row, 15);
    const existingLink = linkCell.getRichTextValue()?.getLinkUrl();

    if (existingLink) {
      skipped++;
      continue;
    }

    const productId = String(sheet.getRange(row, 14).getValue() || '').trim();
    const name = String(sheet.getRange(row, 5).getValue() || '').trim();
    const cardNumber = String(sheet.getRange(row, 2).getDisplayValue() || '').trim();

    if (!productId || !name || !cardNumber) {
      missing++;
      continue;
    }

    try {
      const result = findPriceChartingUrl_({ name, cardNumber, tcgplayerId: productId });
      if (result) {
        setPriceChartingLink_(linkCell, result.url);
        matched++;
      } else {
        linkCell.clearContent();
        missing++;
      }
    } catch (error) {
      errors++;
      console.log('Row ' + row + ': PriceCharting ERROR: ' + error.message);
    }

    Utilities.sleep(300);
  }

  console.log(
    'PriceCharting update finished. Matched: ' + matched +
    ', cached: ' + skipped +
    ', no match/missing data: ' + missing +
    ', errors: ' + errors
  );
}

function updatePriceChartingLinkForRow_(row, cardData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  if (!sheet) throw new Error('Collection sheet was not found.');
  ensurePriceChartingColumn_();

  const linkCell = sheet.getRange(row, 15);
  const existingLink = linkCell.getRichTextValue()?.getLinkUrl();
  if (existingLink) return existingLink;

  cardData = cardData || {};

  const productId = String(
    cardData.productId || sheet.getRange(row, 14).getDisplayValue() || ''
  ).trim();

  const name = String(
    cardData.name || sheet.getRange(row, 5).getDisplayValue() || ''
  ).trim();

  const cardNumber = String(
    cardData.cardNumber || sheet.getRange(row, 2).getDisplayValue() || ''
  ).trim();

  if (!productId || !name || !cardNumber) return null;

  const result = findPriceChartingUrl_({
    name,
    cardNumber,
    tcgplayerId: productId
  });

  if (!result) return null;

  setPriceChartingLink_(linkCell, result.url);
  return result.url;
}

function setPriceChartingLink_(cell, url) {
  const richText = SpreadsheetApp.newRichTextValue()
    .setText('↗ PriceCharting')
    .setLinkUrl(url)
    .build();
  cell.setRichTextValue(richText);
  cell.setNote('Verified against TCGplayer Product ID before linking.');
}

function findPriceChartingUrl_(card) {
  const cleanName = String(card.name || '')
    .replace(/[’']/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanNumber = comparableCollectorNumber_(card.cardNumber);
  const query = cleanName + ' ' + cleanNumber;
  const searchUrl = 'https://www.pricecharting.com/search-products?type=prices&q=' + encodeURIComponent(query);

  const searchResponse = fetchPriceChartingPage_(searchUrl);
  const status = searchResponse.getResponseCode();
  if (status !== 200) throw new Error('PriceCharting search returned HTTP ' + status);

  const html = searchResponse.getContentText();
  const canonicalUrl = extractPriceChartingCanonical_(html);

  if (canonicalUrl) {
    const tcgplayerId = extractPriceChartingTcgplayerId_(html);
    if (tcgplayerId && String(tcgplayerId) === String(card.tcgplayerId)) {
      return { url: canonicalUrl, tcgplayerId };
    }
  }

  const candidates = extractPriceChartingCandidateUrls_(html);
  const maxCandidates = 20;

  for (let i = 0; i < Math.min(candidates.length, maxCandidates); i++) {
    const url = candidates[i];
    if (canonicalUrl && normalizePriceChartingUrl_(url) === normalizePriceChartingUrl_(canonicalUrl)) continue;

    Utilities.sleep(300);
    const response = fetchPriceChartingPage_(url);
    if (response.getResponseCode() !== 200) continue;

    const productHtml = response.getContentText();
    const tcgplayerId = extractPriceChartingTcgplayerId_(productHtml);

    if (tcgplayerId && String(tcgplayerId) === String(card.tcgplayerId)) {
      return { url: extractPriceChartingCanonical_(productHtml) || url, tcgplayerId };
    }
  }

  return null;
}

function fetchPriceChartingPage_(url) {
  return UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    followRedirects: true,
    muteHttpExceptions: true
  });
}

function extractPriceChartingCanonical_(html) {
  if (!html) return null;

  let match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (!match) match = html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (!match) return null;

  const url = decodeHtmlEntities_(match[1]);
  if (!/^https:\/\/www\.pricecharting\.com\/game\//i.test(url)) return null;
  return normalizePriceChartingUrl_(url);
}

function extractPriceChartingCandidateUrls_(html) {
  if (!html) return [];

  const urls = [];
  const regex = /href=["']((?:https:\/\/www\.pricecharting\.com)?\/game\/[^"'?#]+)["']/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    let url = decodeHtmlEntities_(match[1]);
    if (url.startsWith('/')) url = 'https://www.pricecharting.com' + url;
    if (!url.startsWith('https://www.pricecharting.com/game/')) continue;

    url = normalizePriceChartingUrl_(url);
    if (!urls.includes(url)) urls.push(url);
  }

  return urls;
}

function extractPriceChartingTcgplayerId_(html) {
  if (!html) return null;

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

  const patterns = [
    /TCGPlayer\s*ID\s*:?\s*([0-9]{4,})/i,
    /TCGplayer\s*ID\s*:?\s*([0-9]{4,})/i,
    /tcg[-_ ]?player[-_ ]?id[^0-9]{0,100}([0-9]{4,})/i
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) return match[1];
  }
  return null;
}

function normalizePriceChartingUrl_(url) {
  return String(url).replace(/&amp;/g, '&').replace(/[?#].*$/, '').replace(/\/$/, '');
}

function decodeHtmlEntities_(value) {
  return String(value).replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}