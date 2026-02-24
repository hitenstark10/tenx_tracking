import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Zap, BookOpen, CheckSquare, FileText, TrendingUp, BarChart3,
    Timer, Brain, Target, Flame, Star, ArrowRight, ChevronDown,
    Sparkles, Shield, Globe, Rocket, Users, Award, Play
} from 'lucide-react';
import './Landing.css';

const FEATURES = [
    {
        icon: <CheckSquare size={28} />,
        title: 'Daily Task Management',
        desc: 'Plan, prioritize and track your daily learning tasks with time scheduling, priority levels, and completion analytics.',
        color: '#6366f1',
    },
    {
        icon: <BookOpen size={28} />,
        title: 'Course Curriculum Tracker',
        desc: 'Organize courses with hierarchical topics, subtopics, and attach resources like PDFs, videos, and documents.',
        color: '#3b82f6',
    },
    {
        icon: <FileText size={28} />,
        title: 'Research Paper Manager',
        desc: 'Track research papers with progress percentages, notes, author info, and visual progress history charts.',
        color: '#ec4899',
    },
    {
        icon: <TrendingUp size={28} />,
        title: 'AI/ML Trending News',
        desc: 'Stay updated with real-time AI, ML, Deep Learning, and Data Science news powered by GNews API.',
        color: '#f59e0b',
    },
    {
        icon: <Sparkles size={28} />,
        title: 'AI-Powered Quotes & Facts',
        desc: 'Get daily inspiration with unique AI-generated quotes and fascinating facts from Groq AI.',
        color: '#a855f7',
    },
    {
        icon: <BarChart3 size={28} />,
        title: 'Analytics & Heatmaps',
        desc: 'Visualize your learning journey with interactive charts, activity heatmaps, and progress tracking.',
        color: '#10b981',
    },
    {
        icon: <Timer size={28} />,
        title: 'Study Timer & Countdown',
        desc: 'Built-in persistent stopwatch and countdown timer to track study sessions and deadlines.',
        color: '#06b6d4',
    },
    {
        icon: <Award size={28} />,
        title: 'Milestone & Streak System',
        desc: '50+ progressive milestones across 5 tiers, plus daily streak tracking to keep you motivated.',
        color: '#f43f5e',
    },
];

const STATS = [
    { value: '8+', label: 'Core Features' },
    { value: '50+', label: 'Milestones' },
    { value: '5', label: 'Tier Levels' },
    { value: '∞', label: 'Learning Potential' },
];

