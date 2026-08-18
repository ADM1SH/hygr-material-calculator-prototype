/**
 * HYGR Material Requirement Calculator & Stock Card Prototype
 * Frontend Reactive Logic & API Client
 * Adhering to Industrial Minimalism (DESIGN.md)
 */

let state = null;
let currentView = 'bom';
let ledgerFilterType = 'ALL';
let ledgerSearchQuery = '';
let debounceTimer = null;

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  fetchState();

  // Escape key closes open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeIssueBatchModal();
      closeStockModal();
    }
  });
});

async function fetchState() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error('Failed to fetch state');
    state = await res.json();
    renderAll();
  } catch (err) {
    console.error('Error fetching state:', err);
    showToast('Failed to connect to backend server', 'error');
  }
}

// ==========================================
// RENDER CONTROLLERS
// ==========================================

function renderAll() {
  if (!state) return;

  renderProductSelector();
  renderPlanningControls();
  renderFeasibilityKPIs();
  renderNavigationBadges();
  renderStockModalDropdown();

  // Always update all data tables so they are continuously in sync
  renderBomTable();
  renderLedgerTable();
  renderMasterTable();
  renderBatchesTable();
}

function switchView(viewName) {
  currentView = viewName;

  // Update Navigation Tab Buttons
  document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-btn-${viewName}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Show Active View Panel
  document.querySelectorAll('.view-panel').forEach(panel => panel.style.display = 'none');
  const activePanel = document.getElementById(`view-${viewName}`);
  if (activePanel) activePanel.style.display = 'block';

  renderAll();
}

// ==========================================
// LEFT SIDEBAR: PRODUCT & PLANNING CONTROLS
// ==========================================

function renderProductSelector() {
  const select = document.getElementById('product-select');
  const activeFgCode = state.active_plan.fg_code;
  
  select.innerHTML = state.product_order.map(code => {
    const p = state.products[code];
    return `<option value="${p.fg_code}" ${p.fg_code === activeFgCode ? 'selected' : ''}>${p.fg_code} - ${p.name}</option>`;
  }).join('');

  document.getElementById('active-sku-badge').textContent = activeFgCode;
  const activeProd = state.products[activeFgCode];
  if (activeProd) {
    document.getElementById('product-desc').textContent = activeProd.description;
    const fgSohEl = document.getElementById('fg-soh-display');
    if (fgSohEl) {
      fgSohEl.textContent = `${Math.round(activeProd.stock_on_hand || 0)} PCS`;
    }
  }
}

function renderPlanningControls() {
  const plan = state.active_plan;
  const unitWeight = state.products[plan.fg_code] ? state.products[plan.fg_code].unit_weight_grams : 5.0;

  const pcsInput = document.getElementById('input-target-pcs');
  const kgInput = document.getElementById('input-target-kg');
  const bufInput = document.getElementById('input-buffer');

  // Only update fields that the user is NOT actively typing in
  if (document.activeElement !== pcsInput && pcsInput) {
    pcsInput.value = Math.round(plan.target_pieces);
  }

  if (document.activeElement !== kgInput && kgInput) {
    kgInput.value = Number(plan.target_bulk_kg).toFixed(3);
  }

  if (document.activeElement !== bufInput && bufInput) {
    bufInput.value = Number(plan.yield_buffer_percent || 0).toFixed(1);
  }
}

function renderFeasibilityKPIs() {
  const calc = state.calculation;
  document.getElementById('quick-rm-total').textContent = `${calc.total_rm_kg.toFixed(3)} KG`;
  document.getElementById('quick-pm-total').textContent = `${Math.round(calc.total_pm_pcs)} PCS`;

  const badge = document.getElementById('quick-shortage-badge');
  const feasibilityChip = document.getElementById('feasibility-chip');

  if (calc.shortage_count > 0) {
    badge.className = 'status-chip chip-error';
    badge.textContent = `[!] ${calc.shortage_count} SHORTAGES`;

    feasibilityChip.className = 'status-chip chip-error';
    feasibilityChip.textContent = 'SHORTAGE';
  } else {
    badge.className = 'status-chip chip-success';
    badge.textContent = '100% SUFFICIENT';

    feasibilityChip.className = 'status-chip chip-success';
    feasibilityChip.textContent = 'FEASIBLE';
  }
}

