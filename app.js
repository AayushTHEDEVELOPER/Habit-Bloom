(() => {
  'use strict';

  const STORAGE_KEY = 'habit-bloom-data-v1';
  const OLD_STORAGE_KEY = 'daymark.habits.v1';
  const THEME_KEY = 'habit-bloom-theme-v1';
  const MAX_HABITS = 1000;
  const MAX_IMPORT_BYTES = 25000000;
  const COLORS = {
    blue: '#2f6db5',
    green: '#3c9467',
    orange: '#d6813a',
    purple: '#8168b7'
  };
  const $ = (selector) => document.querySelector(selector);

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function dateFromKey(key) {
    const parts = key.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  }

  function validDayKey(key) {
    return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) &&
      !Number.isNaN(dateFromKey(key).getTime()) && todayStyleKey(dateFromKey(key)) === key;
  }

  function todayStyleKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function moveDay(key, amount) {
    const d = dateFromKey(key);
    d.setDate(d.getDate() + amount);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatDate(key) {
    return dateFromKey(key).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function newId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'habit-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function sampleHabits() {
    const createdOn = todayKey();
    return [
      { id: newId(), name: 'Read', note: 'Read 20 pages', target: 4, unit: '5 pages', icon: '📖', color: 'blue', createdOn, targetHistory: { [createdOn]: 4 }, history: {} },
      { id: newId(), name: 'Exercise', note: 'Exercise for 30 minutes', target: 3, unit: '10 minutes', icon: '🏃', color: 'green', createdOn, targetHistory: { [createdOn]: 3 }, history: {} },
      { id: newId(), name: 'Drink water', note: 'Drink 8 glasses of water', target: 8, unit: '1 glass', icon: '💧', color: 'purple', createdOn, targetHistory: { [createdOn]: 8 }, history: {} }
    ];
  }

  function cleanHabit(raw) {
    if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) return null;
    let target = Math.max(1, Math.min(12, Math.trunc(Number(raw.target)) || 1));
    const history = {};
    if (raw.history && typeof raw.history === 'object' && !Array.isArray(raw.history)) {
      Object.entries(raw.history).slice(0, 4000).forEach(([day, amount]) => {
        if (validDayKey(day) && Number.isFinite(Number(amount))) {
          history[day] = Math.max(0, Math.min(12, Math.trunc(Number(amount))));
        }
      });
    }
    const recordedDays = Object.keys(history).filter((day) => history[day] > 0).sort();
    let createdOn = validDayKey(raw.createdOn) ? raw.createdOn : moveDay(todayKey(), -6);
    if (recordedDays.length && recordedDays[0] < createdOn) createdOn = recordedDays[0];
    const targetHistory = {};
    if (raw.targetHistory && typeof raw.targetHistory === 'object' && !Array.isArray(raw.targetHistory)) {
      Object.entries(raw.targetHistory).slice(0, 4000).forEach(([day, amount]) => {
        if (validDayKey(day) && Number.isInteger(Number(amount)) && Number(amount) >= 1 && Number(amount) <= 12) {
          targetHistory[day] = Number(amount);
        }
      });
    }
    const targetDays = Object.keys(targetHistory).sort();
    if (targetDays.length && targetDays[0] < createdOn) createdOn = targetDays[0];
    if (!Object.hasOwn(targetHistory, createdOn)) targetHistory[createdOn] = targetDays.length ? targetHistory[targetDays[0]] : target;
    const currentTargetDays = Object.keys(targetHistory).filter((day) => day <= todayKey()).sort();
    target = targetHistory[currentTargetDays.at(-1) || Object.keys(targetHistory).sort()[0]];
    let color = raw.color;
    if (color === 'coral' || color === 'amber') color = 'orange';
    if (color === 'violet') color = 'purple';
    return {
      id: typeof raw.id === 'string' && /^[\w-]{1,80}$/.test(raw.id) ? raw.id : newId(),
      name: raw.name.trim().slice(0, 48),
      note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 100) : '',
      target: target,
      unit: typeof raw.unit === 'string' ? raw.unit.trim().slice(0, 24) : '',
      icon: typeof raw.icon === 'string' ? raw.icon.trim().slice(0, 8) || '✓' : '✓',
      color: Object.hasOwn(COLORS, color) ? color : 'blue',
      createdOn: createdOn,
      targetHistory: targetHistory,
      history: history
    };
  }

  function loadHabits() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(OLD_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.map(cleanHabit).filter(Boolean);
      }
    } catch (error) {
      console.warn('Could not load habits:', error);
    }
    return sampleHabits();
  }

  let habits = loadHabits();
  let selectedDate = todayKey();
  let editingId = null;
  let editingInvalidated = false;
  let toastTimer;
  let lastSavedText = null;
  try { lastSavedText = localStorage.getItem(STORAGE_KEY); } catch (error) { /* Storage may be unavailable. */ }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function invalidateOpenEdit() {
    if (!editingId || !$('#habit-dialog').open) return;
    editingInvalidated = true;
    $('#form-error').textContent = 'Habits changed in another tab. Close this form and open it again.';
    $('#form-error').hidden = false;
  }

  function saveHabits(nextHabits) {
    try {
      const currentText = localStorage.getItem(STORAGE_KEY);
      if (currentText !== lastSavedText) {
        lastSavedText = currentText;
        habits = loadHabits();
        invalidateOpenEdit();
        render();
        showToast('Habits changed in another tab. Please try again.');
        return false;
      }
      const text = JSON.stringify(nextHabits);
      localStorage.setItem(STORAGE_KEY, text);
      lastSavedText = text;
      habits = nextHabits;
      render();
      return true;
    } catch (error) {
      console.warn('Could not save habits:', error);
      showToast('Could not save here. Try exporting a backup.');
      return false;
    }
  }

  function targetFor(habit, day) {
    let firstDay = null;
    let latestDay = null;
    for (const date of Object.keys(habit.targetHistory)) {
      if (firstDay === null || date < firstDay) firstDay = date;
      if (date <= day && (latestDay === null || date > latestDay)) latestDay = date;
    }
    return habit.targetHistory[latestDay || firstDay] || habit.target;
  }

  function countFor(habit, day) {
    if (day < habit.createdOn) return 0;
    return Math.max(0, Math.min(targetFor(habit, day), Number(habit.history[day]) || 0));
  }

  function totalTarget(day) {
    return habits.reduce((sum, habit) => sum + (habit.createdOn <= day ? targetFor(habit, day) : 0), 0);
  }

  function totalDone(day) {
    return habits.reduce((sum, habit) => sum + (habit.createdOn <= day ? countFor(habit, day) : 0), 0);
  }

  function streakFor(habit) {
    let day = todayKey();
    if (countFor(habit, day) < targetFor(habit, day)) day = moveDay(day, -1);
    let streak = 0;
    while (streak < 4000 && day >= habit.createdOn && countFor(habit, day) === targetFor(habit, day)) {
      streak++;
      day = moveDay(day, -1);
    }
    return streak;
  }

  function renderSummary() {
    const today = todayKey();
    const target = totalTarget(today);
    const done = totalDone(today);
    const active = habits.filter((habit) => habit.createdOn <= today);
    const finished = active.filter((habit) => countFor(habit, today) === targetFor(habit, today)).length;
    const percent = target ? Math.round(done / target * 100) : 0;
    $('#today-label').textContent = formatDate(today);
    $('#progress-percent').textContent = percent + '%';
    $('#progress-fill').style.width = percent + '%';
    $('#progress-track').setAttribute('aria-valuenow', String(percent));
    $('#habits-done').textContent = finished + ' / ' + active.length;
    $('#checkpoints-done').textContent = done + ' / ' + target;
    $('#progress-message').textContent = !target ? 'Add a habit to get started.'
      : done === target
      ? 'All checkpoints are complete.'
      : done ? (target - done) + ' checkpoint' + (target - done === 1 ? '' : 's') + ' remaining today.'
      : 'Mark a checkpoint to get started.';
  }

  function renderWeek() {
    const today = todayKey();
    let html = '';
    for (let i = -6; i <= 0; i++) {
      const day = moveDay(today, i);
      const date = dateFromKey(day);
      const done = totalDone(day);
      const target = totalTarget(day);
      const complete = target > 0 && done === target;
      const label = complete ? 'Done' : target ? done + ' / ' + target : 'No habits';
      html += '<button class="day-button' + (day === selectedDate ? ' selected' : '') +
        '" type="button" data-day="' + day + '" aria-pressed="' + (day === selectedDate) +
        '" aria-label="' + escapeHtml(formatDate(day)) + ': ' + done + ' of ' + target + ' checkpoints">' +
        '<span class="day-name">' + escapeHtml(date.toLocaleDateString(undefined, { weekday: 'short' })) + '</span>' +
        '<span class="day-number">' + date.getDate() + '</span>' +
        '<span class="day-progress' + (complete ? ' complete' : '') + '">' + label + '</span></button>';
    }
    $('#week-list').innerHTML = html;
  }

  function renderHabits() {
    $('#habit-count').textContent = '(' + habits.length + ')';
    const viewingToday = selectedDate === todayKey();
    $('#selected-date-message').hidden = viewingToday;
    if (!viewingToday) $('#selected-date-label').textContent = 'Viewing ' + formatDate(selectedDate);
    if (!habits.length) {
      $('#habit-list').innerHTML = '<div class="empty-state"><h3>No habits yet</h3><p>Add a habit to start tracking.</p><button class="button button-primary" data-action="new" type="button">+ Add habit</button></div>';
      return;
    }
    $('#habit-list').innerHTML = habits.map((habit) => {
      const count = countFor(habit, selectedDate);
      const target = targetFor(habit, selectedDate);
      const accent = COLORS[habit.color];
      let checkpoints = '';
      for (let i = 1; i <= target; i++) {
        const checked = i <= count;
        checkpoints += '<button class="checkpoint' + (checked ? ' done' : '') +
          '" type="button" data-action="checkpoint" data-id="' + habit.id + '" data-number="' + i +
          '" aria-pressed="' + checked + '" aria-label="' + (checked ? 'Undo' : 'Complete') + ' checkpoint ' + i +
          ' for ' + escapeHtml(habit.name) + '" title="' + escapeHtml(habit.unit || 'Checkpoint ' + i) + '"></button>';
      }
      const streak = streakFor(habit);
      return '<article class="habit-card" style="--accent:' + accent + '">' +
        '<div class="habit-card-header"><div class="habit-icon" aria-hidden="true">' + escapeHtml(habit.icon) + '</div>' +
        '<div class="habit-info"><h3>' + escapeHtml(habit.name) + '</h3><p>' + escapeHtml(habit.note || 'No note added.') + '</p></div>' +
        '<div class="card-actions"><button type="button" data-action="edit" data-id="' + habit.id + '" aria-label="Edit ' + escapeHtml(habit.name) + '">Edit</button>' +
        '<button type="button" data-action="delete" data-id="' + habit.id + '" aria-label="Delete ' + escapeHtml(habit.name) + '">Delete</button></div></div>' +
        '<div class="habit-progress"><span>Daily checkpoints' + (habit.unit ? ' · ' + escapeHtml(habit.unit) + ' each' : '') +
        '</span><strong>' + count + ' / ' + target + '</strong></div>' +
        '<div class="checkpoints" role="group" aria-label="Checkpoints for ' + escapeHtml(habit.name) + '">' + checkpoints + '</div>' +
        '<div class="habit-card-footer"><span class="streak">Streak: <strong>' + streak + ' day' + (streak === 1 ? '' : 's') + '</strong></span>' +
        '<div class="count-controls"><button type="button" data-action="minus" data-id="' + habit.id +
        '" aria-label="Remove one checkpoint from ' + escapeHtml(habit.name) + '"' + (count === 0 ? ' disabled' : '') + '>−</button>' +
        '<button class="plus" type="button" data-action="plus" data-id="' + habit.id +
        '" aria-label="Add one checkpoint to ' + escapeHtml(habit.name) + '"' + (count === target ? ' disabled' : '') + '>+</button></div></div>' +
        '</article>';
    }).join('');
  }

  function render() {
    renderSummary();
    renderWeek();
    renderHabits();
  }

  function focusAfterCount(id, action, number, count) {
    if (!action) return;
    const list = $('#habit-list');
    const prefix = 'button[data-id="' + id + '"]';
    const exact = prefix + '[data-action="' + action + '"]' + (action === 'checkpoint' ? '[data-number="' + number + '"]' : '');
    let button = list.querySelector(exact);
    if (!button || button.disabled) button = list.querySelector(prefix + '[data-action="checkpoint"][data-number="' + Math.max(1, count) + '"]');
    if (button) button.focus();
  }

  function setCount(id, amount, action, number) {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return;
    const target = targetFor(habit, selectedDate);
    const next = Math.max(0, Math.min(target, amount));
    if (next === countFor(habit, selectedDate)) return;
    const updated = { ...habit, history: { ...habit.history }, targetHistory: { ...habit.targetHistory } };
    if (next === 0) delete updated.history[selectedDate];
    else updated.history[selectedDate] = next;
    if (next > 0 && selectedDate < updated.createdOn) {
      updated.createdOn = selectedDate;
      updated.targetHistory[selectedDate] = target;
    }
    if (!saveHabits(habits.map((item) => item.id === id ? updated : item))) return;
    focusAfterCount(id, action, number, next);
    if (next === target) showToast(habit.name + ' is complete for this day.');
  }

  function openForm(id) {
    editingId = id || null;
    editingInvalidated = false;
    const habit = habits.find((item) => item.id === editingId);
    $('#habit-form').reset();
    $('#form-error').hidden = true;
    $('#dialog-heading').textContent = habit ? 'Edit habit' : 'Add a habit';
    $('#save-habit').textContent = habit ? 'Save changes' : 'Add habit';
    $('#habit-name').value = habit ? habit.name : '';
    $('#habit-note').value = habit ? habit.note : '';
    $('#habit-target').value = habit ? habit.target : 3;
    $('#habit-unit').value = habit ? habit.unit : '';
    $('#habit-icon').value = habit ? habit.icon : '✓';
    $('#habit-color').value = habit ? habit.color : 'blue';
    $('#habit-dialog').showModal();
    $('#habit-name').focus();
  }

  function exportData() {
    const data = { app: 'Habit Bloom', version: 1, exportedAt: new Date().toISOString(), habits: habits };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'habit-bloom-backup-' + todayKey() + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Backup downloaded.');
  }

  async function importData(file) {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) { showToast('That file is too large.'); return; }
      const data = JSON.parse(await file.text());
      if (!data || !['Habit Bloom', 'Daymark'].includes(data.app) || data.version !== 1 ||
          !Array.isArray(data.habits) || data.habits.length > MAX_HABITS) throw new Error('Invalid backup');
      const restored = data.habits.map(cleanHabit);
      if (restored.some((habit) => !habit) ||
          new Set(restored.map((habit) => habit.id)).size !== restored.length) throw new Error('Invalid habits');
      if (!window.confirm('Replace your current habits with the backup?')) return;
      if (saveHabits(restored)) {
        selectedDate = todayKey();
        render();
        showToast('Backup imported.');
      }
    } catch (error) {
      showToast('This is not a valid Habit Bloom backup.');
    } finally {
      $('#import-file').value = '';
    }
  }

  $('#week-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-day]');
    if (!button) return;
    selectedDate = button.dataset.day;
    renderWeek();
    renderHabits();
    const selectedButton = $('#week-list').querySelector('[data-day="' + selectedDate + '"]');
    if (selectedButton) selectedButton.focus();
  });

  $('#habit-list').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    const habit = habits.find((item) => item.id === id);
    if (action === 'new') { openForm(); return; }
    if (!habit) return;
    if (action === 'plus') setCount(id, countFor(habit, selectedDate) + 1, action);
    if (action === 'minus') setCount(id, countFor(habit, selectedDate) - 1, action);
    if (action === 'checkpoint') {
      const number = Number(button.dataset.number);
      setCount(id, number <= countFor(habit, selectedDate) ? number - 1 : number, action, number);
    }
    if (action === 'edit') openForm(id);
    if (action === 'delete' && window.confirm('Delete "' + habit.name + '" and all its progress?')) {
      if (saveHabits(habits.filter((item) => item.id !== id))) {
        $('#add-habit-bottom').focus();
        showToast('Habit deleted.');
      }
    }
  });

  $('#add-habit-top').addEventListener('click', () => openForm());
  $('#add-habit-bottom').addEventListener('click', () => openForm());
  $('#close-dialog').addEventListener('click', () => $('#habit-dialog').close());
  $('#cancel-dialog').addEventListener('click', () => $('#habit-dialog').close());
  $('#back-to-today').addEventListener('click', () => { selectedDate = todayKey(); render(); });
  $('#export-button').addEventListener('click', exportData);
  $('#import-button').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (event) => importData(event.target.files[0]));

  $('#habit-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (editingInvalidated) {
      $('#form-error').textContent = 'Habits changed in another tab. Close this form and open it again.';
      $('#form-error').hidden = false;
      return;
    }
    const name = $('#habit-name').value.trim();
    const target = Number($('#habit-target').value);
    if (!name || !Number.isInteger(target) || target < 1 || target > 12) {
      $('#form-error').textContent = 'Enter a name and choose 1 to 12 checkpoints.';
      $('#form-error').hidden = false;
      return;
    }
    const values = {
      name: name.slice(0, 48),
      note: $('#habit-note').value.trim().slice(0, 100),
      target: target,
      unit: $('#habit-unit').value.trim().slice(0, 24),
      icon: $('#habit-icon').value.trim().slice(0, 8) || '✓',
      color: Object.hasOwn(COLORS, $('#habit-color').value) ? $('#habit-color').value : 'blue'
    };
    const index = habits.findIndex((item) => item.id === editingId);
    if (editingId && index < 0) {
      $('#form-error').textContent = 'This habit changed in another tab. Close the form and try again.';
      $('#form-error').hidden = false;
      return;
    }
    let nextHabits;
    if (index >= 0) {
      const original = habits[index];
      const updated = { ...original, ...values, targetHistory: { ...original.targetHistory, [todayKey()]: target } };
      nextHabits = habits.map((item, i) => i === index ? updated : item);
    } else {
      if (habits.length >= MAX_HABITS) {
        $('#form-error').textContent = 'You can track up to ' + MAX_HABITS + ' habits.';
        $('#form-error').hidden = false;
        return;
      }
      const createdOn = todayKey();
      nextHabits = [...habits, { id: newId(), ...values, createdOn, targetHistory: { [createdOn]: target }, history: {} }];
    }
    if (!saveHabits(nextHabits)) return;
    $('#habit-dialog').close();
    showToast(index >= 0 ? 'Habit updated.' : 'Habit added.');
  });

  let theme = 'light';
  try {
    theme = localStorage.getItem(THEME_KEY) || localStorage.getItem('daymark.theme.v1') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch (error) { /* Browser storage might be unavailable. */ }
  function applyTheme() {
    document.body.classList.toggle('dark', theme === 'dark');
    $('#theme-toggle').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  }
  applyTheme();
  $('#theme-toggle').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    try { localStorage.setItem(THEME_KEY, theme); } catch (error) { /* Keep the setting for this visit. */ }
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      lastSavedText = event.newValue;
      habits = loadHabits();
      invalidateOpenEdit();
      render();
      showToast('Habits updated from another tab.');
    }
    if (event.key === THEME_KEY) {
      theme = event.newValue === 'dark' ? 'dark' : 'light';
      applyTheme();
    }
  });

  render();
  saveHabits(habits);
  let lastToday = todayKey();
  setInterval(() => {
    const currentToday = todayKey();
    if (currentToday !== lastToday) {
      if (selectedDate === lastToday) selectedDate = currentToday;
      lastToday = currentToday;
      render();
    }
  }, 60000);
})();
