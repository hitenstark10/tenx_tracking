import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, Mail, User, Lock, ArrowRight, Sparkles, Home } from 'lucide-react';
import './Login.css';

export default function Login() {
    const { login, signup, resetPassword } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isSignup, setIsSignup] = useState(() => searchParams.get('signup') === 'true');
    const [isReset, setIsReset] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
        setSuccessMsg('');
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setError(''); setSuccessMsg(''); setLoading(true);
        if (!formData.email) { setError('Email is required'); setLoading(false); return; }
        if (!formData.password || formData.password.length < 6) { setError('New password must be at least 6 characters'); setLoading(false); return; }

        const res = await resetPassword(formData.email, formData.password);
        if (res.success) {
            setSuccessMsg('Password has been successfully reset! You can now log in.');
            setFormData(prev => ({ ...prev, password: '' }));
            setTimeout(() => {
                setIsReset(false);
                setSuccessMsg('');
            }, 3000);
        } else {
            setError(res.error);
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isReset) return handleReset(e);

        setError('');
        setSuccessMsg('');
        setLoading(true);

        if (isSignup) {
            if (!formData.username.trim()) { setError('Username is required'); setLoading(false); return; }
            if (!formData.email.trim()) { setError('Email is required'); setLoading(false); return; }
            if (formData.password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
            if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }

            const result = await signup(formData.username, formData.email, formData.password);
            if (result.success) {
                if (result.needsVerification) {
                    setSuccessMsg('Account created! Please check your email to verify your account.');
                } else {
                    setSuccessMsg('Account created! You can now log in.');
                    setIsSignup(false);
                }
            } else {
                setError(result.error || 'Signup failed');
            }
        } else {
            // Login
            if (!formData.email.trim()) { setError('Email is required'); setLoading(false); return; }
            if (!formData.password) { setError('Password is required'); setLoading(false); return; }

            const result = await login(formData.email, formData.password);
            if (!result.success) {
                setError(result.error || 'Login failed');
            }
        }
        setLoading(false);
    };

    return (
        <div className="login-page">
            {/* Animated Background */}
            <div className="login-bg">
                <div className="login-bg-orb orb-1" />
                <div className="login-bg-orb orb-2" />
                <div className="login-bg-orb orb-3" />
                <div className="login-bg-grid" />
            </div>

            <div className="login-container">
                {/* Back to Home */}
                <button className="login-back-home" onClick={() => navigate('/')}>
                    <Home size={16} /> Back to Home
                </button>

                {/* Left: Illustration */}
                <div className="login-illustration">
                    <div className="login-illustration-content">
                        <div className="login-brand">
                            <div className="login-brand-icon">
                                <img src="/logo.png" alt="TENX" height={100} width={100} />
                            </div>
                            <h1 className="login-brand-name">TENX Industry</h1>
                            <p className="login-brand-sub">Track Learning App</p>
                        </div>

                        <div className="login-features">
                            <div className="login-feature">
                                <Sparkles size={18} />
                                <span>AI-Powered Daily Quotes & Facts</span>
                            </div>
                            <div className="login-feature">
                                <Sparkles size={18} />
                                <span>Track Courses, Tasks & Research</span>
                            </div>
                            <div className="login-feature">
                                <Sparkles size={18} />
                                <span>Real-time AI/ML Trending News</span>
                            </div>
                            <div className="login-feature">
                                <Sparkles size={18} />
                                <span>Study Analytics & Streaks</span>
                            </div>
                        </div>

                        {/* Floating shapes */}
                        <div className="login-shapes">
                            <div className="login-shape shape-1" />
                            <div className="login-shape shape-2" />
                            <div className="login-shape shape-3" />
                            <div className="login-shape shape-4" />
                        </div>
                    </div>
                </div>

                {/* Right: Form */}
                <div className="login-form-wrapper">
                    <div className="login-form-card">
                        <div className="login-form-header">
                            <h2 className="login-title">
                                {isReset ? 'Reset Password' : (isSignup ? 'Create Account' : 'Welcome Back')}
                            </h2>
                            <div className="login-subtitle">
                                <p>{isReset ? 'Enter your email and a new password to reset it instantly' : (isSignup ? 'Start your 10x learning journey' : 'Sign in to continue learning')}</p>
                            </div>

                            {error && <div className="login-alert login-alert-error">{error}</div>}
                            {successMsg && <div className="login-alert login-alert-success">{successMsg}</div>}

                            <form onSubmit={handleSubmit} className="login-form">
                                {isSignup && (
                                    <div className="login-input-group">
                                        <label><User size={14} /> Username</label>
                                        <input
                                            type="text"
                                            name="username"
                                            className="input"
                                            placeholder="Choose a username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            autoComplete="username"
                                        />
                                    </div>
                                )}

                                <div className="login-input-group">
                                    <label><Mail size={14} /> Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="input"
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        autoComplete="email"
                                    />
                                </div>

                                {(!isReset || isReset) && ( /* Show password for reset too, but different placeholder */
                                    <div className="login-input-group">
                                        <label><Lock size={14} /> {isReset ? 'New Password' : 'Password'}</label>
                                        <div className="login-pw-wrapper">
                                            <input
                                                type={showPw ? 'text' : 'password'}
                                                name="password"
                                                className="input"
                                                placeholder={isSignup || isReset ? 'Min 6 characters' : 'Enter password'}
                                                value={formData.password}
                                                onChange={handleChange}
                                                autoComplete={isSignup || isReset ? 'new-password' : 'current-password'}
                                            />
                                            <button type="button" className="login-pw-toggle" onClick={() => setShowPw(!showPw)}>
                                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {!isSignup && !isReset && <div className="login-forgot-row">
                                            <button type="button" className="login-forgot-link" onClick={() => setIsReset(true)}>Forgot password?</button>
                                        </div>}
                                    </div>
                                )}

                                {isSignup && !isReset && (
                                    <div className="login-input-group">
                                        <label><Lock size={14} /> Confirm Password</label>
                                        <input
                                            type={showPw ? 'text' : 'password'}
                                            name="confirmPassword"
                                            className="input"
                                            placeholder="Confirm password"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                )}

                                <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
                                    {loading ? '⏳ Please wait...' : (
                                        isReset ? 'Reset Password' : (
                                            <>{isSignup ? 'Create Account' : 'Sign In'} <ArrowRight size={16} /></>
                                        )
                                    )}
                                </button>
                            </form>

                            {!isReset ? (
                                <div className="login-footer">
                                    <p>
                                        {isSignup ? 'Already have an account?' : "Don't have an account?"}
                                        <button type="button" className="login-link-btn" onClick={() => { setIsSignup(!isSignup); setError(''); }}>
                                            {isSignup ? 'Sign In' : 'Sign Up'}
                                        </button>
                                    </p>
                                </div>
                            ) : (
                                <div className="login-footer">
                                    <button type="button" className="login-link-btn" onClick={() => { setIsReset(false); setError(''); setSuccessMsg(''); }}>
                                        Back to Login
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