function renderNavigationBadges() {
  document.getElementById('badge-shortage-count').textContent = state.calculation.shortage_count;
  document.getElementById('badge-ledger-count').textContent = state.ledger.length;
  document.getElementById('badge-batch-count').textContent = state.batches.length;

  // Count reorders in master
  let reorders = 0;
  state.material_order.forEach(code => {
    const m = state.materials[code];
    const amu = m.avg_monthly_usage || 1;
    const coverDays = (m.stock_on_hand / amu) * 30;
    if (coverDays <= m.lead_time_days) reorders++;
  });
  document.getElementById('badge-reorder-count').textContent = reorders;
}

// ==========================================
// VIEW 1: LIVE BOM REQUIREMENT TABLE
// ==========================================

let triggerRowFlash = false;

function renderBomTable() {
  const tbody = document.getElementById('bom-table-body');
  const rows = state.calculation.rows;
  const flashClass = triggerRowFlash ? 'row-flash' : '';

  tbody.innerHTML = rows.map(r => {
    const isRM = (r.category === 'RAW_MATERIAL');
    const recipeStr = isRM ? `${r.recipe_qty.toFixed(1)} GM` : `${Math.round(r.recipe_qty)} PCS`;
    const makeupStr = isRM ? `${r.usage_per_piece.toFixed(4)}g` : `1 pc`;
    const reqStr = isRM ? `${r.required_qty.toFixed(4)} KG` : `${Math.round(r.required_qty)} PCS`;
    const sohStr = isRM ? `${r.stock_on_hand.toFixed(3)} KG` : `${Math.round(r.stock_on_hand)} PCS`;
    const balStr = isRM ? `${r.balance_after.toFixed(3)} KG` : `${Math.round(r.balance_after)} PCS`;

    const statusBadge = r.is_shortage
      ? `<span class="status-chip chip-error">[!] SHORT (-${r.deficit.toFixed(isRM ? 4 : 0)} ${r.required_uom})</span>`
      : `<span class="status-chip chip-success">[OK] SUFF</span>`;

    return `
      <tr class="${flashClass}">
        <td class="data-tabular" style="font-weight: 700;">${r.rm_code}</td>
        <td>${r.rm_name}</td>
        <td class="text-right data-tabular">${recipeStr}</td>
        <td class="text-right data-tabular">${makeupStr}</td>
        <td class="text-right data-tabular" style="font-weight: 700;">${reqStr}</td>
        <td class="text-right data-tabular" style="font-weight: 700; color: var(--primary);">${sohStr}</td>
        <td class="text-right data-tabular" style="color: ${r.is_shortage ? 'var(--error)' : 'inherit'}; font-weight: ${r.is_shortage ? '700' : '500'};">${balStr}</td>
        <td class="text-center">${statusBadge}</td>
      </tr>
    `;
  }).join('');

  if (triggerRowFlash) {
    setTimeout(() => { triggerRowFlash = false; }, 1600);
  }

  document.getElementById('bom-summary-count').textContent = `${rows.length} Material Lines in Active Recipe`;
  document.getElementById('bom-summary-weights').textContent = `Total Bulk RM: ${state.calculation.total_rm_kg.toFixed(3)} KG • Total PM: ${Math.round(state.calculation.total_pm_pcs)} PCS`;
}

// ==========================================
// VIEW 2: STOCK CARD AUDIT LEDGER
// ==========================================

function filterLedger(query) {
  ledgerSearchQuery = (query || '').toLowerCase().trim();
  renderLedgerTable();
}

function filterLedgerType(type) {
  ledgerFilterType = type;
  renderLedgerTable();
}

