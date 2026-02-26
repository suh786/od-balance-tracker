// ============================================================
// CONFIG — Paste your Google Apps Script Web App URL here
// ============================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbyRG4-WCnMvpoHE-gObK3dSoafMwM80FQafhoedt5uItyUXyn1L97URPiG4GftMBHlwIQ/exec';
// ============================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// API key from localStorage
let API_KEY = localStorage.getItem('od_api_key') || '';

// State
let transactions = [];
let currentType = 'debit';
let editingRow = null;
let remarkHistory = [];

// DOM refs
const balanceAmount = $('#balance-amount');
const txnList = $('#txn-list');
const txnEmpty = $('#txn-empty');
const modalOverlay = $('#modal-overlay');
const modalTitle = $('#modal-title');
const txnForm = $('#txn-form');
const txnRow = $('#txn-row');
const txnDate = $('#txn-date');
const txnAmount = $('#txn-amount');
const txnRemark = $('#txn-remark');
const btnDelete = $('#btn-delete');
const btnAdd = $('#btn-add');
const progressBar = $('#progress-bar');
const toastEl = $('#toast');
const remarkSuggestions = $('#remark-suggestions');

// --- API Helpers ---

async function api(action, body = null) {
  if (!API_URL || !API_KEY) {
    throw new Error('Passcode not set');
  }

  let res;
  try {
    if (body) {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, key: API_KEY, ...body })
      });
    } else {
      res = await fetch(`${API_URL}?action=${action}&key=${encodeURIComponent(API_KEY)}`);
    }
  } catch (e) {
    throw new Error(navigator.onLine ? 'Server unreachable' : 'You are offline');
  }

  if (!res.ok) {
    throw new Error(`Server error (${res.status})`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

// --- Balance ---

function showBalance(bal) {
  balanceAmount.textContent = formatCurrency(bal);
  balanceAmount.className = 'balance-amount ' + (bal >= 0 ? 'positive' : 'negative');
}

async function fetchBalance() {
  try {
    const data = await api('balance');
    const bal = data.balance || 0;
    showBalance(bal);
  } catch (e) {
    console.error('Failed to fetch balance:', e);
    toast(e.message || 'Failed to load balance');
  }
}

// --- Transactions ---

async function fetchTransactions() {
  try {
    const data = await api('transactions');
    transactions = (data.transactions || []).map((t) => ({
      ...t,
      date: normalizeDate(t.date)
    }));

    // Collect unique remarks for suggestions
    remarkHistory = [...new Set(transactions.map((t) => t.remark).filter(Boolean))];

    renderTransactions();
  } catch (e) {
    console.error('Failed to fetch transactions:', e);
    toast(e.message || 'Failed to load transactions');
  }
}

function renderTransactions() {
  if (transactions.length === 0) {
    txnList.style.display = 'none';
    txnEmpty.style.display = 'block';
    return;
  }

  txnEmpty.style.display = 'none';
  txnList.style.display = 'flex';

  // Sort newest first
  const sorted = [...transactions].sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return b.row - a.row;
  });

  txnList.innerHTML = sorted
    .map((t) => {
      const isCredit = t.amount > 0;
      const absAmt = Math.abs(t.amount);
      return `
      <div class="txn-item" data-row="${t.row}">
        <span class="txn-date">${formatDateDisplay(t.date)}</span>
        <span class="txn-remark">${escapeHtml(t.remark)}</span>
        <span class="txn-amount ${isCredit ? 'positive' : 'negative'}">
          ${isCredit ? '+' : '-'}${formatCurrency(absAmt)}
        </span>
      </div>`;
    })
    .join('');

  // Tap to edit
  $$('.txn-item').forEach((item) => {
    item.addEventListener('click', () => {
      const row = parseInt(item.dataset.row);
      const txn = transactions.find((t) => t.row === row);
      if (txn) openEditModal(txn);
    });
  });
}

// --- Modal ---

btnAdd.addEventListener('click', openAddModal);
$('#btn-cancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

function openAddModal() {
  editingRow = null;
  modalTitle.textContent = 'Add Transaction';
  btnDelete.style.display = 'none';
  txnRow.value = '';
  txnDate.value = todayStr();
  txnAmount.value = '';
  txnRemark.value = '';
  setType('debit');
  populateRemarkSuggestions();
  history.pushState({ modal: true }, '');
  modalOverlay.classList.add('open');
  txnAmount.focus();
}

function openEditModal(txn) {
  editingRow = txn.row;
  modalTitle.textContent = 'Edit Transaction';
  btnDelete.style.display = 'block';
  txnRow.value = txn.row;
  txnDate.value = txn.date;
  txnAmount.value = Math.abs(txn.amount);
  txnRemark.value = txn.remark;
  setType(txn.amount >= 0 ? 'credit' : 'debit');
  populateRemarkSuggestions();
  history.pushState({ modal: true }, '');
  modalOverlay.classList.add('open');
}

function closeModal() {
  if (!modalOverlay.classList.contains('open')) return;
  modalOverlay.classList.remove('open');
  editingRow = null;
  // Pop the history entry we pushed (unless back button already did)
  if (history.state?.modal) history.back();
}

window.addEventListener('popstate', () => {
  if (modalOverlay.classList.contains('open')) {
    modalOverlay.classList.remove('open');
    editingRow = null;
  }
});

// --- Type Toggle ---

$$('.toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => setType(btn.dataset.type));
});