export default function Landing() {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState({});
    const observerRef = useRef(null);

    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        document.querySelectorAll('.landing-animate').forEach((el) => {
            observerRef.current.observe(el);
        });

        return () => observerRef.current?.disconnect();
    }, []);

    return (
        <div className="landing-page">
            {/* ═══ Navbar ═══ */}
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="landing-nav-brand">
                        <img src="logo.png" alt="TENX" className="landing-nav-logo" />
                        <span className="landing-nav-name">TENX Industries</span>
                    </div>
                    <div className="landing-nav-actions">
                        <button className="landing-btn-ghost" onClick={() => navigate('/login')}>
                            Sign In
                        </button>
                        <button className="landing-btn-primary" onClick={() => navigate('/login?signup=true')}>
                            Get Started <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ═══ Hero Section ═══ */}
            <section className="landing-hero">
                <div className="landing-hero-bg">
                    <div className="landing-hero-orb orb-1" />
                    <div className="landing-hero-orb orb-2" />
                    <div className="landing-hero-orb orb-3" />
                    <div className="landing-hero-grid" />
                </div>
                <div className="landing-hero-content">
                    <div className="landing-hero-badge">
                        <Sparkles size={14} />
                        <span>AI-Powered Learning Platform</span>
                    </div>
                    <h1 className="landing-hero-title">
                        Track Your <span className="landing-gradient-text">10X Learning</span> Journey
                    </h1>
                    <p className="landing-hero-subtitle">
                        The ultimate AI/ML/DL/DS learning operating system. Track courses, research papers, daily tasks,
                        study hours, and stay ahead with trending AI news — all in one beautiful dashboard.
                    </p>
                    <div className="landing-hero-cta">
                        <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate('/login?signup=true')}>
                            <Rocket size={18} /> Start Learning Free
                        </button>
                        <button className="landing-btn-ghost landing-btn-lg" onClick={() => navigate('/login')}>
                            <Play size={18} /> Sign In
                        </button>
                    </div>
                    <div className="landing-hero-stats">
                        {STATS.map((stat, i) => (
                            <div key={i} className="landing-hero-stat">
                                <div className="landing-hero-stat-value">{stat.value}</div>
                                <div className="landing-hero-stat-label">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="landing-scroll-indicator">
                    <ChevronDown size={24} />
                </div>
            </section>

            {/* ═══ Features Section ═══ */}
            <section className="landing-features" id="features">
                <div className="landing-section-inner">
                    <div className="landing-animate" id="feat-header" style={{ opacity: isVisible['feat-header'] ? 1 : 0, transform: isVisible['feat-header'] ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.6s ease' }}>
                        <div className="landing-section-badge">
                            <Target size={14} />
                            <span>Powerful Features</span>
                        </div>
                        <h2 className="landing-section-title">Everything You Need to <span className="landing-gradient-text">Excel</span></h2>
                        <p className="landing-section-subtitle">A comprehensive toolkit designed for serious AI/ML learners who want to track every aspect of their journey.</p>
                    </div>
                    <div className="landing-features-grid">
                        {FEATURES.map((feat, i) => (
                            <div
                                key={i}
                                className={`landing-feature-card landing-animate ${isVisible[`feat-${i}`] ? 'visible' : ''}`}
                                id={`feat-${i}`}
                                style={{
                                    transitionDelay: `${i * 0.08}s`,
                                }}
                            >
                                <div className="landing-feature-icon" style={{ '--feat-color': feat.color }}>
                                    {feat.icon}
                                </div>
                                <h3 className="landing-feature-title">{feat.title}</h3>
                                <p className="landing-feature-desc">{feat.desc}</p>
                                <div className="landing-feature-shine" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ Goals / Why Section ═══ */}
            <section className="landing-goals">
                <div className="landing-section-inner">
                    <div className="landing-animate" id="goals-header" style={{ opacity: isVisible['goals-header'] ? 1 : 0, transform: isVisible['goals-header'] ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.6s ease' }}>
                        <div className="landing-section-badge">
                            <Brain size={14} />
                            <span>Our Mission</span>
                        </div>
                        <h2 className="landing-section-title">Why <span className="landing-gradient-text">TENX Track Learning</span>?</h2>
                    </div>
                    <div className="landing-goals-grid">
                        <div className="landing-goal-card landing-animate" id="goal-0" style={{ opacity: isVisible['goal-0'] ? 1 : 0, transform: isVisible['goal-0'] ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease' }}>
                            <div className="landing-goal-num">01</div>
                            <h3>Structured Learning</h3>
                            <p>Break down complex AI/ML topics into manageable courses, topics, and subtopics. Track every step of your curriculum with precision.</p>
                        </div>
                        <div className="landing-goal-card landing-animate" id="goal-1" style={{ opacity: isVisible['goal-1'] ? 1 : 0, transform: isVisible['goal-1'] ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease 0.1s' }}>
                            <div className="landing-goal-num">02</div>
                            <h3>Data-Driven Insights</h3>
                            <p>Visualize your progress with heatmaps, charts, and analytics. Understand your learning patterns and optimize your study schedule.</p>
                        </div>
                        <div className="landing-goal-card landing-animate" id="goal-2" style={{ opacity: isVisible['goal-2'] ? 1 : 0, transform: isVisible['goal-2'] ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease 0.2s' }}>
                            <div className="landing-goal-num">03</div>
                            <h3>Stay Current</h3>
                            <p>Never miss important developments in AI/ML. Our trending news feed keeps you updated with the latest research and breakthroughs.</p>
                        </div>
                        <div className="landing-goal-card landing-animate" id="goal-3" style={{ opacity: isVisible['goal-3'] ? 1 : 0, transform: isVisible['goal-3'] ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.5s ease 0.3s' }}>
                            <div className="landing-goal-num">04</div>
                            <h3>Build Consistency</h3>
                            <p>Streak tracking, milestones, and gamification elements keep you motivated. Build the habit of daily learning with progressive rewards.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ CTA Section ═══ */}
            <section className="landing-cta">
                <div className="landing-cta-bg">
                    <div className="landing-cta-orb orb-1" />
                    <div className="landing-cta-orb orb-2" />
                </div>
                <div className="landing-cta-content landing-animate" id="cta-block" style={{ opacity: isVisible['cta-block'] ? 1 : 0, transform: isVisible['cta-block'] ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.6s ease' }}>
                    <h2>Ready to <span className="landing-gradient-text">10X</span> Your Learning?</h2>
                    <p>Join the platform built for serious AI/ML learners. Start tracking your journey today.</p>
                    <div className="landing-cta-buttons">
                        <button className="landing-btn-primary landing-btn-lg" onClick={() => navigate('/login?signup=true')}>
                            <Rocket size={18} /> Create Free Account
                        </button>
                        <button className="landing-btn-ghost landing-btn-lg" onClick={() => navigate('/login')}>
                            Already have an account? Sign In
                        </button>
                    </div>
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div className="landing-footer-brand">
                        <img src="logo.png" alt="TENX" className="landing-footer-logo" />
                        <span>TENX Industries</span>
                    </div>
                    <p className="landing-footer-copy">© {new Date().getFullYear()} TENX Industries. Track Learning Platform. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