function renderLedgerTable() {
  const tbody = document.getElementById('ledger-table-body');
  let items = state.ledger || [];

  // Filter by Type
  if (ledgerFilterType !== 'ALL') {
    items = items.filter(tx => tx.type === ledgerFilterType);
  }

  // Filter by Search Query
  if (ledgerSearchQuery) {
    items = items.filter(tx => 
      tx.material_code.toLowerCase().includes(ledgerSearchQuery) ||
      tx.material_name.toLowerCase().includes(ledgerSearchQuery) ||
      (tx.reference_doc || '').toLowerCase().includes(ledgerSearchQuery) ||
      (tx.operator_name || '').toLowerCase().includes(ledgerSearchQuery) ||
      (tx.notes || '').toLowerCase().includes(ledgerSearchQuery)
    );
  }

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center" style="padding: 24px; color: var(--outline);">No transactions found in audit ledger.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(tx => {
    const isIN = (tx.type === 'STOCK_IN');
    const isRM = (tx.uom === 'KG');
    const qtySign = isIN ? '+' : '-';
    const qtyStr = `${qtySign}${tx.quantity.toFixed(isRM ? 4 : 0)} ${tx.uom}`;
    const beforeStr = `${tx.balance_before.toFixed(isRM ? 3 : 0)} ${tx.uom}`;
    const afterStr = `${tx.balance_after.toFixed(isRM ? 3 : 0)} ${tx.uom}`;

    const typeBadge = isIN
      ? `<span class="status-chip chip-success">IN (+)</span>`
      : `<span class="status-chip chip-error">OUT (-)</span>`;

    return `
      <tr>
        <td class="data-tabular">#${tx.transaction_id}</td>
        <td class="data-tabular" style="color: var(--on-surface-variant); font-size: 11px;">${tx.timestamp}</td>
        <td class="data-tabular" style="font-weight: 700;">${tx.material_code}</td>
        <td>${tx.material_name}</td>
        <td>${typeBadge}</td>
        <td class="text-right data-tabular" style="font-weight: 700; color: ${isIN ? 'var(--success)' : 'var(--error)'};">${qtyStr}</td>
        <td class="text-right data-tabular">${beforeStr}</td>
        <td class="text-right data-tabular" style="font-weight: 700;">${afterStr}</td>
        <td class="data-tabular">${tx.reference_doc || '-'}</td>
        <td>${tx.operator_name || '-'}</td>
        <td style="color: var(--on-surface-variant); font-size: 12px;">${tx.notes || '-'}</td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// VIEW 3: STOCK HEALTH & SCM RADAR
// ==========================================

function renderMasterTable() {
  const tbody = document.getElementById('master-table-body');
  const materials = state.materials;
  const order = state.material_order;

  let totalItems = order.length;
  let reorderCount = 0;
  let lowCount = 0;
  let totalBulkKg = 0.0;

  const rowsHtml = order.map(code => {
    const m = materials[code];
    const isRM = (m.uom === 'KG');
    if (isRM) totalBulkKg += m.stock_on_hand;

    const amu = m.avg_monthly_usage || 1.0;
    const scm = (m.stock_on_hand / amu);
    const coverDays = scm * 30.0;

    let statusText = 'HEALTHY';
    let statusClass = 'chip-success';

    if (coverDays <= m.lead_time_days) {
      statusText = 'REORDER NOW';
      statusClass = 'chip-error';
      reorderCount++;
    } else if (coverDays <= m.lead_time_days + 21) {
      statusText = 'LOW STOCK';
      statusClass = 'chip-warning';
      lowCount++;
    } else if (scm > 6.0) {
      statusText = 'OVERSTOCKED';
      statusClass = 'chip-info';
    }

    const sohStr = isRM ? `${m.stock_on_hand.toFixed(3)} KG` : `${Math.round(m.stock_on_hand)} PCS`;
    const amuStr = isRM ? `${amu.toFixed(1)} KG` : `${Math.round(amu)} PCS`;

    return `
      <tr>
        <td class="data-tabular" style="font-weight: 700;">${m.code}</td>
        <td>${m.description}</td>
        <td><span class="label-caps">${isRM ? 'Raw Material' : 'Packaging'}</span></td>
        <td class="text-right data-tabular" style="font-weight: 700;">${sohStr}</td>
        <td class="text-right data-tabular">${amuStr}</td>
        <td class="text-right data-tabular">${scm.toFixed(1)} m</td>
        <td class="text-right data-tabular">${Math.round(coverDays)} d</td>
        <td class="text-right data-tabular">${m.lead_time_days} d</td>
        <td class="text-center"><span class="status-chip ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rowsHtml;

  // Update KPIs
  document.getElementById('kpi-total-items').textContent = totalItems;
  document.getElementById('kpi-reorder-count').textContent = reorderCount;
  document.getElementById('kpi-low-count').textContent = lowCount;
  document.getElementById('kpi-total-bulk').textContent = `${totalBulkKg.toFixed(1)} KG`;
}

