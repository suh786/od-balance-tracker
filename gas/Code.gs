/**
 * OD Balance Tracker — Google Apps Script Backend
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. IMPORTANT: Change the API_KEY below to your own secret string
 * 5. Click Deploy → New deployment
 * 6. Select type: "Web app"
 * 7. Set "Execute as": Me
 * 8. Set "Who has access": Anyone (required for fetch calls, but protected by API key)
 * 9. Click Deploy and authorize when prompted
 * 10. Copy the Web App URL and paste it into js/app.js (API_URL constant)
 * 11. Also paste the same API_KEY into js/app.js
 *
 * IMPORTANT: After making changes to transactions via the app,
 * the Balance sheet cell =SUM(Transactions!B:B) updates automatically.
 */

// >>> CHANGE THIS to your own secret string <<<
const API_KEY = 'sa356117';

const SHEET_NAME = 'Transactions';
const HEADER_ROW = 1;

function doGet(e) {
  if (e.parameter.key !== API_KEY) {
    return jsonResponse({ error: 'Unauthorized' });
  }

  const action = e.parameter.action;

  switch (action) {
    case 'balance':
      return jsonResponse(getBalance());
    case 'transactions':
      return jsonResponse(getTransactions());
    default:
      return jsonResponse({ error: 'Unknown action' });
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  if (data.key !== API_KEY) {
    return jsonResponse({ error: 'Unauthorized' });
  }

  const action = data.action;

  switch (action) {
    case 'add':
      return jsonResponse(addTransaction(data));
    case 'update':
      return jsonResponse(updateTransaction(data));
    case 'delete':
      return jsonResponse(deleteTransaction(data));
    default:
      return jsonResponse({ error: 'Unknown action' }, 400);
  }
}

function getBalance() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const balanceSheet = ss.getSheetByName('Balance');
  const balance = balanceSheet.getRange('A2').getValue();
  return { balance: balance };
}

function getTransactions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const lastRow = getLastDataRow(sheet);

  if (lastRow <= HEADER_ROW) {
    return { transactions: [] };
  }

  const range = sheet.getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, 3);
  const values = range.getValues();

  const transactions = [];
  for (let i = 0; i < values.length; i++) {
    const [date, amount, remark] = values[i];
    if (date === '' && amount === '' && remark === '') continue;

    transactions.push({
      row: i + HEADER_ROW + 1,
      date: formatDate(date),
      amount: amount,
      remark: remark || ''
    });
  }

  return { transactions: transactions };
}

function addTransaction(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const lastRow = getLastDataRow(sheet);
  const newRow = lastRow + 1;

  sheet.getRange(newRow, 1).setValue(new Date(data.date));
  sheet.getRange(newRow, 2).setValue(Number(data.amount));
  sheet.getRange(newRow, 3).setValue(data.remark);

  return { success: true, row: newRow };
}

function updateTransaction(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const row = data.row;

  sheet.getRange(row, 1).setValue(new Date(data.date));
  sheet.getRange(row, 2).setValue(Number(data.amount));
  sheet.getRange(row, 3).setValue(data.remark);

  return { success: true };
}

function deleteTransaction(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  sheet.deleteRow(data.row);
  return { success: true };
}

// --- Helpers ---

function getLastDataRow(sheet) {
  const values = sheet.getRange('A:A').getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] !== '') return i + 1;
  }
  return HEADER_ROW;
}

function formatDate(date) {
  if (!(date instanceof Date)) return date;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
