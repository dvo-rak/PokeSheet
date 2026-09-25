const CONFIG = {
  SHEET: 'Collection',
  TCGDEX_BASE: 'https://api.tcgdex.net/v2/en',
  VERSION: '0.1.1',
  PSA_REFRESH: { CHEAP: 90, LOW: 30, MEDIUM: 14, HIGH: 7, VERY_HIGH: 3 }
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('⚡ Pokémon')
    .addItem('➕ Add cards', 'showCardSidebar')
    .addSeparator()
    .addItem('Update raw prices', 'updateRawPrices')
    .addItem('Update PSA prices', 'updatePSAPrices')
    .addSeparator()
    .addItem('Update everything', 'updateEverything')
    .addSeparator()
    .addItem('🔑 Setup API key', 'setupApiKey')
    .addToUi();
}

function updateEverything() {
  updateRawPrices();
  updatePSAPrices();
}

function setupApiKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '🔑 Pokémon Price Tracker',
    'Paste your Pokémon Price Tracker API key.\n\nThe key will be stored in this script project\'s Script Properties.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const apiKey = response.getResponseText().trim();
  if (!apiKey) {
    ui.alert('❌ API key is empty.');
    return;
  }

  PropertiesService.getScriptProperties().setProperty('POKEMON_PRICE_API_KEY', apiKey);
  ui.alert('✅ API key saved', 'Pokémon Price Tracker is configured.\n\nYou can now use Update PSA prices.', ui.ButtonSet.OK);
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

  const tcgdexCard = getTcgdexCard_(setId, requestedCardNumber);
  const cardNumber = String(tcgdexCard.localId || requestedCardNumber);
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
    for (let index = 0; index < values.length; index++) {
      const row = index + 2;
      const sameCard =
        String(values[index][0] || '').trim().toLowerCase() === setId.toLowerCase() &&
        comparableCollectorNumber_(values[index][1]) === comparableCollectorNumber_(cardNumber) &&
        String(values[index][2] || '').trim().toLowerCase() === variant.toLowerCase();

      if (!sameCard) continue;
      if (customPrinting && String(values[index][15] || '').trim() !== customProductId) continue;

      const oldQty = Number(values[index][3]) || 0;
      const newQty = oldQty + qty;
      sheet.getRange(row, 4).setValue(newQty);
      return {
        status: 'updated',
        row,
        oldQty,
        newQty,
        name: sheet.getRange(row, 5).getValue() || data.name || setId + '-' + cardNumber
      };
    }
  }

  const newRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(newRow, 1).setValue(setId);
  const numberCell = sheet.getRange(newRow, 2);
  numberCell.setNumberFormat('@');
  numberCell.setValue(cardNumber);
  sheet.getRange(newRow, 3).setValue(variant);
  sheet.getRange(newRow, 4).setValue(qty);
  sheet.getRange(newRow, 5).setValue(tcgdexCard.name || data.name || '');
  sheet.getRange(newRow, 6).setValue(tcgdexCard.rarity || data.rarity || '');
  sheet.getRange(newRow, 12).setValue('AUTO');

  const variantValidation = sheet.getRange(2, 3).getDataValidation();
  if (variantValidation) sheet.getRange(newRow, 3).setDataValidation(variantValidation);
  const watchValidation = sheet.getRange(2, 12).getDataValidation();
  if (watchValidation) sheet.getRange(newRow, 12).setDataValidation(watchValidation);

  if (customPrinting) {
    sheet.getRange(newRow, 16).setValue(customProductId);
    updateRawPriceForRow_(newRow, { preserveProductId: true, card: tcgdexCard });
  } else {
    updateRawPriceForRow_(newRow, { card: tcgdexCard });
  }

  return {
    status: 'created',
    row: newRow,
    qty,
    name: sheet.getRange(newRow, 5).getValue(),
    rawCM: sheet.getRange(newRow, 7).getValue(),
    rawTCG: sheet.getRange(newRow, 8).getValue(),
    productId: sheet.getRange(newRow, 16).getValue(),
    customPrinting
  };
}

// Raw pricing

function updateRawPrices() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  if (!sheet) throw new Error('Collection sheet was not found.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  for (let row = 2; row <= lastRow; row++) {
    const setId = String(sheet.getRange(row, 1).getValue()).trim();
    const cardNumber = String(sheet.getRange(row, 2).getDisplayValue()).trim();
    if (!setId || !cardNumber) continue;

    try {
      updateRawPriceForRow_(row);
    } catch (error) {
      sheet.getRange(row, 5).setValue('⚠️ ' + error.message);
    }
  }
}