// ==========================================
// VIEW 4: BATCH PRODUCTION HISTORY
// ==========================================

function renderBatchesTable() {
  const tbody = document.getElementById('batches-table-body');
  const batches = state.batches || [];

  if (batches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding: 24px; color: var(--outline);">No manufacturing batches issued yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = batches.map(b => `
    <tr>
      <td class="data-tabular" style="font-weight: 700;">${b.batch_number}</td>
      <td class="data-tabular">${b.fg_code}</td>
      <td>${b.fg_name}</td>
      <td class="data-tabular" style="color: var(--on-surface-variant); font-size: 11px;">${b.timestamp}</td>
      <td>${b.operator_name}</td>
      <td class="text-right data-tabular" style="font-weight: 700;">${Math.round(b.target_pieces)} PCS</td>
      <td class="text-right data-tabular">${Number(b.bulk_kg).toFixed(3)} KG</td>
      <td class="text-center"><span class="status-chip chip-success">${b.status}</span></td>
      <td class="text-right data-tabular">${b.material_lines} lines</td>
    </tr>
  `).join('');
}

// ==========================================
// USER INTERACTIONS & API MUTATIONS
// ==========================================

async function onProductChange(fgCode) {
  try {
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fg_code: fgCode })
    });
    state = await res.json();
    renderAll();
    showToast(`Switched active product to ${fgCode}`, 'success');
  } catch (err) {
    console.error(err);
  }
}

function recalculateClientSide(pieces, bufferPercent) {
  if (!state || !state.boms) return;
  const fgCode = state.active_plan.fg_code;
  const bom = state.boms[fgCode] || [];
  const materials = state.materials;
  const mult = 1.0 + (bufferPercent / 100.0);

  let totalRmKg = 0.0;
  let totalPmPcs = 0.0;
  let shortageCount = 0;

  const rows = bom.map(item => {
    const mat = materials[item.rm_code];
    if (!mat) return null;
    let reqQty = 0.0;
    let reqUom = "KG";

    if (mat.category === "RAW_MATERIAL") {
      const reqGrams = item.usage_per_piece * pieces * mult;
      reqQty = reqGrams / 1000.0;
      totalRmKg += reqQty;
      reqUom = "KG";
    } else {
      reqQty = Math.ceil(item.usage_per_piece * pieces * mult);
      totalPmPcs += reqQty;
      reqUom = "PCS";
    }

    const balAfter = mat.stock_on_hand - reqQty;
    const isShort = (balAfter < 0.0);
    const deficit = isShort ? (reqQty - mat.stock_on_hand) : 0.0;
    if (isShort) shortageCount++;

    return {
      rm_code: item.rm_code,
      rm_name: mat.description,
      recipe_qty: item.recipe_qty,
      recipe_uom: item.uom,
      usage_per_piece: item.usage_per_piece,
      required_qty: reqQty,
      required_uom: reqUom,
      stock_on_hand: mat.stock_on_hand,
      balance_after: balAfter,
      is_shortage: isShort,
      deficit: deficit,
      category: mat.category,
      lead_time_days: mat.lead_time_days
    };
  }).filter(Boolean);

  state.calculation = {
    rows: rows,
    shortage_count: shortageCount,
    total_rm_kg: totalRmKg,
    total_pm_pcs: totalPmPcs,
    is_sufficient: (shortageCount === 0)
  };

  renderFeasibilityKPIs();
  renderNavigationBadges();
  if (currentView === 'bom') {
    renderBomTable();
  }
}

function onPiecesInput(val) {
  clearTimeout(debounceTimer);
  const pieces = parseFloat(val);
  if (isNaN(pieces) || pieces <= 0) return;

  const unitWeight = state.products[state.active_plan.fg_code] ? state.products[state.active_plan.fg_code].unit_weight_grams : 5.0;
  const bulkKg = (pieces * unitWeight) / 1000.0;

  // Sync the Bulk KG field without disturbing focus
  const kgInput = document.getElementById('input-target-kg');
  if (kgInput && document.activeElement !== kgInput) {
    kgInput.value = bulkKg.toFixed(3);
  }

  state.active_plan.target_pieces = pieces;
  state.active_plan.target_bulk_kg = bulkKg;
  state.active_plan.mode = 'BY_PIECES';

  // Instant zero-latency calculation
  recalculateClientSide(pieces, state.active_plan.yield_buffer_percent || 0);

  // Debounced server sync
  debounceTimer = setTimeout(async () => {
    try {
      await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_pieces: pieces, mode: 'BY_PIECES' })
      });
    } catch (err) {
      console.error(err);
    }
  }, 300);
}

function onBulkKgInput(val) {
  clearTimeout(debounceTimer);
  const bulkKg = parseFloat(val);
  if (isNaN(bulkKg) || bulkKg <= 0) return;

  const unitWeight = state.products[state.active_plan.fg_code] ? state.products[state.active_plan.fg_code].unit_weight_grams : 5.0;
  const pieces = (bulkKg * 1000.0) / unitWeight;

  // Sync the Pieces field without disturbing focus
  const pcsInput = document.getElementById('input-target-pcs');
  if (pcsInput && document.activeElement !== pcsInput) {
    pcsInput.value = Math.round(pieces);
  }

  state.active_plan.target_pieces = pieces;
  state.active_plan.target_bulk_kg = bulkKg;
  state.active_plan.mode = 'BY_BULK_KG';

  // Instant zero-latency calculation
  recalculateClientSide(pieces, state.active_plan.yield_buffer_percent || 0);

  // Debounced server sync
  debounceTimer = setTimeout(async () => {
    try {
      await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_bulk_kg: bulkKg, mode: 'BY_BULK_KG' })
      });
    } catch (err) {
      console.error(err);
    }
  }, 300);
}

function onBufferInput(val) {
  clearTimeout(debounceTimer);
  const buffer = parseFloat(val) || 0.0;
  state.active_plan.yield_buffer_percent = buffer;

  // Instant zero-latency calculation
  recalculateClientSide(state.active_plan.target_pieces, buffer);

  debounceTimer = setTimeout(async () => {
    try {
      await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yield_buffer_percent: buffer })
      });
    } catch (err) {
      console.error(err);
    }
  }, 300);
}

// ==========================================
// MODAL 1: BATCH PRODUCTION ISSUE
// ==========================================

function openIssueBatchModal() {
  const plan = state.active_plan;
  const prod = state.products[plan.fg_code];
  const calc = state.calculation;

  document.getElementById('modal-batch-prod-name').textContent = `${prod.fgCode || plan.fg_code} - ${prod.name}`;
  document.getElementById('modal-batch-target-summary').textContent = `Target: ${Math.round(plan.target_pieces)} PCS (${plan.target_bulk_kg.toFixed(3)} KG Bulk SFG)`;
  
  const defaultRef = `BATCH-${(prod.fgCode || plan.fg_code).substring(3, 7)}-${Math.round(plan.target_pieces)}PCS`;
  document.getElementById('modal-batch-ref').value = defaultRef;

  const alertBox = document.getElementById('modal-batch-shortage-alert');
  alertBox.style.display = (calc.shortage_count > 0) ? 'block' : 'none';

  document.getElementById('modal-issue-batch').classList.add('open');
}

function closeIssueBatchModal() {
  document.getElementById('modal-issue-batch').classList.remove('open');
}

async function submitBatchIssue() {
  const batchRef = document.getElementById('modal-batch-ref').value.trim() || 'BATCH-RUN';
  const operatorName = document.getElementById('modal-batch-operator').value.trim() || 'Operator Adam';

  try {
    const res = await fetch('/api/batch/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_ref: batchRef, operator_name: operatorName })
    });
    if (!res.ok) throw new Error('Batch issue rejected');
    state = await res.json();
    closeIssueBatchModal();
    
    // Enable visual flash animation on table rows
    triggerRowFlash = true;

    // Show Live BOM execution status banner
    const banner = document.getElementById('bom-status-banner');
    const bannerText = document.getElementById('bom-status-banner-text');
    if (banner && bannerText) {
      const summary = state.recent_batch_summary;
      const targetPcs = summary ? Math.round(summary.target_pieces) : Math.round(state.active_plan.target_pieces);
      bannerText.innerHTML = `<strong>✓ Batch [${batchRef}] Successfully Executed:</strong> Deducted warehouse inventory for 16 material lines (${summary ? summary.total_rm_kg_deducted.toFixed(3) : '2.000'} KG Raw Materials & ${summary ? summary.total_pm_pcs_deducted : '800'} PCS Packaging). Finished Goods inventory increased by +${targetPcs} PCS.`;
      banner.style.display = 'flex';
    }

    // Switch to Live BOM table to immediately show new deducted Stock On Hand
    switchView('bom');
    renderAll();
    showToast(`Batch [${batchRef}] executed! Stock On Hand deducted & reconciled.`, 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to issue batch', 'error');
  }
}

// ==========================================
// MODAL 2: STOCK CARD TRANSACTION ENTRY
// ==========================================

function renderStockModalDropdown() {
  const select = document.getElementById('modal-stock-mat');
  if (!select) return;

  select.innerHTML = state.material_order.map(code => {
    const m = state.materials[code];
    return `<option value="${m.code}">${m.code} - ${m.description} (${m.uom})</option>`;
  }).join('');

  if (state.material_order.length > 0) {
    onStockModalMatChange(state.material_order[0]);
  }
}

function onStockModalMatChange(code) {
  const mat = state.materials[code];
  if (!mat) return;

  const isRM = (mat.uom === 'KG');
  document.getElementById('modal-stock-soh').textContent = `${mat.stock_on_hand.toFixed(isRM ? 3 : 0)} ${mat.uom}`;
  document.getElementById('modal-stock-lead').textContent = `${mat.lead_time_days} days`;
  document.getElementById('modal-stock-uom').textContent = mat.uom;
}

function openStockModal() {
  document.getElementById('modal-stock-qty').value = '';
  document.getElementById('modal-stock-ref').value = '';
  document.getElementById('modal-stock-notes').value = '';
  document.getElementById('modal-stock-entry').classList.add('open');
}

function closeStockModal() {
  document.getElementById('modal-stock-entry').classList.remove('open');
}

async function submitStockTransaction() {
  const code = document.getElementById('modal-stock-mat').value;
  const type = document.getElementById('modal-stock-type').value;
  const qty = parseFloat(document.getElementById('modal-stock-qty').value) || 0;
  const cat = document.getElementById('modal-stock-cat').value;
  const refDoc = document.getElementById('modal-stock-ref').value.trim() || 'MANUAL';
  const opName = document.getElementById('modal-stock-operator').value.trim() || 'Operator Adam';
  const notes = document.getElementById('modal-stock-notes').value.trim() || cat;

  if (qty <= 0) {
    showToast('Quantity must be greater than zero', 'error');
    return;
  }

  try {
    const res = await fetch('/api/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        material_code: code,
        type: type,
        category: cat,
        quantity: qty,
        reference_doc: refDoc,
        operator_name: opName,
        notes: notes
      })
    });

    if (!res.ok) throw new Error('Transaction rejected');
    state = await res.json();
    closeStockModal();
    triggerRowFlash = true;
    renderAll();
    showToast(`Stock card updated for ${code}!`, 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to record transaction', 'error');
  }
}

// ==========================================
// EXPORTS & SYSTEM RESET
// ==========================================

function exportData(type) {
  if (type === 'ledger' || type === 'both') {
    window.open('/api/export/ledger.csv', '_blank');
  }
  if (type === 'inventory' || type === 'both') {
    window.open('/api/export/inventory.csv', '_blank');
  }
  showToast('Exporting CSV reports...', 'info');
}

async function resetDatabase() {
  if (!confirm('Are you sure you want to reset all inventory and transactions back to default Excel state?')) {
    return;
  }
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    state = await res.json();
    renderAll();
    showToast('Database reset to original seed state from Bom Example.xlsx', 'success');
  } catch (err) {
    console.error(err);
    showToast('Reset failed', 'error');
  }
}

// ==========================================
// TOAST NOTIFICATION HELPER
// ==========================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : (type === 'error' ? '!' : 'ℹ')}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    toast.style.transition = 'opacity 0.2s, transform 0.2s';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}
