import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
    getDailyTasks, saveDailyTasks,
    getCourses, saveCourses,
    getResearchPapers, saveResearchPapers,
    getStudySessions, saveStudySessions,
    getBookmarks, saveBookmarks,
    getStreak, saveStreak,
    getActivityLog, logActivity,
    getNewsRead, saveNewsRead,
    getProfile, saveProfile,
} from '../utils/storage';
import { generateId, getToday, calculateStreak } from '../utils/helpers';

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

    useEffect(() => {
        if (user) {
            setDailyTasks(getDailyTasks());
            setCourses(getCourses());
            setResearchPapers(getResearchPapers());
            setStudySessions(getStudySessions());
            setBookmarks(getBookmarks());
            setStreak(getStreak());
            setActivityLog(getActivityLog());
            setNewsRead(getNewsRead());
            setProfileState(getProfile() || { username: user.username, bio: '', profileImage: '' });
        }
    }, [user]);

    // ─── Daily Tasks ───
    const addDailyTask = useCallback((task) => {
        const newTask = { id: generateId(), completed: false, createdDate: getToday(), ...task };
        setDailyTasks(prev => { const next = [...prev, newTask]; saveDailyTasks(next); return next; });
    }, []);

    const updateDailyTask = useCallback((id, updates) => {
        setDailyTasks(prev => {
            const next = prev.map(t => t.id === id ? { ...t, ...updates } : t);
            saveDailyTasks(next);
            // Update streak with full context
            if (updates.completed !== undefined) {
                const newStreak = calculateStreak(next, streak, courses, researchPapers, newsRead);
                setStreak(newStreak);
                saveStreak(newStreak);
                if (updates.completed) {
                    const log = logActivity('tasks', 1);
                    setActivityLog(log);
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
            if (updates.completed) {
                const log = logActivity('curriculum', 1);
                setActivityLog(log);
            }
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
                    ...c,
                    topics: c.topics.map(t => {
                        if (t.id !== topicId) return t;
                        return { ...t, subtopics: [...(t.subtopics || []), { id: generateId(), completed: false, resources: [], ...subtopic }] };
                    }),
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
                    ...c,
                    topics: c.topics.map(t => {
                        if (t.id !== topicId) return t;
                        return { ...t, subtopics: (t.subtopics || []).map(s => s.id === subId ? { ...s, ...updates } : s) };
                    }),
                };
            });
            saveCourses(next);
            if (updates.completed) {
                const log = logActivity('curriculum', 1);
                setActivityLog(log);
            }
            return next;
        });
    }, []);

    const deleteSubtopic = useCallback((courseId, topicId, subId) => {
        setCourses(prev => {
            const next = prev.map(c => {
                if (c.id !== courseId) return c;
                return {
                    ...c,
                    topics: c.topics.map(t => {
                        if (t.id !== topicId) return t;
                        return { ...t, subtopics: (t.subtopics || []).filter(s => s.id !== subId) };
                    }),
                };
            });
            saveCourses(next);
            return next;
        });
    }, []);

    // ─── Resources (topic or subtopic level) ───
    const addResource = useCallback((courseId, topicId, subtopicId, resource) => {
        setCourses(prev => {
            const next = prev.map(c => {
                if (c.id !== courseId) return c;
                return {
                    ...c,
                    topics: c.topics.map(t => {
                        if (t.id !== topicId) return t;
                        if (subtopicId) {
                            return {
                                ...t, subtopics: (t.subtopics || []).map(s => {
                                    if (s.id !== subtopicId) return s;
                                    return { ...s, resources: [...(s.resources || []), { id: generateId(), ...resource }] };
                                })
                            };
                        }
                        // Topic-level resource
                        return { ...t, resources: [...(t.resources || []), { id: generateId(), ...resource }] };
                    }),
                };
            });
            saveCourses(next);
            const log = logActivity('resources', 1);
            setActivityLog(log);
            return next;
        });
    }, []);

    const deleteResource = useCallback((courseId, topicId, subtopicId, resourceId) => {
        setCourses(prev => {
            const next = prev.map(c => {
                if (c.id !== courseId) return c;
                return {
                    ...c,
                    topics: c.topics.map(t => {
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
                    }),
                };
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
                // Track progress history when completion changes
                if (updates.completionPercentage !== undefined && updates.completionPercentage !== p.completionPercentage) {
                    const history = [...(p.progressHistory || [])];
                    const today = getToday();
                    const existingIdx = history.findIndex(h => h.date === today);
                    if (existingIdx >= 0) {
                        history[existingIdx] = { date: today, percentage: updates.completionPercentage };
                    } else {
                        history.push({ date: today, percentage: updates.completionPercentage });
                    }
                    updated.progressHistory = history;
                }
                return updated;
            });
            saveResearchPapers(next);
            if (updates.completionPercentage !== undefined) {
                const log = logActivity('papers', 1);
                setActivityLog(log);
            }
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

    // ─── Bookmarks (for news) ───
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

    // ─── News Read Tracking ───
    const markArticleRead = useCallback((articleId) => {
        setNewsRead(prev => {
            if (prev.includes(articleId)) return prev;
            const next = [...prev, articleId];
            saveNewsRead(next);
            const log = logActivity('articlesRead', 1);
            setActivityLog(log);
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
            return next;
        });
    }, []);

    // ─── Computed ───
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