function updateRawPriceForRow_(row, options) {
  options = options || {};
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  if (!sheet) throw new Error('Collection sheet was not found.');

  const setId = String(sheet.getRange(row, 1).getValue()).trim();
  const numberCell = sheet.getRange(row, 2);
  const storedCardNumber = String(numberCell.getDisplayValue()).trim();
  const variant = String(sheet.getRange(row, 3).getValue()).trim();
  if (!setId || !storedCardNumber) return;

  const existingProductId = String(sheet.getRange(row, 16).getValue() || '').trim();
  const card = options.card || getTcgdexCard_(setId, storedCardNumber);
  const exactLocalId = String(card.localId || storedCardNumber);

  if (exactLocalId !== storedCardNumber) {
    numberCell.setNumberFormat('@');
    numberCell.setValue(exactLocalId);
  }

  sheet.getRange(row, 5).setValue(card.name || '');
  sheet.getRange(row, 6).setValue(card.rarity || '');

  const pricing = card.pricing || {};
  const cm = pricing.cardmarket || {};
  const tcg = pricing.tcgplayer || {};
  let tcgVariant = null;
  if (variant === 'Normal') tcgVariant = tcg.normal ?? null;
  else if (variant === 'Holo') tcgVariant = tcg.holofoil ?? null;
  else if (variant === 'Reverse') tcgVariant = tcg['reverse-holofoil'] ?? null;

  const customPrinting = options.preserveProductId === true || isCustomPrinting_(card, existingProductId);

  if (customPrinting) {
    sheet.getRange(row, 7).clearContent();
    const tcgCell = sheet.getRange(row, 8);
    const existingRawPrice = tcgCell.getValue();

    if (existingRawPrice !== '' && existingRawPrice !== null) {
      tcgCell.setNote(
        'Custom TCGplayer printing.\n' +
        'Raw TCGplayer market price from Pokémon Price Tracker.\n' +
        'TCGplayer Product ID: ' + existingProductId
      );
    } else {
      tcgCell.setNote(
        'Custom TCGplayer printing.\n' +
        'Raw TCG price will be populated during the next PSA update.\n' +
        'TCGplayer Product ID: ' + existingProductId
      );
    }

    sheet.getRange(row, 16).setValue(existingProductId);
    sheet.getRange(row, 15).setValue(new Date());
    return;
  }

  let cmPrice = '';
  if (variant === 'Normal') {
    cmPrice = cm.trend ?? cm.avg30 ?? cm.avg7 ?? cm.avg ?? '';
  } else if (variant === 'Holo' || variant === 'Reverse') {
    cmPrice = cm['trend-holo'] ?? cm['avg30-holo'] ?? cm['avg7-holo'] ?? cm.trend ?? cm.avg30 ?? '';
  } else {
    cmPrice = cm.trend ?? cm.avg30 ?? '';
  }
  sheet.getRange(row, 7).setValue(cmPrice);

  let tcgPrice = '';
  let productId = '';
  if (tcgVariant) {
    tcgPrice = tcgVariant.marketPrice ?? tcgVariant.midPrice ?? tcgVariant.lowPrice ?? '';
    productId = tcgVariant.productId ?? '';
  }

  if (!productId) {
    for (const candidate of [tcg.normal, tcg.holofoil, tcg['reverse-holofoil']]) {
      if (candidate?.productId) {
        productId = candidate.productId;
        break;
      }
    }
  }

  const tcgCell = sheet.getRange(row, 8);
  tcgCell.setValue(tcgPrice);
  sheet.getRange(row, 16).setValue(productId);

  if (Object.keys(tcg).length > 0 && !tcgVariant) {
    const available = [];
    if (tcg.normal) available.push('Normal');
    if (tcg.holofoil) available.push('Holo');
    if (tcg['reverse-holofoil']) available.push('Reverse');
    tcgCell.setNote(
      '⚠️ Variant "' + variant + '" was not found.\nAvailable variants: ' +
      (available.join(', ') || 'unknown')
    );
  } else {
    tcgCell.clearNote();
  }

  sheet.getRange(row, 15).setValue(new Date());
}

// PSA pricing

