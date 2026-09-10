/**
 * HYGR Material Requirement Calculator & Stock Card Prototype
 * Frontend Reactive Logic & API Client
 * Adhering to Industrial Minimalism (DESIGN.md)
 */

let state = null;
let currentView = 'schedule';
let scheduleViewMode = 'week'; // 'week', 'month', 'queue'
let scheduleFilterRecipe = 'ALL';
let scheduleWeekOffset = 0;
let bomFilterType = 'ALL';
let ledgerFilterType = 'ALL';
let ledgerSearchQuery = '';
let expandedDrilldowns = new Set();
let selectedDay = null;
let stagedBatch = null;
let stagedItems = [];
let debounceTimer = null;

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  fetchState();

  // Escape key closes open modals and slide-over drawers
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeStagingModal();
      closeStockModal();
      closeBatchDrawer();
      closeBmrModal();
      closeReorderModal();
    }
  });

  // Clear a validation highlight as soon as the operator edits the field.
  document.addEventListener('input', (e) => e.target.classList?.remove('is-invalid'));
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

  renderRoleButtons();
  renderBatchAddForm();
  renderDrawerFgSelect();
  renderScheduleRecipeFilter();
  renderFeasibilityCard();
  renderNavigationBadges();
  renderTimelineStrip();
  renderScheduleViews();
  renderBomTable();
  renderLedgerTable();
  renderMasterTable();
  renderBatchesTable();
  renderStockModalDropdown();
}

