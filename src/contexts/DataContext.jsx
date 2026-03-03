import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
    getDailyTasks, saveDailyTasks,
    getCourses, saveCourses,
    getResearchPapers, saveResearchPapers,
    getStudySessions, saveStudySessions,
    getBookmarks, saveBookmarks,
    getStreak, saveStreak,
    getActivityLog, saveActivityLog,
    getNewsRead, saveNewsRead,
    getProfile, saveProfile,
    // Helper to log
    logActivity as logActivityLocal
} from '../utils/storage';
import { generateId, getToday, calculateStreak } from '../utils/helpers';
import { BACKEND_URL } from '../config';
import {
    requestNotificationPermission, scheduleTaskNotifications,
    notifyTaskComplete, notifyStreak
} from '../utils/notifications';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
    const { user } = useAuth();
    const [dailyTasks, setDailyTasks] = useState([]);
    const [courses, setCourses] = useState([]);
    const [researchPapers, setResearchPapers] = useState([]);
    const [studySessions, setStudySessions] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);
    const [streak, setStreak] = useState({ count: 0, lastDate: null });
    const [activityLog, setActivityLog] = useState([]);
    const [newsRead, setNewsRead] = useState([]);
    const [profile, setProfileState] = useState({ username: '', bio: '', profileImage: '' });

    const [isLoaded, setIsLoaded] = useState(false);

    // ─── Sync Helpers ───
    const fetchData = async (type, userId) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/data/${type}/${userId}`);
            if (res.ok) {
                const json = await res.json();
                // Return the data — even if it's an empty array or empty object
                // null/undefined means "no row in DB yet"
                return { found: true, value: json.data };
            }
        } catch (e) {
            console.error(`Failed to fetch ${type}:`, e.message);
        }
        return { found: false, value: null };
    };

    const syncData = async (type, data, userId) => {
        try {
            await fetch(`${BACKEND_URL}/api/data/${type}/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            });
        } catch (e) {
            console.error(`Failed to sync ${type}:`, e.message);
        }
    };

    // ─── Initialization: ALWAYS load from Supabase (cloud = source of truth) ───
    useEffect(() => {
        if (!user) return;

        // Reset to empty state immediately
        setIsLoaded(false);
        setDailyTasks([]);
        setCourses([]);
        setResearchPapers([]);
        setStudySessions([]);
        setBookmarks([]);
        setStreak({ count: 0, lastDate: null });
        setActivityLog([]);
        setNewsRead([]);
        setProfileState({
            username: user.username,
            displayName: user.username,
            bio: user.bio || '',
            profileImage: user.profileImage || '',
        });

        // Fetch ALL data from Supabase — cloud is the single source of truth
        Promise.all([
            fetchData('tasks', user.id),
            fetchData('courses', user.id),
            fetchData('papers', user.id),
            fetchData('sessions', user.id),
            fetchData('bookmarks', user.id),
            fetchData('streak', user.id),
            fetchData('activity', user.id),
            fetchData('newsread', user.id),
            fetchData('profile', user.id),
        ]).then(([tasks, coursesRes, papers, sessions, bkmk, strk, act, news, prof]) => {
            // Apply cloud data — use cloud value even if empty (to ensure consistency across browsers)
            if (tasks.found) { setDailyTasks(tasks.value || []); saveDailyTasks(tasks.value || []); }
            if (coursesRes.found) { setCourses(coursesRes.value || []); saveCourses(coursesRes.value || []); }
            if (papers.found) { setResearchPapers(papers.value || []); saveResearchPapers(papers.value || []); }
            if (sessions.found) { setStudySessions(sessions.value || []); saveStudySessions(sessions.value || []); }
            if (bkmk.found) { setBookmarks(bkmk.value || []); saveBookmarks(bkmk.value || []); }
            if (strk.found && strk.value) { setStreak(strk.value); saveStreak(strk.value); }
            if (act.found) { setActivityLog(act.value || []); saveActivityLog(act.value || []); }
            if (news.found) { setNewsRead(news.value || []); saveNewsRead(news.value || []); }

            // Profile: merge from DB with user info as fallback
            const profData = prof.found ? prof.value : null;
            if (profData && typeof profData === 'object' && Object.keys(profData).length > 0) {
                const mergedProfile = {
                    username: profData.username || user.username,
                    displayName: profData.displayName || profData.username || user.username,
                    bio: profData.bio || user.bio || '',
                    profileImage: profData.profileImage || user.profileImage || '',
                    ...profData,
                };
                setProfileState(mergedProfile);
                saveProfile(mergedProfile);
            } else {
                const initialProfile = {
                    username: user.username,
                    displayName: user.username,
                    bio: user.bio || '',
                    profileImage: user.profileImage || '',
                };
                setProfileState(initialProfile);
                saveProfile(initialProfile);
            }

            setIsLoaded(true);

            // Request notification permission & schedule task alerts
            requestNotificationPermission();
            const loadedTasks = tasks.found ? (tasks.value || []) : [];
            if (loadedTasks.length > 0) scheduleTaskNotifications(loadedTasks);
        }).catch(err => {
            console.error('Data initialization failed:', err);
            setIsLoaded(true);
        });
    }, [user]);

    // ─── Auto-Save to Supabase (debounced, only AFTER initial load) ───
    const syncTimers = {};
    const debouncedSync = useCallback((type, data) => {
        if (!user || !isLoaded) return;
        clearTimeout(syncTimers[type]);
        syncTimers[type] = setTimeout(() => {
            syncData(type, data, user.id);
        }, 500); // 500ms debounce to batch rapid changes
    }, [user, isLoaded]);

    useEffect(() => { debouncedSync('tasks', dailyTasks); }, [dailyTasks, debouncedSync]);
    useEffect(() => { debouncedSync('courses', courses); }, [courses, debouncedSync]);
    useEffect(() => { debouncedSync('papers', researchPapers); }, [researchPapers, debouncedSync]);
    useEffect(() => { debouncedSync('sessions', studySessions); }, [studySessions, debouncedSync]);
    useEffect(() => { debouncedSync('bookmarks', bookmarks); }, [bookmarks, debouncedSync]);
    useEffect(() => { debouncedSync('streak', streak); }, [streak, debouncedSync]);
    useEffect(() => { debouncedSync('activity', activityLog); }, [activityLog, debouncedSync]);
    useEffect(() => { debouncedSync('newsread', newsRead); }, [newsRead, debouncedSync]);
    useEffect(() => { debouncedSync('profile', profile); }, [profile, debouncedSync]);



    // ─── Logic (Wrapped handlers) ───
    // NOTE: Handlers update state -> Effect triggers Sync. 
    // We keep local storage saves for redundancy/offline support.

    const logActivity = (type, count) => {
        const log = logActivityLocal(type, count);
        setActivityLog(log); // Updates state -> triggers sync
        return log;
    };

    // ─── Daily Tasks ───
    const addDailyTask = useCallback((task) => {
        const newTask = { id: generateId(), completed: false, createdDate: getToday(), ...task };
        setDailyTasks(prev => {
            const next = [...prev, newTask];
            saveDailyTasks(next);
            // Reschedule notifications with new task
            scheduleTaskNotifications(next);
            return next;
        });
    }, []);

    const updateDailyTask = useCallback((id, updates) => {
        setDailyTasks(prev => {
            const next = prev.map(t => t.id === id ? { ...t, ...updates } : t);
            saveDailyTasks(next);
            // Update streak
            if (updates.completed !== undefined) {
                const newStreak = calculateStreak(next, streak, courses, researchPapers, newsRead);
                setStreak(newStreak);
                saveStreak(newStreak);
                if (updates.completed) {
                    logActivity('tasks', 1);
                    // Notify task complete
                    const task = next.find(t => t.id === id);
                    const today = getToday();
                    const remaining = next.filter(t => t.date === today && !t.completed).length;
                    notifyTaskComplete(task?.name || 'Task', remaining);
                    // Reschedule remaining task notifications
                    scheduleTaskNotifications(next);
                    // Notify streak if it increased
                    if (newStreak.count > streak.count && newStreak.count > 1) {
                        setTimeout(() => notifyStreak(newStreak.count), 1500);
                    }
                }
            }
            return next;
        });
    }, [streak, courses, researchPapers, newsRead]);

    const deleteDailyTask = useCallback((id) => {
        setDailyTasks(prev => { const next = prev.filter(t => t.id !== id); saveDailyTasks(next); return next; });
    }, []);

    // ─── Courses ───
    const addCourse = useCallback((course) => {
        const newCourse = { id: generateId(), topics: [], createdDate: getToday(), ...course };
        setCourses(prev => { const next = [...prev, newCourse]; saveCourses(next); return next; });
    }, []);

    const updateCourse = useCallback((id, updates) => {
        setCourses(prev => { const next = prev.map(c => c.id === id ? { ...c, ...updates } : c); saveCourses(next); return next; });
    }, []);

    const deleteCourse = useCallback((id) => {
        setCourses(prev => { const next = prev.filter(c => c.id !== id); saveCourses(next); return next; });
    }, []);

    // ─── Topics ───
    const addTopic = useCallback((courseId, topic) => {
        setCourses(prev => {
            const next = prev.map(c => {
                if (c.id !== courseId) return c;
                return { ...c, topics: [...(c.topics || []), { id: generateId(), completed: false, subtopics: [], resources: [], ...topic }] };
            });
            saveCourses(next);
            return next;
        });
    }, []);

    const updateTopic = useCallback((courseId, topicId, updates) => {
        setCourses(prev => {
            const next = prev.map(c => {
                if (c.id !== courseId) return c;
                return { ...c, topics: c.topics.map(t => t.id === topicId ? { ...t, ...updates } : t) };
            });
            saveCourses(next);
            if (updates.completed) logActivity('curriculum', 1);
            return next;
        });
    }, []);

    const deleteTopic = useCallback((courseId, topicId) => {
        setCourses(prev => {
            const next = prev.map(c => {
                if (c.id !== courseId) return c;
                return { ...c, topics: c.topics.filter(t => t.id !== topicId) };
            });
            saveCourses(next);
            return next;
        });
    }, []);

    // ─── Subtopics ───
    const addSubtopic = useCallback((courseId, topicId, subtopic) => {
        setCourses(prev => {
            const next = prev.map(c => {
                if (c.id !== courseId) return c;
                return {
                    ...c, topics: c.topics.map(t => {
                        if (t.id !== topicId) return t;
                        return { ...t, subtopics: [...(t.subtopics || []), { id: generateId(), completed: false, resources: [], ...subtopic }] };
                    })
                };
            });
            saveCourses(next);
            return next;
        });
    }, []);

    const updateSubtopic = useCallback((courseId, topicId, subId, updates) => {
        setCourses(prev => {
            const next = prev.map(c => {
                if (c.id !== courseId) return c;
                return {
                    ...c, topics: c.topics.map(t => {
                        if (t.id !== topicId) return t;
                        return { ...t, subtopics: (t.subtopics || []).map(s => s.id === subId ? { ...s, ...updates } : s) };
                    })
                };
            });
            saveCourses(next);
            if (updates.completed) logActivity('curriculum', 1);
            return next;
        });
    }, []);

    const deleteSubtopic = useCallback((courseId, topicId, subId) => {
        setCourses(prev => {
            const next = prev.map(c => {
                if (c.id !== courseId) return c;
                return {
                    ...c, topics: c.topics.map(t => {
                        if (t.id !== topicId) return t;
                        return { ...t, subtopics: (t.subtopics || []).filter(s => s.id !== subId) };
                    })
                };
            });
            saveCourses(next);
            return next;
        });
    }, []);

    // ─── Resources ───
    const addResource = useCallback((courseId, topicId, subtopicId, resource) => {
        setCourses(prev => {
            const next = prev.map(c => {
                if (c.id !== courseId) return c;
                const updateTopics = (t) => {
                    if (t.id !== topicId) return t;
                    if (subtopicId) {
                        return {
                            ...t, subtopics: (t.subtopics || []).map(s => {
                                if (s.id !== subtopicId) return s;
                                return { ...s, resources: [...(s.resources || []), { id: generateId(), ...resource }] };
                            })
                        };
                    }
                    return { ...t, resources: [...(t.resources || []), { id: generateId(), ...resource }] };
                };
                return { ...c, topics: c.topics.map(updateTopics) };
            });
            saveCourses(next);
            logActivity('resources', 1);
            return next;
        });
    }, []);

    const deleteResource = useCallback((courseId, topicId, subtopicId, resourceId) => {
        setCourses(prev => {
            const next = prev.map(c => {
                if (c.id !== courseId) return c;
                const updateTopics = (t) => {
                    if (t.id !== topicId) return t;
                    if (subtopicId) {
                        return {
                            ...t, subtopics: (t.subtopics || []).map(s => {
                                if (s.id !== subtopicId) return s;
                                return { ...s, resources: (s.resources || []).filter(r => r.id !== resourceId) };
                            })
                        };
                    }
                    return { ...t, resources: (t.resources || []).filter(r => r.id !== resourceId) };
                };
                return { ...c, topics: c.topics.map(updateTopics) };
            });
            saveCourses(next);
            return next;
        });
    }, []);

    // ─── Research Papers ───
    const addResearchPaper = useCallback((paper) => {
        const newPaper = {
            id: generateId(), completionPercentage: 0, notes: '', author: '', paperUrl: '',
            additionalResources: [], createdDate: getToday(),
            progressHistory: paper.completionPercentage > 0 ? [{ date: getToday(), percentage: paper.completionPercentage }] : [],
            ...paper
        };
        setResearchPapers(prev => { const next = [...prev, newPaper]; saveResearchPapers(next); return next; });
    }, []);

    const updateResearchPaper = useCallback((id, updates) => {
        setResearchPapers(prev => {
            const next = prev.map(p => {
                if (p.id !== id) return p;
                const updated = { ...p, ...updates };
                if (updates.completionPercentage !== undefined && updates.completionPercentage !== p.completionPercentage) {
                    const history = [...(p.progressHistory || [])];
                    const today = getToday();
                    const existingIdx = history.findIndex(h => h.date === today);
                    if (existingIdx >= 0) { history[existingIdx] = { date: today, percentage: updates.completionPercentage }; }
                    else { history.push({ date: today, percentage: updates.completionPercentage }); }
                    updated.progressHistory = history;
                }
                return updated;
            });
            saveResearchPapers(next);
            if (updates.completionPercentage !== undefined) logActivity('papers', 1);
            return next;
        });
    }, []);

    const deleteResearchPaper = useCallback((id) => {
        setResearchPapers(prev => { const next = prev.filter(p => p.id !== id); saveResearchPapers(next); return next; });
    }, []);

    const addPaperResource = useCallback((paperId, resource) => {
        setResearchPapers(prev => {
            const next = prev.map(p => {
                if (p.id !== paperId) return p;
                return { ...p, additionalResources: [...(p.additionalResources || []), { id: generateId(), ...resource }] };
            });
            saveResearchPapers(next);
            return next;
        });
    }, []);

    const deletePaperResource = useCallback((paperId, resourceId) => {
        setResearchPapers(prev => {
            const next = prev.map(p => {
                if (p.id !== paperId) return p;
                return { ...p, additionalResources: (p.additionalResources || []).filter(r => r.id !== resourceId) };
            });
            saveResearchPapers(next);
            return next;
        });
    }, []);

    // ─── Study Sessions ───
    const addStudySession = useCallback((session) => {
        const newSession = { id: generateId(), date: getToday(), ...session };
        setStudySessions(prev => { const next = [...prev, newSession]; saveStudySessions(next); return next; });
    }, []);

    // ─── Bookmarks ───
    const toggleBookmark = useCallback((article) => {
        setBookmarks(prev => {
            const exists = prev.find(b => b.id === article.id);
            const next = exists ? prev.filter(b => b.id !== article.id) : [...prev, { ...article, bookmarkedDate: getToday() }];
            saveBookmarks(next);
            return next;
        });
    }, []);

    const markVisited = useCallback((articleId) => {
        setBookmarks(prev => {
            const next = prev.map(b => b.id === articleId ? { ...b, visited: true } : b);
            saveBookmarks(next);
            return next;
        });
    }, []);

    // ─── News Read ───
    const markArticleRead = useCallback((articleId) => {
        setNewsRead(prev => {
            if (prev.includes(articleId)) return prev;
            const next = [...prev, articleId];
            saveNewsRead(next);
            logActivity('articlesRead', 1);
            return next;
        });
    }, []);

    const isArticleRead = useCallback((articleId) => {
        return newsRead.includes(articleId);
    }, [newsRead]);

    // ─── Profile ───
    const updateProfile = useCallback((updates) => {
        setProfileState(prev => {
            const next = { ...prev, ...updates };
            saveProfile(next);

            // Also sync to Supabase profiles table (proper SQL columns)
            if (user?.id) {
                fetch(`${BACKEND_URL}/api/profile/${user.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: next.displayName || next.username,
                        bio: next.bio || '',
                        profileImage: next.profileImage || '',
                    }),
                }).catch(e => console.warn('Profile sync to profiles table failed:', e));
            }

            return next;
        });
    }, [user]);

    // ─── Computed Stats ───
    const today = getToday();
    const todayTasks = dailyTasks.filter(t => t.date === today);
    const todayCompletedTasks = todayTasks.filter(t => t.completed).length;
    const totalStudyMinutes = studySessions.reduce((sum, s) => sum + (s.totalMinutes || 0), 0);
    const completedPapers = researchPapers.filter(p => p.completionPercentage >= 100).length;

    let totalCurriculumItems = 0;
    let completedCurriculumItems = 0;
    courses.forEach(c => {
        c.topics?.forEach(t => {
            totalCurriculumItems++;
            if (t.completed) completedCurriculumItems++;
            t.subtopics?.forEach(s => {
                totalCurriculumItems++;
                if (s.completed) completedCurriculumItems++;
            });
        });
    });

    let totalResources = 0;
    courses.forEach(c => {
        c.topics?.forEach(t => {
            totalResources += (t.resources?.length || 0);
            t.subtopics?.forEach(s => { totalResources += (s.resources?.length || 0); });
        });
    });

    const value = {
        dailyTasks, courses, researchPapers, studySessions, bookmarks, streak, activityLog, newsRead, profile,
        addDailyTask, updateDailyTask, deleteDailyTask,
        addCourse, updateCourse, deleteCourse,
        addTopic, updateTopic, deleteTopic,
        addSubtopic, updateSubtopic, deleteSubtopic,
        addResource, deleteResource,
        addResearchPaper, updateResearchPaper, deleteResearchPaper,
        addPaperResource, deletePaperResource,
        addStudySession, toggleBookmark, markVisited,
        markArticleRead, isArticleRead,
        updateProfile,
        totalStudyMinutes, todayTasks, todayCompletedTasks,
        totalCurriculumItems, completedCurriculumItems, totalResources, completedPapers,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