function shouldRefreshPSA(price, lastUpdated, watchMode) {
  if (watchMode === 'OFF') return false;

  // Always perform the first PSA lookup for a card.
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

function updatePSAPrices() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET);
  if (!sheet) throw new Error('Collection sheet was not found.');

  const apiKey = PropertiesService.getScriptProperties().getProperty('POKEMON_PRICE_API_KEY');
  if (!apiKey) {
    throw new Error('POKEMON_PRICE_API_KEY was not found. Use ⚡ Pokémon → 🔑 Setup API key first.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const MAX_LOOKUPS = 40;
  let lookupsUsed = 0;

  for (let row = 2; row <= lastRow; row++) {
    if (lookupsUsed >= MAX_LOOKUPS) break;

    const setId = String(sheet.getRange(row, 1).getValue()).trim();
    const cardNumber = String(sheet.getRange(row, 2).getDisplayValue()).trim();
    const oldPSA10 = Number(sheet.getRange(row, 9).getValue()) || 0;
    let watchMode = String(sheet.getRange(row, 12).getValue()).trim().toUpperCase();
    const psaUpdated = sheet.getRange(row, 13).getValue();
    const productId = String(sheet.getRange(row, 16).getValue()).trim();

    if (!setId || !cardNumber) continue;
    if (!productId) {
      console.log('Row ' + row + ': missing TCGplayer ID');
      continue;
    }

    if (!watchMode) {
      watchMode = 'AUTO';
      sheet.getRange(row, 12).setValue('AUTO');
    }
    if (!shouldRefreshPSA(oldPSA10, psaUpdated, watchMode)) continue;

    try {
      let customPrinting = false;
      try {
        const tcgdexCard = getTcgdexCard_(setId, cardNumber);
        customPrinting = isCustomPrinting_(tcgdexCard, productId);
      } catch (error) {
        console.log('Row ' + row + ': custom printing detection failed: ' + error.message);
      }

      const url =
        'https://www.pokemonpricetracker.com/api/v2/cards?tcgPlayerId=' +
        encodeURIComponent(productId) +
        '&includeEbay=true';

      const response = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: { Authorization: 'Bearer ' + apiKey, Accept: 'application/json' },
        muteHttpExceptions: true
      });

      lookupsUsed++;
      const status = response.getResponseCode();
      if (status !== 200) {
        console.log('Row ' + row + ': API HTTP ' + status);
        continue;
      }

      const json = JSON.parse(response.getContentText());
      const card = Array.isArray(json.data) ? (json.data[0] || null) : (json.data || null);
      if (!card) {
        console.log('Row ' + row + ': API returned no card');
        continue;
      }

      if (customPrinting) {
        const rawMarketPrice = card.prices?.market ?? null;
        const tcgCell = sheet.getRange(row, 8);

        if (rawMarketPrice !== null && rawMarketPrice !== '') {
          tcgCell.setValue(Number(rawMarketPrice));
          const primaryPrinting = card.prices?.primaryPrinting || card.printingsAvailable?.[0] || 'unknown';
          const priceUpdated = card.prices?.lastUpdated
            ? Utilities.formatDate(new Date(card.prices.lastUpdated), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
            : 'unknown';

          tcgCell.setNote(
            'Custom TCGplayer printing.\n' +
            'Market price from Pokémon Price Tracker.\n' +
            'TCGplayer Product ID: ' + productId +
            '\nPrinting: ' + primaryPrinting +
            '\nPrice updated: ' + priceUpdated
          );
        } else {
          tcgCell.setNote(
            'Custom TCGplayer printing.\n' +
            'Pokémon Price Tracker returned no market price.\n' +
            'TCGplayer Product ID: ' + productId
          );
        }
      }

      const rawTCG = Number(sheet.getRange(row, 8).getValue()) || 0;
      const salesByGrade = card.ebay?.salesByGrade || {};
      const psa10 = salesByGrade.psa10 || null;

      if (psa10) {
        const psa10Price =
          psa10.smartMarketPrice?.price ??
          psa10.medianPrice ??
          psa10.averagePrice ??
          '';
        const psa10Sales = Number(psa10.count) || 0;

        sheet.getRange(row, 9).setValue(psa10Price);
        sheet.getRange(row, 10).setValue(psa10Sales);
        if (psa10Price !== '' && rawTCG > 0) {
          sheet.getRange(row, 11).setValue(Number(psa10Price) / rawTCG);
        } else {
          sheet.getRange(row, 11).clearContent();
        }

        const confidence = psa10.smartMarketPrice?.confidence ?? 'unknown';
        const smartPrice = psa10.smartMarketPrice?.price ?? '';
        const lastSale = psa10.lastSaleDate
          ? Utilities.formatDate(new Date(psa10.lastSaleDate), Session.getScriptTimeZone(), 'yyyy-MM-dd')
          : 'unknown';

        sheet.getRange(row, 9).setNote([
          'PSA 10',
          'Sales: ' + psa10Sales,
          'Smart price: ' + (smartPrice !== '' ? '$' + smartPrice : 'N/A'),
          'Median: ' + (psa10.medianPrice != null ? '$' + psa10.medianPrice : 'N/A'),
          'Average: ' + (psa10.averagePrice != null ? '$' + psa10.averagePrice : 'N/A'),
          'Range: ' +
            (psa10.minPrice != null ? '$' + psa10.minPrice : '?') +
            ' – ' +
            (psa10.maxPrice != null ? '$' + psa10.maxPrice : '?'),
          'Confidence: ' + confidence,
          'Last sale: ' + lastSale
        ].join('\n'));
      } else {
        sheet.getRange(row, 9).clearContent();
        sheet.getRange(row, 10).setValue(0);
        sheet.getRange(row, 11).clearContent();

        const availableGrades = Object.keys(salesByGrade);
        sheet.getRange(row, 9).setNote(
          availableGrades.length > 0
            ? 'No PSA 10 sales data found.\nAvailable grades: ' + availableGrades.join(', ')
            : 'No graded sales data found.'
        );
      }

      sheet.getRange(row, 13).setValue(new Date());
    } catch (error) {
      console.log('Row ' + row + ': ERROR: ' + error.message);
    }
  }

  console.log('PSA update finished. Lookups used: ' + lookupsUsed + '/' + MAX_LOOKUPS);
}

