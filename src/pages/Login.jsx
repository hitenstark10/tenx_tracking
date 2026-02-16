import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Zap, User, Lock, Eye, EyeOff, ArrowRight, Sparkles, Brain, Cpu, Network } from 'lucide-react';
import './Login.css';

export default function Login() {
    const { login, signup } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!isLogin && password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            const result = isLogin ? login(username, password) : signup(username, password);
            if (!result.success) {
                setError(result.error);
            }
            setLoading(false);
        }, 400);
    };

    return (
        <div className="login-page">
            {/* Illustration Side */}
            <div className="login-illustration">
                <div className="illustration-content">
                    <div className="illustration-shapes">
                        <div className="shape shape-1"><Brain size={40} /></div>
                        <div className="shape shape-2"><Cpu size={32} /></div>
                        <div className="shape shape-3"><Network size={36} /></div>
                        <div className="shape shape-4"><Sparkles size={28} /></div>
                        <div className="orbit orbit-1"></div>
                        <div className="orbit orbit-2"></div>
                        <div className="orbit orbit-3"></div>
                        <div className="neural-grid">
                            {Array.from({ length: 16 }).map((_, i) => (
                                <div key={i} className="neural-node" style={{
                                    animationDelay: `${i * 0.15}s`,
                                    left: `${10 + (i % 4) * 25}%`,
                                    top: `${15 + Math.floor(i / 4) * 22}%`,
                                }} />
                            ))}
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={`line-${i}`} className="neural-line" style={{
                                    animationDelay: `${i * 0.2}s`,
                                    left: `${15 + (i % 3) * 30}%`,
                                    top: `${20 + Math.floor(i / 3) * 20}%`,
                                    width: `${60 + Math.random() * 80}px`,
                                    transform: `rotate(${-30 + Math.random() * 60}deg)`,
                                }} />
                            ))}
                        </div>
                    </div>
                    <div className="illustration-text">
                        <div className="ill-logo">
                            <Zap size={28} />
                            <span>TenX</span>
                        </div>
                        <h2>Your AI Learning<br />Operating System</h2>
                        <p>Track courses, research papers, study hours, and stay on top of the latest in AI, ML, Deep Learning & Data Science.</p>
                        <div className="ill-features">
                            <div className="ill-feature">
                                <div className="ill-feature-dot"></div>
                                <span>Smart Progress Tracking</span>
                            </div>
                            <div className="ill-feature">
                                <div className="ill-feature-dot"></div>
                                <span>Interactive Analytics</span>
                            </div>
                            <div className="ill-feature">
                                <div className="ill-feature-dot"></div>
                                <span>AI/ML Trending News</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Side */}
            <div className="login-form-side">
                <div className="login-form-container">
                    <div className="login-form-header">
                        <div className="form-logo-mobile">
                            <Zap size={24} />
                            <span>TenX</span>
                        </div>
                        <h1>{isLogin ? 'Welcome back' : 'Create account'}</h1>
                        <p>{isLogin ? 'Sign in to continue your learning journey' : 'Start your AI/ML learning journey today'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && (
                            <div className="form-error animate-fade-in">
                                <span>⚠</span> {error}
                            </div>
                        )}

                        <div className="form-field">
                            <label htmlFor="username">Username</label>
                            <div className="field-input-wrapper">
                                <User size={16} className="field-icon" />
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="input"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="form-field">
                            <label htmlFor="password">Password</label>
                            <div className="field-input-wrapper">
                                <Lock size={16} className="field-icon" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    required
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                />
                                <button
                                    type="button"
                                    className="field-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="form-field animate-fade-in">
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <div className="field-input-wrapper">
                                    <Lock size={16} className="field-icon" />
                                    <input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input"
                                        required
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
                            {loading ? (
                                <div className="login-spinner" />
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-toggle">
                        <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
                        <button
                            type="button"
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="toggle-link"
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