function switchView(viewName) {
  currentView = viewName;

  document.querySelectorAll('.top-nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeTopBtn = document.getElementById(`top-nav-btn-${viewName}`);
  if (activeTopBtn) activeTopBtn.classList.add('active');

  document.querySelectorAll('.view-panel').forEach(panel => panel.style.display = 'none');
  const activePanel = document.getElementById(`view-${viewName}`);
  if (activePanel) activePanel.style.display = 'block';

  renderAll();
}

// ==========================================
// ROLE SWITCHER
// ==========================================

async function switchRole(role) {
  try {
    const res = await fetch('/api/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    state = await res.json();
    renderAll();
    showToast(`Active access set to ${role.toUpperCase()}`, 'info');
  } catch (err) {
    console.error(err);
  }
}

function renderRoleButtons() {
  const role = state.user_role || 'admin';
  const adminBtn = document.getElementById('role-btn-admin');
  const opBtn = document.getElementById('role-btn-operator');

  if (adminBtn && opBtn) {
    if (role === 'admin') {
      adminBtn.className = 'role-toggle-btn active';
      opBtn.className = 'role-toggle-btn';
    } else {
      adminBtn.className = 'role-toggle-btn';
      opBtn.className = 'role-toggle-btn active';
    }
  }
}

// ==========================================
// LEFT SIDEBAR: BATCH FORM & PLAN METRICS
// ==========================================

function renderBatchAddForm() {
  const select = document.getElementById('input-batch-fg');
  if (!select || !state.products) return;

  const currentVal = select.value;
  select.innerHTML = state.product_order.map(code => {
    const p = state.products[code];
    return `<option value="${p.fg_code}">${p.fg_code} - ${p.name}</option>`;
  }).join('');

  if (currentVal && state.products[currentVal]) {
    select.value = currentVal;
  }
  updateEquivPreview();
}

function onBatchFormFgChange(val) {
  updateEquivPreview();
}

function onBatchFormUnitChange(val) {
  const qtyInput = document.getElementById('input-batch-qty');
  if (val === 'POTS') {
    qtyInput.value = '4.0';
  } else if (val === 'PIECES') {
    qtyInput.value = '1200';
  } else {
    qtyInput.value = '51.0';
  }
  updateEquivPreview();
}

function updateEquivPreview() {
  const fgCode = document.getElementById('input-batch-fg')?.value;
  const unitType = document.getElementById('input-batch-unit')?.value || 'BULK_KG';
  const qty = parseFloat(document.getElementById('input-batch-qty')?.value) || 0;
  const preview = document.getElementById('input-batch-equiv-preview');
  if (!preview || !fgCode || !state.products[fgCode]) return;

  const unitWeight = state.products[fgCode].unit_weight_grams || 5.0;
  // F1: one pot is the product's own SFG batch weight, not a fixed 1.5 KG.
  const sfgWeight = state.products[fgCode].sfg_batch_weight_grams || 1500.0;
  let bulkKg = qty;
  let pieces = Math.round((bulkKg * 1000.0) / unitWeight);

  if (unitType === 'POTS') {
    bulkKg = qty * (sfgWeight / 1000.0);
    pieces = Math.round((bulkKg * 1000.0) / unitWeight);
  } else if (unitType === 'PIECES') {
    pieces = Math.round(qty);
    bulkKg = (pieces * unitWeight) / 1000.0;
  }

  preview.textContent = `Equivalent: ${bulkKg.toFixed(3)} KG Bulk Mass • ${pieces.toLocaleString()} Finished Units`;
}

function renderFeasibilityCard() {
  const sim = state.simulation;
  if (!sim) return;

  let totalBulk = 0.0;
  let totalPcs = 0;
  let activeBatches = 0;

  state.weekly_plan.forEach(b => {
    if (b.status !== 'COMPLETED') {
      totalBulk += Number(b.target_bulk_kg || 0);
      totalPcs += Number(b.target_pieces || 0);
      activeBatches++;
    }
  });

  document.getElementById('quick-batches-count').textContent = activeBatches;
  document.getElementById('quick-bulk-total').textContent = `${totalBulk.toFixed(3)} KG`;
  document.getElementById('quick-pcs-total').textContent = `${totalPcs.toLocaleString()} PCS`;

  const badge = document.getElementById('quick-shortage-badge');
  const chip = document.getElementById('feasibility-chip');

  if (sim.shortage_count_total > 0) {
    badge.className = 'status-chip chip-error';
    badge.textContent = `[!] ${sim.shortage_count_total} SHORTAGES`;
    chip.className = 'status-chip chip-error';
    chip.textContent = 'SHORTAGE';
  } else {
    badge.className = 'status-chip chip-success';
    badge.textContent = '100% SUFFICIENT';
    chip.className = 'status-chip chip-success';
    chip.textContent = 'FEASIBLE';
  }
}

function renderNavigationBadges() {
  const sim = state.simulation;
  const shortageCount = sim ? sim.shortage_count_total : 0;
  const batchPlanCount = (state.weekly_plan || []).length;
  const ledgerCount = (state.ledger || []).length;
  const historyCount = (state.batches || []).length;

  let reorders = 0;
  (state.material_order || []).forEach(code => {
    const m = state.materials[code];
    if (m) {
      const amu = m.avg_monthly_usage || 1;
      const coverDays = (m.stock_on_hand / amu) * 30;
      if (coverDays <= m.lead_time_days) reorders++;
    }
  });

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('top-badge-schedule-count', batchPlanCount);
  setEl('top-badge-shortage-count', shortageCount);
  setEl('top-badge-ledger-count', ledgerCount);
  setEl('top-badge-reorder-count', reorders);
  setEl('top-badge-batch-count', historyCount);
}

// ==========================================
// VIEW 1: DAY-BY-DAY RUNOUT TIMELINE STRIP
// ==========================================

function renderTimelineStrip() {
  const container = document.getElementById('timeline-container');
  if (!container || !state.simulation) return;

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const kpis = state.simulation.day_kpis;

  container.innerHTML = days.map(d => {
    const kpi = kpis[d] || { bulk_kg: 0, pieces: 0, batch_count: 0, shortage_count: 0 };
    const hasShortage = (kpi.shortage_count > 0);
    const isSelected = (selectedDay === d);

    const statusBadge = hasShortage
      ? `<span class="status-chip chip-error" style="font-size: 10px; padding: 1px 4px;">[!] ${kpi.shortage_count} Short</span>`
      : `<span class="status-chip chip-success" style="font-size: 10px; padding: 1px 4px;">OK</span>`;

    return `
      <div class="day-card ${hasShortage ? 'has-shortage' : ''} ${isSelected ? 'selected' : ''}" onclick="toggleDayFilter('${d}')">
        <div class="day-card-header">
          <span class="day-name">${d.substring(0, 3)}</span>
          ${statusBadge}
        </div>
        <div class="day-kpi-sub">${kpi.batch_count} runs &bull; ${kpi.bulk_kg.toFixed(1)} kg</div>
        <div class="day-kpi-sub" style="font-size: 10px; color: var(--outline); margin-top: 2px;">${kpi.pieces} pcs</div>
      </div>
    `;
  }).join('');
}

function toggleDayFilter(day) {
  if (selectedDay === day) {
    selectedDay = null;
  } else {
    selectedDay = day;
  }
  renderTimelineStrip();
  renderScheduleViews();
}

// ==========================================
// DEDICATED VIEW 1: PRODUCTION SCHEDULE & CALENDAR
// ==========================================

function setScheduleViewMode(mode) {
  scheduleViewMode = mode;
  ['week', 'month', 'queue'].forEach(m => {
    const btn = document.getElementById(`sched-view-${m}`);
    if (btn) {
      if (m === mode) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });

  const calContainer = document.getElementById('schedule-calendar-container');
  const queueContainer = document.getElementById('schedule-queue-container');

  if (mode === 'queue') {
    if (calContainer) calContainer.style.display = 'none';
    if (queueContainer) queueContainer.style.display = 'block';
  } else {
    if (calContainer) calContainer.style.display = 'block';
    if (queueContainer) queueContainer.style.display = 'none';
  }

  updateStepperLabel();
  renderScheduleViews();
}

function stepScheduleDate(delta) {
  scheduleWeekOffset += delta;
  updateStepperLabel();
  renderScheduleViews();
}

function updateStepperLabel() {
  const lbl = document.getElementById('schedule-stepper-label');
  if (!lbl) return;

  if (scheduleViewMode === 'month') {
    lbl.textContent = 'September 2026';
  } else if (scheduleViewMode === 'queue') {
    lbl.textContent = 'Active Queue';
  } else {
    if (scheduleWeekOffset === 0) {
      lbl.textContent = 'Week 3 • Sep 2026';
    } else if (scheduleWeekOffset > 0) {
      lbl.textContent = `Week ${3 + scheduleWeekOffset} • Sep 2026`;
    } else {
      lbl.textContent = `Week ${Math.max(1, 3 + scheduleWeekOffset)} • Sep 2026`;
    }
  }
}

function renderScheduleRecipeFilter() {
  const sel = document.getElementById('sched-filter-recipe');
  if (!sel || !state || !state.products) return;

  const current = sel.value || 'ALL';
  let html = '<option value="ALL">Recipe: All</option>';
  (state.product_order || Object.keys(state.products)).forEach(fg => {
    const p = state.products[fg];
    html += `<option value="${fg}">${p.name} (${fg})</option>`;
  });
  sel.innerHTML = html;
  sel.value = current;
}

function onScheduleFilterChange() {
  const sel = document.getElementById('sched-filter-recipe');
  if (sel) scheduleFilterRecipe = sel.value;
  renderScheduleViews();
}

function renderScheduleViews() {
  updateStepperLabel();
  renderScheduleRecipeFilter();

  if (scheduleViewMode === 'queue') {
    renderScheduleQueueTable();
  } else {
    renderScheduleCalendar();
  }
}

function renderScheduleCalendar() {
  const grid = document.getElementById('calendar-matrix-grid');
  if (!grid || !state) return;

  let allBatches = state.weekly_plan || [];
  if (scheduleFilterRecipe !== 'ALL') {
    allBatches = allBatches.filter(b => b.fg_code === scheduleFilterRecipe);
  }

  if (scheduleViewMode === 'month') {
    renderMonthCalendarGrid(grid, allBatches);
  } else {
    renderWeekCalendarGrid(grid, allBatches);
  }
}

function renderWeekCalendarGrid(grid, allBatches) {
  const weekDays = [
    { name: 'Monday', short: 'Mon', dateNum: 14 + scheduleWeekOffset * 7 },
    { name: 'Tuesday', short: 'Tue', dateNum: 15 + scheduleWeekOffset * 7 },
    { name: 'Wednesday', short: 'Wed', dateNum: 16 + scheduleWeekOffset * 7 },
    { name: 'Thursday', short: 'Thu', dateNum: 17 + scheduleWeekOffset * 7 },
    { name: 'Friday', short: 'Fri', dateNum: 18 + scheduleWeekOffset * 7 },
    { name: 'Saturday', short: 'Sat', dateNum: 19 + scheduleWeekOffset * 7 },
    { name: 'Sunday', short: 'Sun', dateNum: 20 + scheduleWeekOffset * 7 }
  ];

  const todayWeekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

  grid.innerHTML = weekDays.map(d => {
    let dayBatches = allBatches.filter(b => b.day === d.name);
    if (selectedDay && selectedDay !== d.name) {
      dayBatches = [];
    }

    const isToday = (d.name === todayWeekday && scheduleWeekOffset === 0);

    const cardsHtml = dayBatches.map(b => {
      const prod = state.products[b.fg_code] || { name: b.fg_code, category: 'Lip Care' };
      const isCompleted = (b.status === 'COMPLETED');
      let catTag = 'LB';
      if (b.fg_code.includes('D0')) catTag = 'DEO';
      else if (b.fg_code.includes('HO')) catTag = 'OIL';
      else if (b.fg_code.includes('SB')) catTag = 'SCRUB';

      return `
        <div class="scheduled-card" onclick="openBatchDrawer('${b.id}')" title="${b.batch_ref}: ${prod.name} (${Number(b.target_bulk_kg).toFixed(1)}kg / ${Math.round(b.target_pieces)}pcs)">
          <div class="scheduled-card-left">
            <span class="scheduled-card-tag">${catTag}</span>
            <span class="scheduled-card-title">${prod.name}</span>
          </div>
          <div class="scheduled-card-right">
            <span class="scheduled-card-chip status-chip ${isCompleted ? 'chip-success' : 'chip-info'}">
              ${Number(b.target_bulk_kg).toFixed(1)}k
            </span>
          </div>
        </div>
      `;
    }).join('');

    const emptyState = (dayBatches.length === 0)
      ? `<div style="font-size: 11px; color: var(--outline); padding: 8px 4px; font-style: italic;">No batches</div>`
      : '';

    return `
      <div class="calendar-day-cell ${isToday ? 'is-today' : ''}">
        <div class="calendar-day-header">
          <span class="calendar-day-num">${d.dateNum > 0 ? d.dateNum : ''}</span>
          <span class="calendar-day-batch-count">${dayBatches.length} batches</span>
        </div>
        <div style="display: flex; flex-direction: column; flex: 1;">
          ${cardsHtml}
          ${emptyState}
        </div>
        <button type="button" class="btn btn-secondary btn-sm" style="font-size: 10px; padding: 2px 4px; margin-top: auto; border: 1px dashed var(--outline-variant); background: transparent; width: 100%;" onclick="openNewBatchDrawerForDay('${d.name}')">
          + Add
        </button>
      </div>
    `;
  }).join('');
}

function renderMonthCalendarGrid(grid, allBatches) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const totalCells = 35;
  const startDayCol = 1;
  const daysInMonth = 30;

  let cellsHtml = '';

  for (let cellIdx = 0; cellIdx < totalCells; cellIdx++) {
    const colIdx = cellIdx % 7;
    const weekdayName = daysOfWeek[colIdx];
    const monthDay = cellIdx - startDayCol + 1;
    const isCurrentMonth = (monthDay >= 1 && monthDay <= daysInMonth);
    const displayNum = isCurrentMonth ? monthDay : (monthDay < 1 ? 31 + monthDay : monthDay - daysInMonth);
    const isToday = (monthDay === 10);

    let cellBatches = [];
    if (isCurrentMonth && monthDay >= 14 && monthDay <= 19) {
      cellBatches = allBatches.filter(b => b.day === weekdayName);
    }

    const cardsHtml = cellBatches.map(b => {
      const prod = state.products[b.fg_code] || { name: b.fg_code };
      const isCompleted = (b.status === 'COMPLETED');
      let catTag = 'LB';
      if (b.fg_code.includes('D0')) catTag = 'DEO';
      else if (b.fg_code.includes('HO')) catTag = 'OIL';

      return `
        <div class="scheduled-card" onclick="openBatchDrawer('${b.id}')" title="${b.batch_ref}: ${prod.name}">
          <div class="scheduled-card-left">
            <span class="scheduled-card-tag">${catTag}</span>
            <span class="scheduled-card-title">${prod.name}</span>
          </div>
          <div class="scheduled-card-right">
            <span class="scheduled-card-chip status-chip ${isCompleted ? 'chip-success' : 'chip-info'}">
              ${Number(b.target_bulk_kg).toFixed(0)}k
            </span>
          </div>
        </div>
      `;
    }).join('');

    cellsHtml += `
      <div class="calendar-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''}">
        <div class="calendar-day-header">
          <span class="calendar-day-num">${displayNum}</span>
          ${cellBatches.length > 0 ? `<span class="calendar-day-batch-count">${cellBatches.length} runs</span>` : ''}
        </div>
        <div style="display: flex; flex-direction: column; flex: 1;">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  grid.innerHTML = cellsHtml;
}

function renderScheduleQueueTable() {
  const tbody = document.getElementById('schedule-table-body');
  if (!tbody || !state) return;

  let batches = state.weekly_plan || [];
  if (selectedDay) {
    batches = batches.filter(b => b.day === selectedDay);
  }
  if (scheduleFilterRecipe !== 'ALL') {
    batches = batches.filter(b => b.fg_code === scheduleFilterRecipe);
  }

  if (batches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center empty-cell">No scheduled batches match current filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = batches.map(b => {
    const isCompleted = (b.status === 'COMPLETED');
    const prod = state.products[b.fg_code] || { name: b.fg_code };
    const role = state.user_role || 'admin';

    const statusBadge = isCompleted
      ? `<span class="status-chip chip-success">COMPLETED</span>`
      : `<span class="status-chip chip-info">${b.status}</span>`;

    const actionBtn = isCompleted
      ? `<button class="btn btn-secondary btn-sm btn-xs" disabled>✓ Completed</button>`
      : `<button class="btn btn-primary btn-sm btn-xs" onclick="openStagingModal('${b.id}')">Issue</button>`;

    const deleteBtn = (isCompleted && role !== 'admin')
      ? ``
      : `<button class="btn-icon danger" title="Delete Batch" onclick="deleteScheduledBatch('${b.id}')">✕</button>`;

    return `
      <tr style="${isCompleted ? 'opacity: 0.7;' : ''}">
        <td class="data-tabular font-bold">${b.day}</td>
        <td class="data-tabular">
          <button type="button" class="btn btn-secondary btn-sm" style="padding: 2px 4px; font-weight: 700; color: var(--primary);" onclick="openBatchDrawer('${b.id}')">
            ${b.batch_ref}
          </button>
        </td>
        <td class="data-tabular" style="font-size: 12px;">${b.fg_code}</td>
        <td><strong>${prod.name}</strong></td>
        <td class="data-tabular helper-text">${b.unit_type}</td>
        <td class="text-right data-tabular">${Number(b.target_qty).toFixed(1)}</td>
        <td class="text-right data-tabular font-bold">${Number(b.target_bulk_kg).toFixed(3)} KG</td>
        <td class="text-right data-tabular">${Math.round(b.target_pieces)} PCS</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center" style="white-space: nowrap;">
          <button class="btn btn-secondary btn-sm btn-xs" onclick="openBmrModal('${b.id}')" title="Print Floor Scaling Sheet">BMR</button>
          ${actionBtn}
          <button class="btn btn-secondary btn-sm btn-xs" onclick="openBatchDrawer('${b.id}')" title="Edit Batch Details">✎ Edit</button>
          ${deleteBtn}
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// SLIDE-OVER BATCH DETAILS DRAWER CONTROLLERS
// ==========================================

function openNewBatchDrawer() {
  openNewBatchDrawerForDay('Monday');
}

function openNewBatchDrawerForDay(day) {
  document.getElementById('drawer-batch-id').value = '';
  document.getElementById('drawer-batch-title').textContent = '+ Schedule Production Batch';
  document.getElementById('drawer-batch-subtitle').textContent = 'Define recipe and volume for weekly compounding schedule';
  document.getElementById('drawer-batch-day').value = day || 'Monday';

  renderDrawerFgSelect();
  const fgSelect = document.getElementById('drawer-batch-fg');
  if (fgSelect && fgSelect.options.length > 0) {
    fgSelect.selectedIndex = 0;
  }

  document.getElementById('drawer-batch-unit').value = 'BULK_KG';
  document.getElementById('drawer-batch-qty').value = '51.0';
  document.getElementById('drawer-batch-buffer').value = '0.0';
  document.getElementById('drawer-batch-ref').value = '';

  const statusGroup = document.getElementById('drawer-status-group');
  if (statusGroup) statusGroup.style.display = 'none';

  const delBtn = document.getElementById('drawer-btn-delete');
  if (delBtn) delBtn.style.display = 'none';

  updateDrawerPreview();

  document.getElementById('drawer-batch-backdrop').classList.add('open');
  document.getElementById('drawer-batch-details').classList.add('open');
}

function openBatchDrawer(batchId) {
  const batch = (state.weekly_plan || []).find(b => b.id === batchId);
  if (!batch) return;

  document.getElementById('drawer-batch-id').value = batch.id;
  document.getElementById('drawer-batch-title').textContent = `${batch.batch_ref}`;
  document.getElementById('drawer-batch-subtitle').textContent = `Scheduled on ${batch.day} • ${batch.fg_code}`;

  document.getElementById('drawer-batch-day').value = batch.day;

  renderDrawerFgSelect();
  document.getElementById('drawer-batch-fg').value = batch.fg_code;
  document.getElementById('drawer-batch-unit').value = batch.unit_type;
  document.getElementById('drawer-batch-qty').value = Number(batch.target_qty).toFixed(1);
  document.getElementById('drawer-batch-buffer').value = Number(batch.yield_buffer_percent || 0).toFixed(1);
  document.getElementById('drawer-batch-ref').value = batch.batch_ref;

  const statusGroup = document.getElementById('drawer-status-group');
  if (statusGroup) statusGroup.style.display = 'block';

  const statusChip = document.getElementById('drawer-batch-status-chip');
  if (statusChip) {
    if (batch.status === 'COMPLETED') {
      statusChip.className = 'status-chip chip-success';
      statusChip.textContent = 'COMPLETED';
    } else {
      statusChip.className = 'status-chip chip-info';
      statusChip.textContent = batch.status || 'PLANNED';
    }
  }

  const role = state.user_role || 'admin';
  const delBtn = document.getElementById('drawer-btn-delete');
  if (delBtn) {
    delBtn.style.display = (batch.status === 'COMPLETED' && role !== 'admin') ? 'none' : 'block';
  }

  updateDrawerPreview();

  document.getElementById('drawer-batch-backdrop').classList.add('open');
  document.getElementById('drawer-batch-details').classList.add('open');
}

function closeBatchDrawer() {
  const backdrop = document.getElementById('drawer-batch-backdrop');
  const drawer = document.getElementById('drawer-batch-details');
  if (backdrop) backdrop.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
}

function renderDrawerFgSelect() {
  const select = document.getElementById('drawer-batch-fg');
  if (!select || !state || !state.products) return;

  const current = select.value;
  select.innerHTML = (state.product_order || Object.keys(state.products)).map(fg => {
    const p = state.products[fg];
    return `<option value="${fg}">${p.name} (${fg})</option>`;
  }).join('');

  if (current && state.products[current]) {
    select.value = current;
  }
}

function onDrawerFgChange(fg_code) {
  updateDrawerPreview();
}

function onDrawerUnitChange(unit) {
  updateDrawerPreview();
}

function updateDrawerPreview() {
  const fgSelect = document.getElementById('drawer-batch-fg');
  if (!fgSelect) return;
  const fg_code = fgSelect.value;
  const unit_type = document.getElementById('drawer-batch-unit').value;
  const target_qty = parseFloat(document.getElementById('drawer-batch-qty').value) || 0;
  const buffer = parseFloat(document.getElementById('drawer-batch-buffer').value) || 0;

  const prod = (state && state.products) ? state.products[fg_code] || { unit_weight_grams: 5.0, sfg_batch_weight_grams: 1500.0 } : { unit_weight_grams: 5.0, sfg_batch_weight_grams: 1500.0 };
  const unit_weight = prod.unit_weight_grams || 5.0;
  const sfg_weight = prod.sfg_batch_weight_grams || 1500.0;

  let bulk_kg = 0;
  let pieces = 0;

  if (unit_type === 'POTS') {
    bulk_kg = target_qty * (sfg_weight / 1000.0);
    pieces = Math.round((bulk_kg * 1000.0) / unit_weight);
  } else if (unit_type === 'PIECES') {
    pieces = Math.round(target_qty);
    bulk_kg = (pieces * unit_weight) / 1000.0;
  } else { // BULK_KG
    bulk_kg = target_qty;
    pieces = Math.round((bulk_kg * 1000.0) / unit_weight);
  }

  const equivEl = document.getElementById('drawer-batch-equiv-preview');
  if (equivEl) {
    equivEl.innerHTML = `Equivalent: <strong>${bulk_kg.toFixed(3)} KG</strong> Bulk Mass &bull; <strong>${pieces.toLocaleString()} Pieces</strong> (Buffer: ${buffer.toFixed(1)}%)`;
  }

  const sfgEl = document.getElementById('drawer-batch-sfg-standard');
  if (sfgEl) sfgEl.textContent = `${sfg_weight.toLocaleString()} g`;

  const weightEl = document.getElementById('drawer-batch-unit-weight');
  if (weightEl) weightEl.textContent = `${unit_weight.toFixed(1)} g`;
}

// A batch with no positive quantity is not a plan. Refuse at the field, so the operator
// sees which input is wrong instead of a generic failure toast. Returns null when invalid.
function readBatchQty(inputId) {
  const el = document.getElementById(inputId);
  const qty = parseFloat(el.value);
  const valid = Number.isFinite(qty) && qty > 0;
  el.classList.toggle('is-invalid', !valid);
  if (valid) return qty;
  el.focus();
  showToast('Target quantity must be greater than zero.', 'error');
  return null;
}

async function saveBatchFromDrawer() {
  const id = document.getElementById('drawer-batch-id').value;
  const day = document.getElementById('drawer-batch-day').value;
  const fg_code = document.getElementById('drawer-batch-fg').value;
  const unit_type = document.getElementById('drawer-batch-unit').value;
  const target_qty = readBatchQty('drawer-batch-qty');
  if (target_qty === null) return;
  const yield_buffer = parseFloat(document.getElementById('drawer-batch-buffer').value) || 0.0;
  const batch_ref = document.getElementById('drawer-batch-ref').value.trim();

  try {
    let endpoint = '/api/plan/batch/update';
    let payload = { id, day, fg_code, unit_type, target_qty, yield_buffer_percent: yield_buffer, batch_ref };

    if (!id) {
      endpoint = '/api/plan/batch/add';
      payload = { day, fg_code, unit_type, target_qty, yield_buffer_percent: yield_buffer, batch_ref };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(errTxt || 'Failed to save batch');
    }

    state = await res.json();
    closeBatchDrawer();
    renderAll();
    showToast(id ? 'Batch changes saved' : 'Batch added to schedule', 'success');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error saving batch', 'error');
  }
}

async function deleteBatchFromDrawer() {
  const id = document.getElementById('drawer-batch-id').value;
  if (!id) return;

  if (!confirm('Are you sure you want to remove this batch from the schedule?')) {
    return;
  }

  try {
    const res = await fetch('/api/plan/batch/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(errTxt || 'Failed to delete batch');
    }

    state = await res.json();
    closeBatchDrawer();
    renderAll();
    showToast('Batch removed from schedule', 'info');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to delete batch', 'error');
  }
}

function printBmrFromDrawer() {
  const id = document.getElementById('drawer-batch-id').value;
  if (!id) return;
  closeBatchDrawer();
  openBmrModal(id);
}

async function submitAddBatch() {
  const day = document.getElementById('input-batch-day').value;
  const fg_code = document.getElementById('input-batch-fg').value;
  const unit_type = document.getElementById('input-batch-unit').value;
  const target_qty = readBatchQty('input-batch-qty');
  if (target_qty === null) return;
  const yield_buffer = parseFloat(document.getElementById('input-batch-buffer').value) || 0.0;
  const batch_ref = document.getElementById('input-batch-ref').value.trim();

  try {
    const res = await fetch('/api/plan/batch/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day, fg_code, unit_type, target_qty, yield_buffer_percent: yield_buffer, batch_ref
      })
    });
    if (!res.ok) throw new Error('server rejected the batch');
    state = await res.json();
    renderAll();
    showToast(`Batch added to ${day} schedule`, 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to add batch', 'error');
  }
}

async function deleteScheduledBatch(batchId) {
  if (!confirm('Are you sure you want to remove this batch from the weekly plan?')) return;
  try {
    const res = await fetch('/api/plan/batch/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: batchId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed');
    }
    state = await res.json();
    renderAll();
    showToast('Batch removed from schedule', 'info');
  } catch (err) {
    console.error(err);
    showToast(err.message, 'error');
  }
}

// ==========================================
// VIEW 1: AGGREGATED RAW MATERIAL REQUIREMENTS TABLE
// ==========================================

function filterBomTable(type) {
  bomFilterType = type;
  document.querySelectorAll('[id^="filter-rm-"]').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`filter-rm-${type.toLowerCase().substring(0, 5)}`);
  if (activeBtn) activeBtn.classList.add('active');
  renderBomTable();
}