function setType(type) {
  currentType = type;
  $$('.toggle-btn').forEach((b) => b.classList.remove('active'));
  $(`.toggle-btn[data-type="${type}"]`).classList.add('active');
}

// --- Amount Chips ---

$$('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const add = parseInt(chip.dataset.add);
    const current = parseFloat(txnAmount.value) || 0;
    txnAmount.value = current + add;
  });
});

// --- Remark Suggestions ---

function populateRemarkSuggestions() {
  remarkSuggestions.innerHTML = remarkHistory
    .map((r) => `<option value="${escapeHtml(r)}">`)
    .join('');
}

// --- Form Submit ---

txnForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const date = txnDate.value;
  const rawAmount = parseFloat(txnAmount.value);
  if (!date || isNaN(rawAmount) || rawAmount <= 0) {
    toast('Enter a valid date and amount');
    return;
  }

  const amount = currentType === 'debit' ? -rawAmount : rawAmount;
  const remark = txnRemark.value.trim();

  try {
    showLoading();

    if (editingRow) {
      await api('update', { row: editingRow, date, amount, remark });
      toast('Transaction updated');
    } else {
      await api('add', { date, amount, remark });
      toast('Transaction added');
    }

    closeModal();
    await loadAll();
  } catch (e) {
    console.error('Save failed:', e);
    toast(e.message || 'Failed to save');
  } finally {
    hideLoading();
  }
});

// --- Delete ---

btnDelete.addEventListener('click', async () => {
  if (!editingRow) return;
  if (!confirm('Delete this transaction?')) return;

  try {
    showLoading();
    await api('delete', { row: editingRow });
    toast('Transaction deleted');
    closeModal();
    await loadAll();
  } catch (e) {
    console.error('Delete failed:', e);
    toast(e.message || 'Failed to delete');
  } finally {
    hideLoading();
  }
});

// --- Utilities ---

function formatCurrency(n) {
  const abs = Math.abs(n);
  return '\u20B9' + abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function normalizeDate(dateStr) {
  if (!dateStr) return todayStr();
  // Handle ISO timestamps like "2026-02-08T18:30:00.000Z"
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  return dateStr.slice(0, 10);
}

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showLoading() {
  progressBar.classList.add('active');
}

function hideLoading() {
  progressBar.classList.remove('active');
}

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 4000);
}

// --- Service Worker ---

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});

  // When SW background-fetches fresh data, read it from cache directly
  // (not via fetch, which would re-trigger the SW and loop)
  // Debounce so both balance + transactions messages are batched
  let refreshTimer;
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'api-updated') return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      try {
        const cache = await caches.open('od-api-v1');

        const balRes = await cache.match(`${API_URL}?action=balance&key=${encodeURIComponent(API_KEY)}`);
        if (balRes) {
          const data = await balRes.json();
          showBalance(data.balance || 0);
        }

        const txnRes = await cache.match(`${API_URL}?action=transactions&key=${encodeURIComponent(API_KEY)}`);
        if (txnRes) {
          const data = await txnRes.json();
          transactions = (data.transactions || []).map((t) => ({
            ...t,
            date: normalizeDate(t.date)
          }));
          remarkHistory = [...new Set(transactions.map((t) => t.remark).filter(Boolean))];
          renderTransactions();
        }
      } catch (e) {
        console.error('Cache read failed:', e);
      }
    }, 300);
  });
}

// --- Load All ---

async function loadAll() {
  try {
    showLoading();
    await Promise.all([fetchBalance(), fetchTransactions()]);
  } finally {
    hideLoading();
  }
}

// --- Auth Screen ---

const authScreen = $('#auth-screen');
const authForm = $('#auth-form');
const authInput = $('#auth-passcode');

function showAuthScreen() {
  authScreen.classList.add('open');
  authInput.focus();
}

function hideAuthScreen() {
  authScreen.classList.remove('open');
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = authInput.value.trim();
  if (!code) return;

  API_KEY = code;
  showLoading();

  try {
    const data = await api('balance');
    // Key worked — save it
    localStorage.setItem('od_api_key', code);
    hideAuthScreen();
    showBalance(data.balance || 0);
    fetchTransactions();
  } catch (err) {
    API_KEY = '';
    toast(err.message === 'Unauthorized' ? 'Wrong passcode' : err.message);
  } finally {
    hideLoading();
  }
});

// --- Initial Load ---

if (API_KEY) {
  loadAll();
} else {
  showAuthScreen();
}
