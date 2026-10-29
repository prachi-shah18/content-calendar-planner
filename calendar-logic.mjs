export const POST_STATUSES = ['Draft', 'Scheduled', 'Published', 'Needs Review'];
let manualPostSequence = 0;

export function isDateInMonth(dateValue, month) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue)) || !/^\d{4}-\d{2}$/.test(String(month))) return false;
  const parsed = new Date(`${dateValue}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === dateValue && dateValue.slice(0, 7) === month;
}

function weekdayName(dateValue) {
  return new Date(`${dateValue}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

function monthDates(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Choose a valid planning month.');
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthNumber - 1) throw new Error('Choose a valid planning month.');
  const dates = [];
  while (date.getUTCMonth() === monthNumber - 1) {
    dates.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}

export function generatePostDates(month, postsPerWeek, preferredDays = []) {
  const dates = monthDates(month);
  const frequency = Number(postsPerWeek);
  if (!Number.isInteger(frequency) || frequency < 1 || frequency > 7) throw new Error('Posting frequency must be between 1 and 7 per week.');
  const preferred = new Set(preferredDays.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6));
  const weekGroups = new Map();
  for (const date of dates) {
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const mondayOffset = (weekday + 6) % 7;
    const groupKey = new Date(Date.parse(`${date}T00:00:00.000Z`) - mondayOffset * 86_400_000).toISOString().slice(0, 10);
    if (!weekGroups.has(groupKey)) weekGroups.set(groupKey, []);
    weekGroups.get(groupKey).push({ date, weekday });
  }

  const selected = [];
  for (const week of weekGroups.values()) {
    const count = Math.min(frequency, week.length);
    const preferredInWeek = week.filter(day => preferred.has(day.weekday));
    const pool = preferredInWeek.length >= count ? preferredInWeek : week;
    for (let index = 0; index < count; index += 1) {
      const position = Math.floor((index + 0.5) * pool.length / count);
      selected.push(pool[position].date);
    }
  }
  return [...new Set(selected)].sort();
}

export function createLocalSchedule(data) {
  const dates = generatePostDates(data.month, data.cadence, data.preferredDays);
  const formats = data.formats.length ? data.formats : ['Educational'];
  const platforms = data.platforms.length ? data.platforms : ['LinkedIn'];
  const themes = String(data.themes || data.campaigns || data.goal || 'Share a useful industry insight')
    .split(/[,\n;]+/).map(theme => theme.trim()).filter(Boolean);
  const objective = data.goal.trim();
  return dates.map((date, index) => {
    const theme = themes[index % themes.length] || 'Share a useful industry insight';
    const platform = platforms[index % platforms.length];
    return {
      id: `post-${date}-${index + 1}`,
      date,
      day: weekdayName(date),
      channel: platform,
      format: formats[index % formats.length],
      pillar: theme,
      hook: `${theme}: one idea for ${data.audience || 'your audience'}.`,
      caption: `${theme}. Review the available source material and adapt it for ${data.audience || 'your audience'}.`,
      cta: data.callToAction || 'Learn more',
      asset: data.assets.trim() || 'Create a source-backed post asset',
      objective,
      status: 'Draft',
    };
  });
}

export function validateAiSchedule(items, data) {
  const expectedDates = generatePostDates(data.month, data.cadence, data.preferredDays);
  if (!Array.isArray(items) || !items.length || items.length > 60) return false;
  if (items.length !== expectedDates.length) return false;
  const dates = new Set();
  for (const item of items) {
    if (!item || !isDateInMonth(item.date, data.month) || dates.has(item.date)) return false;
    if (['channel', 'format', 'pillar', 'hook', 'caption', 'cta', 'asset', 'objective'].some(key => typeof item[key] !== 'string')) return false;
    if (!data.platforms.includes(item.channel) || !data.formats.includes(item.format)) return false;
    dates.add(item.date);
  }
  return expectedDates.every(date => dates.has(date));
}

export function updatePost(posts, id, key, value, month) {
  const editable = new Set(['date', 'channel', 'format', 'pillar', 'hook', 'caption', 'cta', 'asset', 'objective', 'status']);
  const index = posts.findIndex(post => post.id === id);
  if (index < 0 || !editable.has(key)) return { posts, error: 'The selected post could not be updated.' };
  if (key === 'date') {
    if (!isDateInMonth(value, month)) return { posts, error: 'Post dates must remain within the selected month.' };
    if (posts.some((post, postIndex) => postIndex !== index && post.date === value)) return { posts, error: 'Another post already uses that date.' };
  }
  if (key === 'status' && !POST_STATUSES.includes(value)) return { posts, error: 'Choose a valid post status.' };
  if (key !== 'date' && key !== 'status' && typeof value !== 'string') return { posts, error: 'Post details must be text.' };
  const updated = posts.map((post, postIndex) => postIndex === index
    ? { ...post, [key]: value, ...(key === 'date' ? { day: weekdayName(value) } : {}) }
    : post);
  return { posts: updated, error: null };
}