function renderBomTable() {
  const tbody = document.getElementById('bom-table-body');
  if (!tbody || !state.simulation) return;

  let rows = state.simulation.material_rows || [];

  // Filtering
  if (bomFilterType === 'SHORTAGE') {
    rows = rows.filter(r => r.is_shortage);
  } else if (bomFilterType === 'RAW_MATERIAL') {
    rows = rows.filter(r => r.category === 'RAW_MATERIAL');
  } else if (bomFilterType === 'PACKAGING') {
    rows = rows.filter(r => r.category !== 'RAW_MATERIAL');
  }

  document.getElementById('bom-summary-count').textContent = `${rows.length} Material Lines Active`;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center empty-cell">No materials matching the selected filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const isRM = (r.uom === 'KG');
    const reqStr = isRM ? `${r.total_committed.toFixed(3)} KG` : `${Math.round(r.total_committed)} PCS`;
    const sohStr = isRM ? `${r.stock_on_hand.toFixed(3)} KG` : `${Math.round(r.stock_on_hand)} PCS`;
    const balStr = isRM ? `${r.projected_balance.toFixed(3)} KG` : `${Math.round(r.projected_balance)} PCS`;

    const statusBadge = r.is_shortage
      ? `<span class="status-chip chip-error">[!] SHORT (-${r.deficit.toFixed(isRM ? 3 : 0)} ${r.uom})</span>`
      : `<span class="status-chip chip-success">[OK] SUFF</span>`;

    const deficitDayBadge = r.first_deficit_day
      ? `<span class="status-chip chip-error helper-text">${r.first_deficit_day}</span>`
      : `<span style="color: var(--outline); font-size: 11px;">None</span>`;

    const isExpanded = expandedDrilldowns.has(r.code);
    const breakdownCount = r.breakdown ? r.breakdown.length : 0;

    let mainRow = `
      <tr style="cursor: pointer;" onclick="toggleDrilldown('${r.code}')">
        <td class="data-tabular font-bold">${r.code}</td>
        <td class="cell-truncate" title="${r.description}">${r.description}</td>
        <td><span class="label-caps">${isRM ? 'Raw Material' : 'Packaging'}</span></td>
        <td class="text-right data-tabular font-bold">${reqStr}</td>
        <td class="text-right data-tabular" style="font-weight: 700; color: var(--primary);">${sohStr}</td>
        <td class="text-right data-tabular" style="font-weight: 700; color: ${r.is_shortage ? 'var(--error)' : 'inherit'};">${balStr}</td>
        <td class="text-center">${deficitDayBadge}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center">
          <button class="btn-icon" title="View Batch Breakdown" onclick="event.stopPropagation(); toggleDrilldown('${r.code}')">
            ${isExpanded ? '▲' : `▼ (${breakdownCount})`}
          </button>
        </td>
      </tr>
    `;

    if (isExpanded) {
      const breakdownRows = (r.breakdown && r.breakdown.length > 0)
        ? r.breakdown.map(b => `
            <tr>
              <td class="data-tabular"><strong>${b.day}</strong></td>
              <td class="data-tabular">${b.batch_ref}</td>
              <td class="cell-truncate" title="${b.fg_name}">${b.fg_name}</td>
              <td class="data-tabular">${b.batch_size_str}</td>
              <td class="text-right data-tabular" style="font-weight: 700; color: var(--primary);">${b.qty_required.toFixed(isRM ? 3 : 0)} ${b.uom}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="5" style="color: var(--outline);">No active batches consuming this ingredient.</td></tr>`;

      mainRow += `
        <tr class="drilldown-row">
          <td colspan="9" style="padding: 0;">
            <div class="drilldown-container">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--on-surface-variant); margin-bottom: 4px;">
                Consumption Allocation for ${r.code} &bull; ${r.description}
              </div>
              <table class="drilldown-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Batch / BMR #</th>
                    <th>Finished Product</th>
                    <th>Scheduled Batch Size</th>
                    <th class="text-right">Demanded Usage</th>
                  </tr>
                </thead>
                <tbody>
                  ${breakdownRows}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      `;
    }

    return mainRow;
  }).join('');
}

