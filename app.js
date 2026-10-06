(() => {
  'use strict';

  // Keep the original storage keys so a rename does not erase existing progress.
  const STORAGE_KEY = 'daymark.habits.v1';
  const THEME_KEY = 'daymark.theme.v1';
  const COLORS = ['coral', 'violet', 'green', 'blue', 'amber'];
  const PALETTE = {
    coral: ['#f47862', '#fceae4'], violet: ['#8b7bd5', '#f0edfc'],
    green: ['#62ab8b', '#e7f5ee'], blue: ['#629ac7', '#e8f2fa'],
    amber: ['#d8a651', '#fcf3df']
  };
  const $ = (selector) => document.querySelector(selector);
  const todayKey = () => {
    const day = new Date();
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  };
  const dateFromKey = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const shiftDate = (key, offset) => {
    const date = dateFromKey(key);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const makeId = () => typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID() : `habit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function starterHabits() {
    return [
      { id: makeId(), name: 'Read a little', note: 'One page at a time adds up.', target: 4, unit: '5 pages', icon: '📖', color: 'coral', history: {} },
      { id: makeId(), name: 'Move your body', note: 'Make room for movement.', target: 3, unit: '10 minutes', icon: '↗', color: 'violet', history: {} },
      { id: makeId(), name: 'Drink water', note: 'A small reset throughout the day.', target: 8, unit: '1 glass', icon: '💧', color: 'blue', history: {} }
    ];
  }

  function normalizeHabit(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string' || !raw.name.trim()) return null;
    const target = Math.max(1, Math.min(12, Math.trunc(Number(raw.target)) || 1));
    const history = {};
    if (raw.history && typeof raw.history === 'object' && !Array.isArray(raw.history)) {
      Object.entries(raw.history).slice(0, 4000).forEach(([day, count]) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Number(count))) {
          history[day] = Math.max(0, Math.min(target, Math.trunc(Number(count))));
        }
      });
    }
    return {
      id: typeof raw.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(raw.id) ? raw.id : makeId(),
      name: raw.name.trim().slice(0, 48),
      note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 100) : '',
      target,
      unit: typeof raw.unit === 'string' ? raw.unit.trim().slice(0, 24) : '',
      icon: typeof raw.icon === 'string' ? raw.icon.trim().slice(0, 8) || '✦' : '✦',
      color: COLORS.includes(raw.color) ? raw.color : 'coral',
      history
    };
  }

  function loadHabits() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.map(normalizeHabit).filter(Boolean).slice(0, 100);
      }
    } catch (error) {
      console.warn('Could not load saved habits:', error);
    }
    return starterHabits();
  }

  let habits = loadHabits();
  let selectedDate = todayKey();
  let editingId = null;
  let toastTimer;

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch (error) {
      console.warn('Could not save habits:', error);
      showToast('Storage is unavailable. Export your data to keep a copy.');
    }
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3300);
  }

  const progressOn = (habit, day) => Math.max(0, Math.min(habit.target, Number(habit.history[day]) || 0));
  const totalTarget = () => habits.reduce((total, habit) => total + habit.target, 0);
  const totalOn = (day) => habits.reduce((total, habit) => total + progressOn(habit, day), 0);
  const fullDate = (key) => dateFromKey(key).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  function streakFor(habit) {
    let day = todayKey();
    if (progressOn(habit, day) < habit.target) day = shiftDate(day, -1);
    let streak = 0;
    while (streak < 4000 && progressOn(habit, day) >= habit.target) {
      streak++;
      day = shiftDate(day, -1);
    }
    return streak;
  }

  function renderOverview() {
    const total = totalTarget();
    const done = totalOn(todayKey());
    const completedHabits = habits.filter((habit) => progressOn(habit, todayKey()) === habit.target).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    $('#progress-ring').style.setProperty('--progress', `${percent}%`);
    $('#progress-ring').setAttribute('aria-label', `${percent} percent of today's checkpoints completed`);
    $('#progress-percent').textContent = `${percent}%`;
    $('#habits-complete').innerHTML = `${completedHabits} <span>/ ${habits.length}</span>`;
    $('#checkpoints-complete').innerHTML = `${done} <span>/ ${total}</span>`;
    $('#momentum-title').textContent = percent === 100 && total ? 'You showed up today!' : done ? 'Keep the rhythm going.' : 'Every step matters.';
    $('#momentum-message').textContent = percent === 100 && total
      ? 'Take a moment to celebrate your progress.'
      : done ? `${total - done} checkpoint${total - done === 1 ? '' : 's'} left to go today.`
      : 'Choose a checkpoint to get started.';
  }

  function renderWeek() {
    const today = todayKey();
    $('#live-date').textContent = dateFromKey(today).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    $('#week-strip').innerHTML = Array.from({ length: 7 }, (_, index) => shiftDate(today, index - 6)).map((day) => {
      const date = dateFromKey(day);
      const done = totalOn(day);
      const target = totalTarget();
      const isComplete = target > 0 && done === target;
      const status = isComplete ? '✓ All done' : done ? `${done} / ${target}` : '—';
      return `<button class="day-button ${day === selectedDate ? 'is-selected' : ''}" type="button" data-day="${day}" aria-pressed="${day === selectedDate}" aria-label="${escapeHTML(fullDate(day))}: ${isComplete ? 'all checkpoints complete' : `${done} of ${target} checkpoints`}">
        <span class="weekday">${escapeHTML(date.toLocaleDateString(undefined, { weekday: 'short' }))}</span>
        <span class="day-number">${date.getDate()}</span>
        <span class="day-status ${isComplete ? 'complete' : done ? 'partial' : ''}">${status}</span>
      </button>`;
    }).join('');
  }

  function renderHabits() {
    $('#habit-count').textContent = String(habits.length);
    const isToday = selectedDate === todayKey();
    $('#selected-day-banner').hidden = isToday;
    if (!isToday) $('#selected-day-label').textContent = `Viewing ${fullDate(selectedDate)}`;
    if (!habits.length) {
      $('#habits-grid').innerHTML = `<div class="empty-state"><div class="empty-icon" aria-hidden="true">✦</div><h3>Start with one small thing.</h3><p>Add a habit and break it into easy daily checkpoints.</p><button class="primary-button" type="button" data-action="new">＋ Add your first habit</button></div>`;
      return;
    }
    $('#habits-grid').innerHTML = habits.map((habit) => {
      const count = progressOn(habit, selectedDate);
      const [accent, tint] = PALETTE[habit.color];
      const checkpoints = Array.from({ length: habit.target }, (_, index) => {
        const marked = index < count;
        return `<button class="checkpoint ${marked ? 'filled' : ''}" type="button" data-action="checkpoint" data-id="${habit.id}" data-number="${index + 1}" aria-label="${marked ? 'Undo' : 'Complete'} checkpoint ${index + 1} of ${habit.target} for ${escapeHTML(habit.name)}" aria-pressed="${marked}" title="${escapeHTML(habit.unit || `Checkpoint ${index + 1}`)}"></button>`;
      }).join('');
      const streak = streakFor(habit);
      return `<article class="habit-card" style="--accent:${accent};--tint:${tint}">
        <div class="habit-card-top">
          <div class="habit-icon" aria-hidden="true">${escapeHTML(habit.icon)}</div>
          <div class="habit-copy"><h3>${escapeHTML(habit.name)}</h3><p>${escapeHTML(habit.note || (habit.unit ? `Each step: ${habit.unit}` : 'One step at a time.'))}</p></div>
          <div class="menu-wrap"><button class="menu-button" type="button" data-action="menu" aria-label="Options for ${escapeHTML(habit.name)}" aria-expanded="false">···</button>
            <div class="card-menu" hidden><button type="button" data-action="edit" data-id="${habit.id}">Edit habit</button><button class="delete-action" type="button" data-action="delete" data-id="${habit.id}">Delete habit</button></div>
          </div>
        </div>
        <div class="habit-progress-line"><span class="progress-label">Daily checkpoints${habit.unit ? ` · ${escapeHTML(habit.unit)} each` : ''}</span><span class="progress-value">${count} <span>/ ${habit.target}</span></span></div>
        <div class="checkpoint-list" role="group" aria-label="Checkpoints for ${escapeHTML(habit.name)}">${checkpoints}</div>
        <div class="habit-card-footer"><span class="streak">${streak ? '✦ ' : '○ '}<strong>${streak} day${streak === 1 ? '' : 's'}</strong> streak</span>
          <div class="checkpoint-controls"><button class="round-control" type="button" data-action="decrement" data-id="${habit.id}" aria-label="Remove one checkpoint from ${escapeHTML(habit.name)}" ${count === 0 ? 'disabled' : ''}>−</button><button class="round-control add" type="button" data-action="increment" data-id="${habit.id}" aria-label="Add one checkpoint to ${escapeHTML(habit.name)}" ${count === habit.target ? 'disabled' : ''}>+</button></div>
        </div>
      </article>`;
    }).join('');
  }

  function render() {
    renderOverview();
    renderWeek();
    renderHabits();
  }

  function updateCount(id, count) {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return;
    const next = Math.max(0, Math.min(habit.target, count));
    if (next === 0) delete habit.history[selectedDate];
    else habit.history[selectedDate] = next;
    save();
    render();
    if (next === habit.target && count > 0) showToast(`${habit.name} complete for ${selectedDate === todayKey() ? 'today' : fullDate(selectedDate)}!`);
  }

  function openDialog(id = null) {
    editingId = id;
    const habit = habits.find((item) => item.id === id);
    $('#habit-form').reset();
    $('#form-error').hidden = true;
    $('#dialog-title').textContent = habit ? 'Edit habit' : 'New habit';
    $('#save-habit').textContent = habit ? 'Save changes' : 'Create habit';
    $('#habit-name').value = habit?.name || '';
    $('#habit-note').value = habit?.note || '';
    $('#habit-target').value = habit?.target || 3;
    $('#habit-unit').value = habit?.unit || '';
    $('#habit-icon').value = habit?.icon || '✦';
    $('#habit-color').value = habit?.color || 'coral';
    $('#habit-dialog').showModal();
    $('#habit-name').focus();
  }

  function closeDialog() { $('#habit-dialog').close(); }

  function exportData() {
    const blob = new Blob([JSON.stringify({ app: 'Habit Bloom', version: 1, exportedAt: new Date().toISOString(), habits }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `habit-bloom-backup-${todayKey()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Your backup is ready.');
  }

  async function importData(file) {
    if (!file) return;
    if (file.size > 2_000_000) { showToast('That file is too large to import.'); return; }
    try {
      const data = JSON.parse(await file.text());
      if (!['Habit Bloom', 'Daymark'].includes(data.app) || data.version !== 1 || !Array.isArray(data.habits) || data.habits.length > 100) throw new Error('Invalid backup');
      const next = data.habits.map(normalizeHabit);
      if (next.some((habit) => !habit) || new Set(next.map((habit) => habit.id)).size !== next.length) throw new Error('Invalid habits');
      if (!window.confirm('Replace your current habits and progress with this backup?')) return;
      habits = next;
      selectedDate = todayKey();
      save();
      render();
      showToast('Backup restored.');
    } catch (error) {
      showToast('This is not a valid Habit Bloom backup.');
    } finally {
      $('#import-file').value = '';
    }
  }

  $('#week-strip').addEventListener('click', (event) => {
    const button = event.target.closest('[data-day]');
    if (!button) return;
    selectedDate = button.dataset.day;
    renderWeek();
    renderHabits();
  });
  $('#habits-grid').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    const habit = habits.find((item) => item.id === id);
    if (action === 'new') { openDialog(); return; }
    if (action === 'menu') {
      const menu = button.nextElementSibling;
      document.querySelectorAll('.card-menu').forEach((item) => { if (item !== menu) item.hidden = true; });
      menu.hidden = !menu.hidden;
      button.setAttribute('aria-expanded', String(!menu.hidden));
      return;
    }
    if (!habit) return;
    if (action === 'increment') updateCount(id, progressOn(habit, selectedDate) + 1);
    if (action === 'decrement') updateCount(id, progressOn(habit, selectedDate) - 1);
    if (action === 'checkpoint') {
      const number = Number(button.dataset.number);
      updateCount(id, number <= progressOn(habit, selectedDate) ? number - 1 : number);
    }
    if (action === 'edit') openDialog(id);
    if (action === 'delete' && window.confirm(`Delete “${habit.name}” and its progress? This cannot be undone.`)) {
      habits = habits.filter((item) => item.id !== id);
      save(); render(); showToast('Habit deleted.');
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.menu-wrap')) document.querySelectorAll('.card-menu').forEach((menu) => { menu.hidden = true; });
  });
  $('#add-habit-top').addEventListener('click', () => openDialog());
  $('#add-habit-inline').addEventListener('click', () => openDialog());
  $('#close-dialog').addEventListener('click', closeDialog);
  $('#cancel-dialog').addEventListener('click', closeDialog);
  $('#habit-dialog').addEventListener('click', (event) => { if (event.target === $('#habit-dialog')) closeDialog(); });
  $('#return-today').addEventListener('click', () => { selectedDate = todayKey(); render(); });
  $('#export-button').addEventListener('click', exportData);
  $('#import-button').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (event) => importData(event.target.files[0]));
  $('#habit-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('#habit-name').value.trim();
    const target = Number($('#habit-target').value);
    if (!name || !Number.isInteger(target) || target < 1 || target > 12) {
      $('#form-error').textContent = 'Add a name and choose 1 to 12 checkpoints.';
      $('#form-error').hidden = false;
      return;
    }
    const values = {
      name: name.slice(0, 48), note: $('#habit-note').value.trim().slice(0, 100), target,
      unit: $('#habit-unit').value.trim().slice(0, 24), icon: $('#habit-icon').value.trim().slice(0, 8) || '✦',
      color: COLORS.includes($('#habit-color').value) ? $('#habit-color').value : 'coral'
    };
    if (editingId) {
      const habit = habits.find((item) => item.id === editingId);
      if (habit) {
        Object.assign(habit, values);
        Object.keys(habit.history).forEach((day) => { habit.history[day] = Math.min(habit.history[day], target); });
      }
      showToast('Habit updated.');
    } else {
      habits.push({ id: makeId(), ...values, history: {} });
      showToast('New habit added.');
    }
    save(); closeDialog(); render();
  });

  const themeButton = $('#theme-toggle');
  function setTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
    themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    themeButton.innerHTML = theme === 'dark'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.8A8.5 8.5 0 0 1 8.2 3.8 8.5 8.5 0 1 0 20.2 15.8Z"/></svg>';
  }
  let theme = 'light';
  try { theme = localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (error) { /* Storage may be disabled. */ }
  setTheme(theme);
  themeButton.addEventListener('click', () => {
    theme = document.body.classList.contains('dark') ? 'light' : 'dark';
    setTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (error) { /* Preference remains active for this visit. */ }
  });

  render();
  // A new calendar day should appear even if the tab was left open overnight.
  let lastToday = todayKey();
  setInterval(() => {
    const currentToday = todayKey();
    if (currentToday !== lastToday) {
      if (selectedDate === lastToday) selectedDate = currentToday;
      lastToday = currentToday;
      render();
    }
  }, 60_000);
})();