export function addPost(posts, month, defaults = {}) {
  const usedDates = new Set(posts.map(post => post.date));
  const date = monthDates(month).find(candidate => !usedDates.has(candidate));
  if (!date) return { posts, error: 'No unassigned dates remain in the selected month.' };
  const post = {
    id: `post-manual-${++manualPostSequence}`,
    date,
    day: weekdayName(date),
    channel: defaults.channel || 'LinkedIn',
    format: defaults.format || 'Educational',
    pillar: 'New post',
    hook: '',
    caption: '',
    cta: '',
    asset: '',
    objective: defaults.objective || '',
    status: 'Draft',
  };
  return { posts: [...posts, post].sort((left, right) => left.date.localeCompare(right.date)), error: null };
}

export function deletePost(posts, id) {
  return posts.filter(post => post.id !== id);
}

export function summarizePosts(posts) {
  return {
    total: posts.length,
    formats: new Set(posts.map(post => post.format).filter(Boolean)).size,
    needsReview: posts.filter(post => post.status === 'Needs Review').length,
    scheduled: posts.filter(post => post.status === 'Scheduled').length,
  };
}

export function filterPosts(posts, { status = '', platform = '', query = '' } = {}) {
  const term = query.trim().toLowerCase();
  return posts.filter(post => (!status || post.status === status)
    && (!platform || post.channel === platform)
    && (!term || [post.date, post.channel, post.format, post.pillar, post.hook, post.caption].join(' ').toLowerCase().includes(term)))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s\uFEFF]*[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function scheduleCsv(posts) {
  const columns = ['Date', 'Day', 'Platform', 'Format', 'Theme', 'Hook', 'Caption', 'CTA', 'Asset', 'Objective', 'Status'];
  return [columns, ...posts.map(post => [post.date, post.day, post.channel, post.format, post.pillar, post.hook, post.caption, post.cta, post.asset, post.objective, post.status])]
    .map(row => row.map(csvCell).join(',')).join('\r\n');
}

function isValidMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month))) return false;
  const [year, monthNumber] = month.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, monthNumber - 1, 1));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === monthNumber - 1;
}

function isValidCalendarState(state) {
  if (!state || (state.version !== undefined && state.version !== 1) || !isValidMonth(state.month)
    || !['LOCAL MODE — deterministic schedule', 'AI-ASSISTED — REVIEW OUTPUT'].includes(state.generationMode)
    || !Array.isArray(state.posts) || state.posts.length > 31) return false;
  const ids = new Set();
  const dates = new Set();
  const fields = ['id', 'date', 'day', 'channel', 'format', 'pillar', 'hook', 'caption', 'cta', 'asset', 'objective'];
  return state.posts.every(post => {
    if (!post || fields.some(field => typeof post[field] !== 'string')
      || !POST_STATUSES.includes(post.status)
      || !isDateInMonth(post.date, state.month)
      || ids.has(post.id) || dates.has(post.date)) return false;
    ids.add(post.id);
    dates.add(post.date);
    return true;
  });
}

export function readCalendarStorage(storage, key = 'scalezix_calendar_v1') {
  if (!storage) return { state: null, error: 'Browser storage is unavailable.' };
  try {
    const raw = storage.getItem(key);
    if (!raw) return { state: null, error: null };
    const state = JSON.parse(raw);
    if (!isValidCalendarState(state)) throw new Error('Saved calendar data has an invalid shape.');
    return { state, error: null };
  } catch (error) {
    return { state: null, error: error.message || 'Browser storage is unavailable.' };
  }
}

export function persistCalendarStorage(storage, state, key = 'scalezix_calendar_v1') {
  if (!storage) return { saved: false, error: 'Browser storage is unavailable.' };
  if (!isValidCalendarState(state)) return { saved: false, error: 'Calendar data failed storage validation.' };
  try {
    storage.setItem(key, JSON.stringify({ ...state, version: 1 }));
    return { saved: true, error: null };
  } catch (error) {
    return { saved: false, error: error.message || 'Browser storage is unavailable.' };
  }
}

export function clearCalendarStorage(storage, key = 'scalezix_calendar_v1') {
  if (!storage) return { cleared: false, error: 'Browser storage is unavailable.' };
  try {
    storage.removeItem(key);
    return { cleared: true, error: null };
  } catch (error) {
    return { cleared: false, error: error.message || 'Browser storage is unavailable.' };
  }
}