function toggleDrilldown(code) {
  if (expandedDrilldowns.has(code)) {
    expandedDrilldowns.delete(code);
  } else {
    expandedDrilldowns.add(code);
  }
  renderBomTable();
}

// ==========================================
// MODAL 1: EDITABLE BOM MASS DEDUCTION STAGING
// ==========================================

function openStagingModal(batchId) {
  const batch = state.weekly_plan.find(b => b.id === batchId);
  if (!batch) return;

  stagedBatch = batch;
  const prod = state.products[batch.fg_code] || { name: batch.fg_code, unit_weight_grams: 5.0 };
  const recipe = state.boms[batch.fg_code] || [];
  const buffer = 1.0 + (Number(batch.yield_buffer_percent || 0.0) / 100.0);

  document.getElementById('staging-modal-title').textContent = `BOM Mass Deduction Staging: ${batch.batch_ref}`;
  document.getElementById('staging-modal-subtitle').textContent = `${batch.fg_code} - ${prod.name} • Target: ${Number(batch.target_bulk_kg).toFixed(3)} KG Bulk Mass (${Math.round(batch.target_pieces)} PCS)`;
  document.getElementById('staging-batch-ref').value = batch.batch_ref;
  document.getElementById('staging-operator-name').value = batch.operator_name || 'Operator Adam';

  stagedItems = recipe.map(item => {
    const mat = state.materials[item.rm_code] || { description: item.rm_name, uom: 'KG', category: 'RAW_MATERIAL' };
    const isPM = (mat.category !== 'RAW_MATERIAL');
    let theo = 0.0;
    if (isPM) {
      theo = Math.ceil(item.g_per_kg * batch.target_pieces * buffer);
    } else {
      theo = (item.g_per_kg / 1000.0) * batch.target_bulk_kg * buffer;
    }

    return {
      rm_code: item.rm_code,
      rm_name: mat.description,
      category: mat.category,
      uom: mat.uom,
      theoretical_qty: theo,
      actual_qty: theo,
      substitute_for: null
    };
  });

  renderStagingTable();
  document.getElementById('modal-staging-batch').classList.add('open');
}

