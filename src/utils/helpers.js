export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

export function formatDateShort(date) {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
    });
}

export function formatDateISO(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getToday() {
    return formatDateISO(new Date());
}

export function formatMinutesToHHMM(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatSeconds(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(formatDateISO(d));
    }
    return days;
}

export function getLast30Days() {
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(formatDateISO(d));
    }
    return days;
}

export function getMonthDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    return { daysInMonth, startDayOfWeek };
}

export function getDaysCountdownTo(targetDate) {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, expired: false };
}

export function getPriorityColor(priority) {
    switch (priority) {
        case 'high': return 'var(--priority-high)';
        case 'medium': return 'var(--priority-medium)';
        case 'low': return 'var(--priority-low)';
        default: return 'var(--text-tertiary)';
    }
}

export function getPriorityBg(priority) {
    switch (priority) {
        case 'high': return 'var(--priority-high-bg)';
        case 'medium': return 'var(--priority-medium-bg)';
        case 'low': return 'var(--priority-low-bg)';
        default: return 'var(--bg-tertiary)';
    }
}

export function getCourseProgress(course) {
    if (!course.topics || course.topics.length === 0) return 0;
    let total = 0;
    let completed = 0;
    course.topics.forEach(topic => {
        total++;
        if (topic.completed) completed++;
        if (topic.subtopics) {
            topic.subtopics.forEach(sub => {
                total++;
                if (sub.completed) completed++;
            });
        }
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
}

export function calculateStreak(tasks, currentStreak, courses = [], researchPapers = [], newsRead = []) {
    const today = getToday();
    const yesterday = formatDateISO(new Date(Date.now() - 86400000));

    if (currentStreak.lastDate === today) return currentStreak;

    // Check if ALL required items are completed for today
    const todayTasks = tasks.filter(t => t.date === today);
    const allTasksDone = todayTasks.length > 0 && todayTasks.every(t => t.completed);

    // Course topics for today
    let hasCourseItems = false;
    let allCourseItemsDone = true;
    courses.forEach(c => {
        c.topics?.forEach(t => {
            if (t.date === today) {
                hasCourseItems = true;
                if (!t.completed) allCourseItemsDone = false;
            }
            t.subtopics?.forEach(s => {
                if (s.date === today) {
                    hasCourseItems = true;
                    if (!s.completed) allCourseItemsDone = false;
                }
            });
        });
    });

    // Papers assigned (if any) — check if all due papers updated today
    const todayPapers = researchPapers.filter(p =>
        p.startDate && p.startDate <= today && (!p.endDate || p.endDate >= today)
    );
    const hasPapers = todayPapers.length > 0;
    const allPapersDone = !hasPapers || todayPapers.every(p => p.lastUpdated === today);

    // News/articles: if there's any news activity expected, it's considered optional unless assigned
    // From the requirement: "News/articles (if assigned)" — check if any articles were read today
    const hasNewsAssignment = false; // News is passive, not assigned
    const newsOk = !hasNewsAssignment || newsRead.length > 0;

    // All conditions
    const tasksOk = todayTasks.length === 0 || allTasksDone;
    const coursesOk = !hasCourseItems || allCourseItemsDone;
    const papersOk = allPapersDone;

    // Streak only increments if there was at least SOME activity and everything assigned is done
    const hasAnyActivity = todayTasks.length > 0 || hasCourseItems || hasPapers;
    const allDone = hasAnyActivity && tasksOk && coursesOk && papersOk && newsOk;

    if (allDone) {
        if (currentStreak.lastDate === yesterday || currentStreak.count === 0) {
            return { count: currentStreak.count + 1, lastDate: today };
        }
        return { count: 1, lastDate: today };
    }

    // Reset if a day was missed
    if (currentStreak.lastDate !== yesterday && currentStreak.lastDate !== today) {
        return { count: 0, lastDate: currentStreak.lastDate };
    }

    return currentStreak;
}

export function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

// ─── Heatmap Helpers ───

/**
 * Calculate activity score for a given date from all data sources.
 * Returns { total, tasks, curriculum, papers, resources, articlesRead }
 */
export function getActivityForDate(date, activityLog, dailyTasks, courses, researchPapers) {
    const result = { total: 0, tasks: 0, curriculum: 0, papers: 0, resources: 0, articlesRead: 0 };

    // Tasks completed on this date
    result.tasks = dailyTasks.filter(t => t.date === date && t.completed).length;

    // Curriculum items completed on this date
    courses.forEach(c => {
        c.topics?.forEach(t => {
            if (t.completed && t.completedDate === date) result.curriculum++;
            t.subtopics?.forEach(s => {
                if (s.completed && s.completedDate === date) result.curriculum++;
            });
        });
    });

    // Research progress on this date
    result.papers = researchPapers.filter(p => p.lastUpdated === date).length;

    // From activity log
    const logEntry = activityLog.find(e => e.date === date);
    if (logEntry) {
        result.resources = logEntry.resources || 0;
        result.articlesRead = logEntry.articlesRead || 0;
    }

    result.total = result.tasks + result.curriculum + result.papers + result.resources + result.articlesRead;
    return result;
}

/**
 * Get activity intensity level (0–5) based on total score.
 */
export function getActivityLevel(total) {
    if (total === 0) return 0;
    if (total <= 2) return 1;
    if (total <= 5) return 2;
    if (total <= 8) return 3;
    if (total <= 12) return 4;
    return 5;
}

/**
 * Generate heatmap grid data for a given month.
 * Returns array of weeks, each week is array of 7 day objects.
 */
export function getHeatmapMonth(year, month, activityLog, dailyTasks, courses, researchPapers) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDow = firstDay.getDay(); // 0=Sun

    const weeks = [];
    let currentWeek = new Array(7).fill(null);

    // Fill empty days before month starts
    for (let i = 0; i < startDow; i++) {
        currentWeek[i] = null;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDateISO(new Date(year, month, day));
        const activity = getActivityForDate(dateStr, activityLog, dailyTasks, courses, researchPapers);
        const level = getActivityLevel(activity.total);
        const dow = (startDow + day - 1) % 7;

        if (dow === 0 && day > 1) {
            weeks.push(currentWeek);
            currentWeek = new Array(7).fill(null);
        }

        currentWeek[dow] = {
            date: dateStr,
            day,
            level,
            activity,
            isToday: dateStr === getToday(),
        };
    }

    // Push the last week
    weeks.push(currentWeek);

    return weeks;
}
