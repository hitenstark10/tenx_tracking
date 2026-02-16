const KEYS = {
    USERS: 'tenx_users',
    CURRENT_USER: 'tenx_current_user',
    DAILY_TASKS: 'tenx_daily_tasks',
    COURSES: 'tenx_courses',
    RESEARCH_PAPERS: 'tenx_research_papers',
    STUDY_SESSIONS: 'tenx_study_sessions',
    BOOKMARKS: 'tenx_bookmarks',
    THEME: 'tenx_theme',
    STREAK: 'tenx_streak',
    STOPWATCH: 'tenx_stopwatch',
    COUNTDOWN: 'tenx_countdown',
    ACTIVITY_LOG: 'tenx_activity_log',
    NEWS_CACHE: 'tenx_news_cache',
    NEWS_CACHE_DATE: 'tenx_news_cache_date',
    NEWS_READ: 'tenx_news_read',
    PROFILE: 'tenx_profile',
    ACCENT_COLOR: 'tenx_accent_color',
};

function get(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function set(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Storage error:', e);
    }
}

function getUserKey(key) {
    const user = get(KEYS.CURRENT_USER);
    return user ? `${key}_${user.username}` : key;
}

// ─── Auth ───
export function getUsers() { return get(KEYS.USERS) || []; }
export function saveUsers(users) { set(KEYS.USERS, users); }
export function getCurrentUser() { return get(KEYS.CURRENT_USER); }
export function setCurrentUser(user) { set(KEYS.CURRENT_USER, user); }
export function clearCurrentUser() { localStorage.removeItem(KEYS.CURRENT_USER); }

// ─── Daily Tasks ───
export function getDailyTasks() { return get(getUserKey(KEYS.DAILY_TASKS)) || []; }
export function saveDailyTasks(tasks) { set(getUserKey(KEYS.DAILY_TASKS), tasks); }

// ─── Courses ───
export function getCourses() { return get(getUserKey(KEYS.COURSES)) || []; }
export function saveCourses(courses) { set(getUserKey(KEYS.COURSES), courses); }

// ─── Research Papers ───
export function getResearchPapers() { return get(getUserKey(KEYS.RESEARCH_PAPERS)) || []; }
export function saveResearchPapers(papers) { set(getUserKey(KEYS.RESEARCH_PAPERS), papers); }

// ─── Study Sessions ───
export function getStudySessions() { return get(getUserKey(KEYS.STUDY_SESSIONS)) || []; }
export function saveStudySessions(sessions) { set(getUserKey(KEYS.STUDY_SESSIONS), sessions); }

// ─── Bookmarks ───
export function getBookmarks() { return get(getUserKey(KEYS.BOOKMARKS)) || []; }
export function saveBookmarks(bookmarks) { set(getUserKey(KEYS.BOOKMARKS), bookmarks); }

// ─── Theme ───
export function getTheme() { return get(KEYS.THEME) || 'dark'; }
export function saveTheme(theme) { set(KEYS.THEME, theme); }

// ─── Streak ───
export function getStreak() { return get(getUserKey(KEYS.STREAK)) || { count: 0, lastDate: null }; }
export function saveStreak(streak) { set(getUserKey(KEYS.STREAK), streak); }

// ─── Stopwatch (persistent) ───
export function getStopwatch() {
    return get(getUserKey(KEYS.STOPWATCH)) || {
        isRunning: false,
        startTimestamp: null,
        accumulatedSeconds: 0,
    };
}
export function saveStopwatch(state) { set(getUserKey(KEYS.STOPWATCH), state); }

// ─── Countdown (persistent) ───
export function getCountdown() { return get(getUserKey(KEYS.COUNTDOWN)) || ''; }
export function saveCountdown(targetDate) { set(getUserKey(KEYS.COUNTDOWN), targetDate); }

// ─── Activity Log ───
// Each entry: { date: 'YYYY-MM-DD', tasks: N, curriculum: N, papers: N, resources: N, articlesRead: N }
export function getActivityLog() { return get(getUserKey(KEYS.ACTIVITY_LOG)) || []; }
export function saveActivityLog(log) { set(getUserKey(KEYS.ACTIVITY_LOG), log); }

export function logActivity(type, count = 1) {
    const today = new Date().toISOString().slice(0, 10);
    const log = getActivityLog();
    let entry = log.find(e => e.date === today);
    if (!entry) {
        entry = { date: today, tasks: 0, curriculum: 0, papers: 0, resources: 0, articlesRead: 0 };
        log.push(entry);
    }
    if (type in entry) entry[type] += count;
    saveActivityLog(log);
    return log;
}

// ─── News Cache ───
export function getNewsCache() { return get(getUserKey(KEYS.NEWS_CACHE)) || []; }
export function saveNewsCache(articles) { set(getUserKey(KEYS.NEWS_CACHE), articles); }
export function getNewsCacheDate() { return get(getUserKey(KEYS.NEWS_CACHE_DATE)) || ''; }
export function saveNewsCacheDate(date) { set(getUserKey(KEYS.NEWS_CACHE_DATE), date); }
export function getNewsRead() { return get(getUserKey(KEYS.NEWS_READ)) || []; }
export function saveNewsRead(readIds) { set(getUserKey(KEYS.NEWS_READ), readIds); }

// ─── Profile ───
export function getProfile() { return get(getUserKey(KEYS.PROFILE)) || null; }
export function saveProfile(profile) { set(getUserKey(KEYS.PROFILE), profile); }

// ─── Accent Color ───
export function getAccentColor() { return get(KEYS.ACCENT_COLOR) || ''; }
export function saveAccentColor(color) { set(KEYS.ACCENT_COLOR, color); }

export default KEYS;