function closeStagingModal() {
  document.getElementById('modal-staging-batch').classList.remove('open');
  stagedBatch = null;
  stagedItems = [];
}

function renderStagingTable() {
  const tbody = document.getElementById('staging-table-body');
  if (!tbody) return;

  let totalRm = 0.0;
  let totalPm = 0;

  tbody.innerHTML = stagedItems.map((item, idx) => {
    const isRM = (item.uom === 'KG');
    const variance = item.actual_qty - item.theoretical_qty;
    if (isRM) totalRm += item.actual_qty;
    else totalPm += Math.round(item.actual_qty);

    let varClass = 'zero';
    if (Math.abs(variance) > 0.0001) {
      varClass = variance > 0 ? 'positive' : 'negative';
    }
    const varText = `${variance >= 0 ? '+' : ''}${variance.toFixed(isRM ? 3 : 0)} ${item.uom}`;

    // Substitute dropdown
    const subs = state.substitutes[item.rm_code] || [];
    let subSelect = `<select class="input-table-cell helper-text" onchange="onStagingSubstituteChange(${idx}, this.value)">`;
    subSelect += `<option value="${item.rm_code}">${item.rm_code} (Default)</option>`;
    subs.forEach(sCode => {
      const sMat = state.materials[sCode];
      subSelect += `<option value="${sCode}">⇄ Swap: ${sCode} (${sMat ? sMat.stock_on_hand.toFixed(1) : 0}kg SOH)</option>`;
    });
    subSelect += `</select>`;

    return `
      <tr>
        <td class="data-tabular font-bold">${item.rm_code}</td>
        <td class="cell-truncate" title="${item.rm_name}">${item.rm_name}</td>
        <td><span class="label-caps" style="font-size: 10px;">${isRM ? 'Raw Material' : 'Packaging'}</span></td>
        <td class="text-right data-tabular">${item.theoretical_qty.toFixed(isRM ? 3 : 0)} ${item.uom}</td>
        <td>
          <input type="number" step="${isRM ? '0.001' : '1'}" min="0" class="input-table-cell text-right"
                 value="${isRM ? item.actual_qty.toFixed(3) : Math.round(item.actual_qty)}"
                 oninput="onStagingQtyChange(${idx}, this.value)">
        </td>
        <td class="text-center"><span class="variance-chip ${varClass}">${varText}</span></td>
        <td>${subs.length > 0 ? subSelect : '<span style="color: var(--outline); font-size: 11px;">No preset swap</span>'}</td>
        <td class="text-center">
          <button class="btn-icon danger" onclick="removeStagingRow(${idx})">✕</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('staging-totals-summary').textContent = `Total Staged RM: ${totalRm.toFixed(3)} KG • Packaging: ${totalPm} PCS`;
}

function onStagingQtyChange(idx, val) {
  const num = parseFloat(val) || 0.0;
  if (stagedItems[idx]) {
    stagedItems[idx].actual_qty = num;
  }
  renderStagingTable();
}

function onStagingSubstituteChange(idx, newCode) {
  if (stagedItems[idx] && state.materials[newCode]) {
    const oldCode = stagedItems[idx].rm_code;
    const newMat = state.materials[newCode];
    stagedItems[idx].substitute_for = oldCode;
    stagedItems[idx].rm_code = newCode;
    stagedItems[idx].rm_name = newMat.description;
    stagedItems[idx].uom = newMat.uom;
    stagedItems[idx].category = newMat.category;
    renderStagingTable();
    showToast(`Swapped ingredient to ${newCode}`, 'info');
  }
}

function removeStagingRow(idx) {
  stagedItems.splice(idx, 1);
  renderStagingTable();
}

function addStagingRow() {
  const defaultMatCode = state.material_order[0] || 'RM-L001/001';
  const mat = state.materials[defaultMatCode];
  stagedItems.push({
    rm_code: defaultMatCode,
    rm_name: mat ? mat.description : defaultMatCode,
    category: mat ? mat.category : 'RAW_MATERIAL',
    uom: mat ? mat.uom : 'KG',
    theoretical_qty: 0.0,
    actual_qty: 1.0,
    substitute_for: null
  });
  renderStagingTable();
}

async function submitStagingDeduction() {
  if (!stagedBatch || stagedItems.length === 0) return;

  const batchRef = document.getElementById('staging-batch-ref').value.trim() || stagedBatch.batch_ref;
  const operatorName = document.getElementById('staging-operator-name').value.trim() || 'Operator Adam';

  try {
    const res = await fetch('/api/batch/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_id: stagedBatch.id,
        batch_ref: batchRef,
        operator_name: operatorName,
        items: stagedItems
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Execution failed');
    }

    state = await res.json();
    closeStagingModal();
    renderAll();

    // Show confirmation banner
    const banner = document.getElementById('bom-status-banner');
    const bannerText = document.getElementById('bom-status-banner-text');
    if (banner && bannerText) {
      bannerText.innerHTML = `<strong>✓ Batch [${batchRef}] Successfully Executed:</strong> Deducted actual measured materials from physical inventory. Finished goods stock increased.`;
      banner.style.display = 'flex';
    }

    showToast(`Batch [${batchRef}] executed! Physical inventory deducted.`, 'success');
  } catch (err) {
    console.error(err);
    showToast(err.message, 'error');
  }
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
  if (!tbody) return;

  let items = state.ledger || [];

  if (ledgerFilterType !== 'ALL') {
    items = items.filter(tx => tx.type === ledgerFilterType);
  }

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
    tbody.innerHTML = `<tr><td colspan="11" class="text-center empty-cell">No transactions recorded in ledger.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(tx => {
    const isIN = (tx.type === 'STOCK_IN');
    const isRM = (tx.uom === 'KG');
    const qtySign = isIN ? '+' : '-';
    const qtyStr = `${qtySign}${Number(tx.quantity).toFixed(isRM ? 3 : 0)} ${tx.uom}`;
    const beforeStr = `${Number(tx.balance_before).toFixed(isRM ? 3 : 0)} ${tx.uom}`;
    const afterStr = `${Number(tx.balance_after).toFixed(isRM ? 3 : 0)} ${tx.uom}`;

    const typeBadge = isIN
      ? `<span class="status-chip chip-success">IN (+)</span>`
      : `<span class="status-chip chip-error">OUT (-)</span>`;

    return `
      <tr>
        <td class="data-tabular">#${tx.transaction_id}</td>
        <td class="data-tabular" style="color: var(--on-surface-variant); font-size: 11px;">${tx.timestamp}</td>
        <td class="data-tabular font-bold">${tx.material_code}</td>
        <td>${tx.material_name}</td>
        <td>${typeBadge}</td>
        <td class="text-right data-tabular" style="font-weight: 700; color: ${isIN ? 'var(--success)' : 'var(--error)'};">${qtyStr}</td>
        <td class="text-right data-tabular">${beforeStr}</td>
        <td class="text-right data-tabular font-bold">${afterStr}</td>
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
  if (!tbody || !state.simulation) return;

  const rows = state.simulation.material_rows || [];
  let reorderCount = 0;
  let lowCount = 0;
  let totalCommittedBulk = 0.0;

  tbody.innerHTML = rows.map(r => {
    const mat = state.materials[r.code] || r;
    const isRM = (r.uom === 'KG');
    if (isRM) totalCommittedBulk += r.total_committed;

    const amu = mat.avg_monthly_usage || 1.0;
    const scm = (mat.stock_on_hand / amu);
    const coverDays = scm * 30.0;

    let statusText = 'HEALTHY';
    let statusClass = 'chip-success';

    if (coverDays <= mat.lead_time_days) {
      statusText = 'REORDER NOW';
      statusClass = 'chip-error';
      reorderCount++;
    } else if (coverDays <= mat.lead_time_days + 21) {
      statusText = 'LOW STOCK';
      statusClass = 'chip-warning';
      lowCount++;
    } else if (scm > 6.0) {
      statusText = 'OVERSTOCKED';
      statusClass = 'chip-info';
    }

    const sohStr = isRM ? `${mat.stock_on_hand.toFixed(3)} KG` : `${Math.round(mat.stock_on_hand)} PCS`;
    const comStr = isRM ? `${r.total_committed.toFixed(3)} KG` : `${Math.round(r.total_committed)} PCS`;
    const projStr = isRM ? `${r.projected_balance.toFixed(3)} KG` : `${Math.round(r.projected_balance)} PCS`;
    const amuStr = isRM ? `${amu.toFixed(1)} KG` : `${Math.round(amu)} PCS`;

    return `
      <tr>
        <td class="data-tabular font-bold">${r.code}</td>
        <td class="cell-truncate" title="${mat.description}">${mat.description}</td>
        <td><span class="label-caps">${isRM ? 'Raw Material' : 'Packaging'}</span></td>
        <td class="text-right data-tabular font-bold">${sohStr}</td>
        <td class="text-right data-tabular" style="color: var(--primary); font-weight: 600;">${comStr}</td>
        <td class="text-right data-tabular" style="font-weight: 700; color: ${r.is_shortage ? 'var(--error)' : 'inherit'};">${projStr}</td>
        <td class="text-right data-tabular">${amuStr}</td>
        <td class="text-right data-tabular">${scm.toFixed(1)} m</td>
        <td class="text-right data-tabular">${Math.round(coverDays)} d</td>
        <td class="text-right data-tabular">${mat.lead_time_days} d</td>
        <td class="text-center"><span class="status-chip ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join('');

  document.getElementById('kpi-total-items').textContent = state.material_order.length;
  document.getElementById('kpi-reorder-count').textContent = reorderCount;
  document.getElementById('kpi-low-count').textContent = lowCount;
  document.getElementById('kpi-total-committed').textContent = `${totalCommittedBulk.toFixed(1)} KG`;
}

// ==========================================
// VIEW 4: BATCH EXECUTION HISTORY
// ==========================================

function renderBatchesTable() {
  const tbody = document.getElementById('batches-table-body');
  if (!tbody) return;

  const batches = state.batches || [];
  const role = state.user_role || 'admin';

  if (batches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center empty-cell">No completed batches executed yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = batches.map(b => {
    const isCancelled = (b.status === 'CANCELLED');
    const revertBtn = (!isCancelled && role === 'admin')
      ? `<button class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 2px 4px;" onclick="cancelCompletedBatch('${b.batch_id}')">Revert Run</button>`
      : `<span style="color: var(--outline); font-size: 11px;">-</span>`;

    return `
      <tr style="${isCancelled ? 'opacity: 0.5;' : ''}">
        <td class="data-tabular font-bold">${b.batch_number}</td>
        <td class="data-tabular">${b.fg_code}</td>
        <td class="cell-truncate" title="${b.fg_name}">${b.fg_name}</td>
        <td class="data-tabular" style="color: var(--on-surface-variant); font-size: 11px;">${b.timestamp}</td>
        <td>${b.operator_name}</td>
        <td class="text-right data-tabular font-bold">${Math.round(b.target_pieces)} PCS</td>
        <td class="text-right data-tabular">${Number(b.bulk_kg).toFixed(3)} KG</td>
        <td class="text-center"><span class="status-chip ${isCancelled ? 'chip-error' : 'chip-success'}">${b.status}</span></td>
        <td class="text-right data-tabular">${b.material_lines} lines</td>
        <td class="text-center">${revertBtn}</td>
      </tr>
    `;
  }).join('');
}

async function cancelCompletedBatch(batchId) {
  if (!confirm('Admin Authorization: Revert this batch? All stock deductions will be reversed back to inventory.')) return;
  try {
    const res = await fetch('/api/batch/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: batchId })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Cancellation failed');
    }

    state = await res.json();
    renderAll();
    showToast('Batch reverted. Stock returned to inventory.', 'info');
  } catch (err) {
    console.error(err);
    showToast(err.message, 'error');
  }
}

// ==========================================
// MODAL 2: MANUAL STOCK TRANSACTION
// ==========================================

function renderStockModalDropdown() {
  const select = document.getElementById('modal-stock-mat');
  if (!select || !state.material_order) return;

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
        material_code: code, type, category: cat, quantity: qty,
        reference_doc: refDoc, operator_name: opName, notes
      })
    });

    if (!res.ok) throw new Error('Transaction rejected');
    state = await res.json();
    closeStockModal();
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
  if (state.user_role !== 'admin') {
    showToast('Admin permission required to reset database', 'error');
    return;
  }
  if (!confirm('Are you sure you want to reset all inventory and schedules back to default seed state?')) {
    return;
  }
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    state = await res.json();
    renderAll();
    showToast('Database reset to original seed state', 'success');
  } catch (err) {
    console.error(err);
    showToast('Reset failed', 'error');
  }
}

