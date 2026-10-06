(() => {
  'use strict';

  const STORAGE_KEY = 'habit-bloom-data-v1';
  const OLD_STORAGE_KEY = 'daymark.habits.v1';
  const THEME_KEY = 'habit-bloom-theme-v1';
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
    return [
      { id: newId(), name: 'Read', note: 'Read 20 pages', target: 4, unit: '5 pages', icon: '📖', color: 'blue', history: {} },
      { id: newId(), name: 'Exercise', note: 'Exercise for 30 minutes', target: 3, unit: '10 minutes', icon: '🏃', color: 'green', history: {} },
      { id: newId(), name: 'Drink water', note: 'Drink 8 glasses of water', target: 8, unit: '1 glass', icon: '💧', color: 'purple', history: {} }
    ];
  }

  function cleanHabit(raw) {
    if (!raw || typeof raw.name !== 'string' || !raw.name.trim()) return null;
    const target = Math.max(1, Math.min(12, Math.trunc(Number(raw.target)) || 1));
    const history = {};
    if (raw.history && typeof raw.history === 'object' && !Array.isArray(raw.history)) {
      Object.entries(raw.history).slice(0, 4000).forEach(([day, amount]) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Number(amount))) {
          history[day] = Math.max(0, Math.min(target, Math.trunc(Number(amount))));
        }
      });
    }
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
      color: COLORS[color] ? color : 'blue',
      history: history
    };
  }

  function loadHabits() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(OLD_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.map(cleanHabit).filter(Boolean).slice(0, 100);
      }
    } catch (error) {
      console.warn('Could not load habits:', error);
    }
    return sampleHabits();
  }

  let habits = loadHabits();
  let selectedDate = todayKey();
  let editingId = null;
  let toastTimer;

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function saveHabits() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch (error) {
      console.warn('Could not save habits:', error);
      showToast('Could not save here. Try exporting a backup.');
    }
  }

  function countFor(habit, day) {
    return Math.max(0, Math.min(habit.target, Number(habit.history[day]) || 0));
  }

  function totalTarget() {
    return habits.reduce((sum, habit) => sum + habit.target, 0);
  }

  function totalDone(day) {
    return habits.reduce((sum, habit) => sum + countFor(habit, day), 0);
  }

  function streakFor(habit) {
    let day = todayKey();
    if (countFor(habit, day) < habit.target) day = moveDay(day, -1);
    let streak = 0;
    while (streak < 4000 && countFor(habit, day) === habit.target) {
      streak++;
      day = moveDay(day, -1);
    }
    return streak;
  }

  function renderSummary() {
    const today = todayKey();
    const target = totalTarget();
    const done = totalDone(today);
    const finished = habits.filter((habit) => countFor(habit, today) === habit.target).length;
    const percent = target ? Math.round(done / target * 100) : 0;
    $('#today-label').textContent = formatDate(today);
    $('#progress-percent').textContent = percent + '%';
    $('#progress-fill').style.width = percent + '%';
    $('#progress-track').setAttribute('aria-valuenow', String(percent));
    $('#habits-done').textContent = finished + ' / ' + habits.length;
    $('#checkpoints-done').textContent = done + ' / ' + target;
    $('#progress-message').textContent = target && done === target
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
      const target = totalTarget();
      const complete = target > 0 && done === target;
      const label = complete ? 'Done' : done + ' / ' + target;
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
      const accent = COLORS[habit.color];
      let checkpoints = '';
      for (let i = 1; i <= habit.target; i++) {
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
        '<div class="card-actions"><button type="button" data-action="edit" data-id="' + habit.id + '">Edit</button>' +
        '<button type="button" data-action="delete" data-id="' + habit.id + '">Delete</button></div></div>' +
        '<div class="habit-progress"><span>Daily checkpoints' + (habit.unit ? ' · ' + escapeHtml(habit.unit) + ' each' : '') +
        '</span><strong>' + count + ' / ' + habit.target + '</strong></div>' +
        '<div class="checkpoints" role="group" aria-label="Checkpoints for ' + escapeHtml(habit.name) + '">' + checkpoints + '</div>' +
        '<div class="habit-card-footer"><span class="streak">Streak: <strong>' + streak + ' day' + (streak === 1 ? '' : 's') + '</strong></span>' +
        '<div class="count-controls"><button type="button" data-action="minus" data-id="' + habit.id +
        '" aria-label="Remove one checkpoint from ' + escapeHtml(habit.name) + '"' + (count === 0 ? ' disabled' : '') + '>−</button>' +
        '<button class="plus" type="button" data-action="plus" data-id="' + habit.id +
        '" aria-label="Add one checkpoint to ' + escapeHtml(habit.name) + '"' + (count === habit.target ? ' disabled' : '') + '>+</button></div></div>' +
        '</article>';
    }).join('');
  }

  function render() {
    renderSummary();
    renderWeek();
    renderHabits();
  }

  function setCount(id, amount) {
    const habit = habits.find((item) => item.id === id);
    if (!habit) return;
    const next = Math.max(0, Math.min(habit.target, amount));
    if (next === countFor(habit, selectedDate)) return;
    if (next === 0) delete habit.history[selectedDate];
    else habit.history[selectedDate] = next;
    saveHabits();
    render();
    if (next === habit.target) showToast(habit.name + ' is complete for this day.');
  }

  function openForm(id) {
    editingId = id || null;
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
    if (file.size > 2000000) { showToast('That file is too large.'); return; }
    try {
      const data = JSON.parse(await file.text());
      if (!data || !['Habit Bloom', 'Daymark'].includes(data.app) || data.version !== 1 ||
          !Array.isArray(data.habits) || data.habits.length > 100) throw new Error('Invalid backup');
      const restored = data.habits.map(cleanHabit);
      if (restored.some((habit) => !habit) ||
          new Set(restored.map((habit) => habit.id)).size !== restored.length) throw new Error('Invalid habits');
      if (!window.confirm('Replace your current habits with the backup?')) return;
      habits = restored;
      selectedDate = todayKey();
      saveHabits();
      render();
      showToast('Backup imported.');
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
  });

  $('#habit-list').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    const habit = habits.find((item) => item.id === id);
    if (action === 'new') { openForm(); return; }
    if (!habit) return;
    if (action === 'plus') setCount(id, countFor(habit, selectedDate) + 1);
    if (action === 'minus') setCount(id, countFor(habit, selectedDate) - 1);
    if (action === 'checkpoint') {
      const number = Number(button.dataset.number);
      setCount(id, number <= countFor(habit, selectedDate) ? number - 1 : number);
    }
    if (action === 'edit') openForm(id);
    if (action === 'delete' && window.confirm('Delete "' + habit.name + '" and all its progress?')) {
      habits = habits.filter((item) => item.id !== id);
      saveHabits();
      render();
      showToast('Habit deleted.');
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
      color: COLORS[$('#habit-color').value] ? $('#habit-color').value : 'blue'
    };
    const habit = habits.find((item) => item.id === editingId);
    if (habit) {
      Object.assign(habit, values);
      Object.keys(habit.history).forEach((day) => {
        habit.history[day] = Math.min(habit.history[day], target);
      });
      showToast('Habit updated.');
    } else {
      habits.push({ id: newId(), ...values, history: {} });
      showToast('Habit added.');
    }
    saveHabits();
    $('#habit-dialog').close();
    render();
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

  render();
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