// ==========================================
// TOAST HELPER
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

// ==========================================
// BMR FLOOR SCALING & WORK ORDER MODAL (OPTION 2)
// ==========================================

function classifyFormulationPhase(code, name, is_pm) {
  if (is_pm) {
    return 'PHASE D';
  }
  const n = String(name || '').toLowerCase();
  const c = String(code || '').toLowerCase();

  // Phase C: Essential Oils, Fragrance, Vitamin E
  if (n.includes('essential oil') || n.includes('fragrance') || n.includes('vitamin e') || n.includes('fnlemverb') || c.includes('eo') || c.includes('fo')) {
    return 'PHASE C';
  }

  // Phase B: Powders, Actives, Pastes (Pigments)
  if (n.includes('magnesium') || n.includes('farmal') || n.includes('oatmeal') || n.includes('oat com') || n.includes('tegodeo') || n.includes('paste') || n.includes('celluloscrub') || c.includes('rm-s') || c.includes('rm-co')) {
    return 'PHASE B';
  }

  // Phase A: Waxes, Butters, Liquid Base Oils
  return 'PHASE A';
}

function openBmrModal(batchId) {
  const modal = document.getElementById('modal-bmr-sheet');
  const container = document.getElementById('bmr-modal-content');
  if (!modal || !container) return;

  const batch = (state.weekly_plan || []).find(b => b.id === batchId)
    || (state.batches || []).find(b => String(b.batch_id) === String(batchId));

  if (!batch) {
    showToast('Batch not found', 'error');
    return;
  }

  const fg_code = batch.fg_code;
  const prod = state.products[fg_code] || { name: fg_code, unit_weight_grams: 5.0 };
  const recipe = state.boms[fg_code] || [];
  const bulk_kg = Number(batch.target_bulk_kg || batch.bulk_kg || 0.0);
  const pieces = Math.round(Number(batch.target_pieces || 0));
  const buffer_pct = Number(batch.yield_buffer_percent || 0.0);
  const multiplier = 1.0 + (buffer_pct / 100.0);
  const batch_ref = batch.batch_ref || batch.batch_number || 'BMR-BATCH';
  const day = batch.day || 'Scheduled Run';
  const operator = batch.operator_name || 'Operator Adam';
  const dateStr = new Date().toISOString().substring(0, 10);

  // Group recipe items by phase
  const phases = {
    'PHASE A': { title: 'PHASE A: WAXES, BUTTERS & BASE OILS (HEAT TO 75°C - 80°C)', items: [] },
    'PHASE B': { title: 'PHASE B: POWDERS, ACTIVES & PIGMENTS (SHEAR DISPERSION)', items: [] },
    'PHASE C': { title: 'PHASE C: ESSENTIAL OILS, FRAGRANCES & COOL-DOWN (ADD AT 55°C)', items: [] },
    'PHASE D': { title: 'PHASE D: PRIMARY & SECONDARY PACKAGING (HOT FILL AT 50°C - 55°C)', items: [] }
  };

  recipe.forEach((item, idx) => {
    const code = item.rm_code;
    const mat = state.materials[code] || {};
    const is_pm = String(code).startsWith('PM') || mat.category !== 'RAW_MATERIAL';
    const phaseKey = classifyFormulationPhase(code, item.rm_name || mat.description, is_pm);

    let target_display = '';
    let formula_pct = ((item.g_per_kg / 1000.0) * 100.0).toFixed(2) + '%';

    if (is_pm) {
      const units = Math.ceil(item.g_per_kg * pieces * multiplier);
      target_display = `${units} PCS`;
      formula_pct = `${item.g_per_kg} pc/unit`;
    } else {
      const grams = (item.g_per_kg / 1000.0) * bulk_kg * multiplier * 1000.0;
      target_display = `${grams.toFixed(1)} g (${(grams / 1000.0).toFixed(3)} kg)`;
    }

    phases[phaseKey].items.push({
      item_no: idx + 1,
      code,
      name: item.rm_name || mat.description || code,
      formula_pct,
      target_display,
      lot_no: mat.current_lot_no || '',
      is_pm
    });
  });

  let phasesHtml = '';
  ['PHASE A', 'PHASE B', 'PHASE C', 'PHASE D'].forEach(pkey => {
    const pdata = phases[pkey];
    if (pdata.items.length === 0) return;

    phasesHtml += `
      <div class="bmr-phase-banner">${pdata.title}</div>
      <table class="bmr-table">
        <thead>
          <tr>
            <th style="width: 35px;" class="text-center">#</th>
            <th style="width: 110px;">Code</th>
            <th>Raw Material / Component</th>
            <th style="width: 85px;" class="text-right">Formula</th>
            <th style="width: 145px;" class="text-right">Target Weight</th>
            <th style="width: 80px;" class="text-center">Tare (g)</th>
            <th style="width: 95px;" class="text-center">Actual (g)</th>
            <th style="width: 130px;">Lot / Batch #</th>
            <th style="width: 65px;" class="text-center">Weighed</th>
            <th style="width: 40px;" class="text-center">Check</th>
          </tr>
        </thead>
        <tbody>
          ${pdata.items.map(it => `
            <tr>
              <td class="text-center data-tabular">${it.item_no}</td>
              <td class="data-tabular" style="font-weight: 600;">${it.code}</td>
              <td><strong>${it.name}</strong></td>
              <td class="text-right data-tabular">${it.formula_pct}</td>
              <td class="text-right data-tabular font-bold">${it.target_display}</td>
              <td class="text-center"><span class="bmr-box-entry"></span></td>
              <td class="text-center"><span class="bmr-box-entry"></span></td>
              <td class="data-tabular helper-text">${it.lot_no ? it.lot_no : '<span class="bmr-box-entry" style="width: 100%;"></span>'}</td>
              <td class="text-center"><span class="bmr-box-entry" style="min-width: 45px;"></span></td>
              <td class="text-center"><span class="bmr-check-box"></span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  });

  container.innerHTML = `
    <div class="bmr-sheet-container">
      <!-- Document Header -->
      <div class="bmr-company-header">
        <div>
          <div class="bmr-company-title">HYGR COSMETICS LABS</div>
          <div style="font-size: 13px; font-weight: 600; color: var(--on-surface-variant); margin-top: 2px;">
            BATCH MANUFACTURING RECORD (BMR) : COMPOUNDING & FLOOR SCALING SHEET
          </div>
        </div>
        <div class="bmr-doc-badge">
          DOC REF: BMR-SOP-04<br>
          GMP CLEANROOM COPY
        </div>
      </div>

      <!-- Batch Metadata Grid -->
      <div class="bmr-meta-grid">
        <div class="bmr-meta-item">
          <span class="bmr-meta-label">Work Order / BMR #</span>
          <span class="bmr-meta-val" style="color: var(--primary); font-size: 15px;">${batch_ref}</span>
        </div>
        <div class="bmr-meta-item">
          <span class="bmr-meta-label">Scheduled Run Day</span>
          <span class="bmr-meta-val">${day}</span>
        </div>
        <div class="bmr-meta-item">
          <span class="bmr-meta-label">Target Bulk Mass</span>
          <span class="bmr-meta-val">${bulk_kg.toFixed(3)} KG</span>
        </div>
        <div class="bmr-meta-item">
          <span class="bmr-meta-label">Target Finished Units</span>
          <span class="bmr-meta-val">${pieces.toLocaleString()} PCS</span>
        </div>
        <div class="bmr-meta-item">
          <span class="bmr-meta-label">Product Recipe Code</span>
          <span class="bmr-meta-val">${fg_code}</span>
        </div>
        <div class="bmr-meta-item" style="grid-column: span 2;">
          <span class="bmr-meta-label">Finished Good Name</span>
          <span class="bmr-meta-val">${prod.name}</span>
        </div>
        <div class="bmr-meta-item">
          <span class="bmr-meta-label">Lead Compounding Operator</span>
          <span class="bmr-meta-val">${operator}</span>
        </div>
      </div>

      <!-- Formulation Phases -->
      ${phasesHtml}

      <!-- Mixing Standard Operating Procedure (SOP) -->
      <div class="bmr-instructions-box">
        <h4>Compounding & Cleanroom Mixing SOP Instructions</h4>
        <ol class="bmr-instructions-list">
          <li><strong>Scale Verification:</strong> Ensure digital floor scale is calibrated and level. Zero/tare vessel before dispensing. Tolerance: +/- 0.5g.</li>
          <li><strong>Phase A Melting:</strong> Weigh Phase A waxes, butters, and carrier oils into clean stainless steel vessel. Heat to 75°C - 80°C with low-shear propeller agitation until completely melted and uniform.</li>
          <li><strong>Phase B Dispersion:</strong> Slowly sift Phase B powders and active pigments into Phase A. Increase mixing speed to achieve homogeneous shear dispersion without air entrapment.</li>
          <li><strong>Phase C Cool-Down:</strong> Allow batch compound to cool down to 55°C - 60°C. Dispense Phase C essential oils, fragrances, and heat-sensitive actives. Blend for 5 minutes.</li>
          <li><strong>Phase D Hot Filling:</strong> Transfer molten bulk compound to preheated dispensing hopper. Hot fill pre-inspected Phase D packaging at 50°C - 55°C.</li>
          <li><strong>Inspection & Release:</strong> Allow units to set at room temperature. Inspect meniscus fill level, record final bulk yield mass, and apply secondary unit packaging.</li>
        </ol>
      </div>

      <!-- QC & Yield Sign-off Grid -->
      <div class="bmr-signoff-grid">
        <div class="bmr-signoff-card">
          <div class="bmr-signoff-title">1. Bulk Yield Reconciliation</div>
          <div class="field-hint">Theoretical Bulk: <strong>${bulk_kg.toFixed(3)} KG</strong></div>
          <div class="field-hint">Theoretical Units: <strong>${pieces} PCS</strong></div>
          <div class="field-hint">Actual Bulk Yield: <strong>________ KG</strong></div>
          <div class="helper-text">Yield Efficiency: <strong>________ %</strong></div>
        </div>
        <div class="bmr-signoff-card">
          <div class="bmr-signoff-title">2. Compounding Operator</div>
          <div class="field-hint">Dispensed & Mixed By: <strong>${operator}</strong></div>
          <div class="field-hint">Run Date: <strong>${dateStr}</strong></div>
          <div class="bmr-signoff-line">
            <span>Operator Signature</span>
            <span>Date</span>
          </div>
        </div>
        <div class="bmr-signoff-card">
          <div class="bmr-signoff-title">3. Quality Control (QC) Release</div>
          <div class="field-hint">Appearance / Odor: <strong>[ ] PASS  [ ] FAIL</strong></div>
          <div class="field-hint">Fill Weight Inspection: <strong>[ ] PASS</strong></div>
          <div class="bmr-signoff-line">
            <span>QC Manager Signature</span>
            <span>Date</span>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeBmrModal() {
  const modal = document.getElementById('modal-bmr-sheet');
  if (modal) modal.classList.remove('active');
}

function printBmrSheet() {
  window.print();
}

// ==========================================
// PURCHASE REORDER DRAFTER & PACK SIZING (OPTION 3)
// ==========================================

function computeClientReorderDraft() {
  const sim = state.simulation || { material_rows: [] };
  const items = [];
  let total_packs = 0;
  let urgent_count = 0;

  for (const row of sim.material_rows || []) {
    if (!row.is_shortage) continue;
    const mat = state.materials[row.code] || {};
    const uom = row.uom;
    const deficit = row.deficit;
    let pack_size = Number(mat.pack_size || row.pack_size || (uom === 'KG' ? 25.0 : 1000.0));
    if (pack_size <= 0) pack_size = 1.0;

    const packs_to_order = Math.ceil(deficit / pack_size);
    const suggested_qty = packs_to_order * pack_size;
    const lead_time = Number(row.lead_time_days || 30);
    const is_critical = lead_time >= 30;
    if (is_critical) urgent_count += 1;
    total_packs += packs_to_order;

    items.push({
      code: row.code,
      description: row.description,
      category: row.category,
      uom,
      stock_on_hand: row.stock_on_hand,
      total_committed: row.total_committed,
      deficit,
      pack_size,
      packs_to_order,
      suggested_order_qty: suggested_qty,
      surplus_after_order: suggested_qty - deficit,
      lead_time_days: lead_time,
      is_critical_lead: is_critical,
      first_deficit_day: row.first_deficit_day
    });
  }

  items.sort((a, b) => {
    if (a.is_critical_lead !== b.is_critical_lead) return a.is_critical_lead ? -1 : 1;
    return b.deficit - a.deficit;
  });

  return {
    items,
    total_items: items.length,
    total_packs,
    urgent_count
  };
}

async function openReorderModal() {
  const modal = document.getElementById('modal-reorder-drafter');
  if (!modal) return;
  modal.classList.add('active');

  let draft = null;
  try {
    const res = await fetch('/api/reorder/draft');
    if (res.ok) {
      draft = await res.json();
    }
  } catch (err) {
    console.warn('Backend draft endpoint unavailable, computing client-side', err);
  }

  // Client-side fallback computation
  if (!draft || !draft.items) {
    draft = computeClientReorderDraft();
  }

  state.current_reorder_draft = draft;

  document.getElementById('reorder-kpi-items').textContent = draft.total_items;
  document.getElementById('reorder-kpi-packs').textContent = draft.total_packs;
  document.getElementById('reorder-kpi-urgent').textContent = draft.urgent_count;

  const tbody = document.getElementById('reorder-table-body');
  if (!tbody) return;

  if (draft.items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center" style="padding: 24px; color: var(--success); font-weight: 700;">✓ All materials sufficient. No procurement reorders required for active production plan.</td></tr>`;
    return;
  }

  tbody.innerHTML = draft.items.map(item => {
    const isCritical = item.is_critical_lead;
    const catStr = item.category === 'RAW_MATERIAL' ? 'Raw Material' : 'Packaging';
    const urgencyBadge = isCritical
      ? `<span class="status-chip chip-error">CRITICAL (${item.lead_time_days}d)</span>`
      : `<span class="status-chip chip-success">STANDARD (${item.lead_time_days}d)</span>`;

    return `
      <tr>
        <td class="data-tabular font-bold">${item.code}</td>
        <td class="cell-truncate" title="${item.description}"><strong>${item.description}</strong></td>
        <td><span class="label-caps">${catStr}</span></td>
        <td class="text-right data-tabular">${Number(item.stock_on_hand).toFixed(item.uom === 'KG' ? 2 : 0)} ${item.uom}</td>
        <td class="text-right data-tabular">${Number(item.total_committed).toFixed(item.uom === 'KG' ? 2 : 0)} ${item.uom}</td>
        <td class="text-right data-tabular" style="color: var(--error); font-weight: 700;">-${Number(item.deficit).toFixed(item.uom === 'KG' ? 2 : 0)} ${item.uom}</td>
        <td class="text-center"><span class="pack-chip">${item.pack_size.toFixed(item.uom === 'KG' ? 1 : 0)} ${item.uom}/pack</span></td>
        <td class="text-center data-tabular" style="font-size: 14px; font-weight: 700; color: var(--primary);">${item.packs_to_order}</td>
        <td class="text-right data-tabular order-highlight" style="font-size: 13px;">${Number(item.suggested_order_qty).toFixed(item.uom === 'KG' ? 2 : 0)} ${item.uom}</td>
        <td class="text-center data-tabular">${item.lead_time_days} days</td>
        <td class="text-center">${urgencyBadge}</td>
      </tr>
    `;
  }).join('');
}

function closeReorderModal() {
  const modal = document.getElementById('modal-reorder-drafter');
  if (modal) modal.classList.remove('active');
}

function copyReorderSummary() {
  const draft = state.current_reorder_draft;
  if (!draft || !draft.items || draft.items.length === 0) {
    showToast('No shortage items to copy', 'info');
    return;
  }

  const dateStr = new Date().toISOString().substring(0, 10);
  let text = `*HYGR PRODUCTION PROCUREMENT REORDER DRAFT*\n`;
  text += `Date: ${dateStr}\n`;
  text += `Deficit Material Lines: ${draft.total_items}\n`;
  text += `Total Supplier Packs to Order: ${draft.total_packs}\n`;
  text += `Critical Lead Items (>=30d): ${draft.urgent_count}\n\n`;
  text += `*PURCHASE REORDER LIST:*\n`;

  draft.items.forEach((item, idx) => {
    const uom = item.uom;
    const urgencyTag = item.is_critical_lead ? `[!] CRITICAL (${item.lead_time_days}d)` : `(${item.lead_time_days}d lead)`;
    text += `${idx + 1}. ${item.code} : ${item.description}\n`;
    text += `   Deficit: ${item.deficit.toFixed(uom === 'KG' ? 2 : 0)} ${uom} | Supplier Pack: ${item.pack_size.toFixed(uom === 'KG' ? 1 : 0)} ${uom}\n`;
    text += `   SUGGESTED ORDER: ${item.packs_to_order} PACK(S) = ${item.suggested_order_qty.toFixed(uom === 'KG' ? 2 : 0)} ${uom} ${urgencyTag}\n\n`;
  });

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Reorder list copied to clipboard for WhatsApp/Email', 'success');
    }).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('Reorder list copied to clipboard', 'success');
}

function exportReorderCsv() {
  window.open('/api/export/reorder.csv', '_blank');
}
