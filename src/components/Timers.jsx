import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { getStopwatch, saveStopwatch, getCountdown, saveCountdown, logActivity } from '../utils/storage';
import { formatTime } from '../utils/helpers';
import { useData } from '../contexts/DataContext';

export function StopwatchCard() {
    // Loaded from storage: { startTime, isRunning, elapsed }
    // If isRunning, elapsed = storedElapsed + (now - startTime)
    const [state, setState] = useState(() => {
        const saved = getStopwatch() || { isRunning: false, startTime: null, elapsed: 0 };
        return saved;
    });
    const [displayTime, setDisplayTime] = useState(0);
    const intervalRef = useRef(null);
    const { addStudySession } = useData();

    useEffect(() => {
        // Calculate initial display
        if (state.isRunning && state.startTime) {
            const now = Date.now();
            const additional = now - state.startTime;
            setDisplayTime(state.elapsed + additional);

            intervalRef.current = setInterval(() => {
                setDisplayTime(state.elapsed + (Date.now() - state.startTime));
            }, 1000);
        } else {
            setDisplayTime(state.elapsed);
        }

        return () => clearInterval(intervalRef.current);
    }, [state]);

    const toggle = () => {
        if (state.isRunning) {
            // Stop
            const now = Date.now();
            const sessionDuration = now - state.startTime;
            const newElapsed = state.elapsed + sessionDuration;

            const newState = { isRunning: false, startTime: null, elapsed: newElapsed };
            setState(newState);
            saveStopwatch(newState);

            // Log session (in minutes)
            if (sessionDuration > 60000) { // Only log if > 1 min
                addStudySession({
                    date: new Date().toISOString().slice(0, 10),
                    totalMinutes: Math.round(sessionDuration / 60000),
                    notes: 'Stopwatch session'
                });
            }
        } else {
            // Start
            const newState = { isRunning: true, startTime: Date.now(), elapsed: state.elapsed };
            setState(newState);
            saveStopwatch(newState);
        }
    };

    const reset = () => {
        if (state.isRunning) toggle(); // stop first
        const newState = { isRunning: false, startTime: null, elapsed: 0 };
        setState(newState);
        saveStopwatch(newState);
        setDisplayTime(0);
    };

    const format = (ms) => {
        const totalSecs = Math.floor(ms / 1000);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="card timer-card">
            <h4><Clock size={16} /> Stopwatch</h4>
            <div className="timer-display">{format(displayTime)}</div>
            <div className="timer-controls">
                <button className={`btn ${state.isRunning ? 'btn-danger' : 'btn-success'}`} onClick={toggle}>
                    {state.isRunning ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button className="btn btn-secondary" onClick={reset}>
                    <RotateCcw size={18} />
                </button>
            </div>
        </div>
    );
}

export function CountdownCard() {
    const [state, setState] = useState(() => {
        // { isRunning, endTime, initialDuration, remaining }
        const saved = getCountdown() || { isRunning: false, endTime: null, initialDuration: 25 * 60 * 1000, remaining: 25 * 60 * 1000 };
        return saved;
    });

    // Calculate accurate remaining time
    const getRemaining = () => {
        if (state.isRunning && state.endTime) {
            const left = state.endTime - Date.now();
            return left > 0 ? left : 0;
        }
        return state.remaining;
    };

    const [displayTime, setDisplayTime] = useState(getRemaining());
    const [inputMin, setInputMin] = useState(25);
    const intervalRef = useRef(null);
    const { addStudySession } = useData();

    useEffect(() => {
        if (state.isRunning) {
            intervalRef.current = setInterval(() => {
                const left = state.endTime - Date.now();
                if (left <= 0) {
                    // Finished
                    clearInterval(intervalRef.current);
                    setDisplayTime(0);
                    setState(prev => ({ ...prev, isRunning: false, remaining: 0 }));
                    saveCountdown({ ...state, isRunning: false, remaining: 0 });

                    // Log session
                    addStudySession({
                        date: new Date().toISOString().slice(0, 10),
                        totalMinutes: Math.round(state.initialDuration / 60000),
                        notes: 'Countdown session'
                    });

                    // Play sound?
                    // new Audio('/alarm.mp3').play().catch(e => {});
                    alert("Time's up!");
                } else {
                    setDisplayTime(left);
                }
            }, 1000);
        } else {
            setDisplayTime(state.remaining);
        }
        return () => clearInterval(intervalRef.current);
    }, [state.isRunning, state.endTime]);

    const start = () => {
        const duration = state.remaining > 0 ? state.remaining : inputMin * 60 * 1000;
        const endTime = Date.now() + duration;
        const newState = {
            isRunning: true,
            endTime,
            initialDuration: state.remaining > 0 ? state.initialDuration : duration,
            remaining: duration
        };
        setState(newState);
        saveCountdown(newState);
    };

    const pause = () => {
        const left = state.endTime - Date.now();
        const newState = { ...state, isRunning: false, remaining: left > 0 ? left : 0 };
        setState(newState);
        saveCountdown(newState);
    };

    const reset = () => {
        const duration = inputMin * 60 * 1000;
        const newState = { isRunning: false, endTime: null, initialDuration: duration, remaining: duration };
        setState(newState);
        saveCountdown(newState);
        setDisplayTime(duration);
    };

    const format = (ms) => {
        const totalSecs = Math.ceil(ms / 1000);
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="card timer-card">
            <h4>⏳ Focus Timer</h4>
            <div className="timer-display">{format(displayTime)}</div>

            {!state.isRunning && state.remaining === state.initialDuration && (
                <div style={{ marginBottom: 12 }}>
                    <input
                        type="number"
                        className="input"
                        value={inputMin}
                        onChange={e => {
                            const val = parseInt(e.target.value) || 1;
                            setInputMin(val);
                            setState(prev => ({ ...prev, initialDuration: val * 60000, remaining: val * 60000 }));
                            setDisplayTime(val * 60000);
                        }}
                        style={{ width: 60, textAlign: 'center', marginRight: 8 }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>min</span>
                </div>
            )}

            <div className="timer-controls">
                <button className={`btn ${state.isRunning ? 'btn-warning' : 'btn-success'}`} onClick={state.isRunning ? pause : start}>
                    {state.isRunning ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button className="btn btn-secondary" onClick={reset}>
                    <RotateCcw size={18} />
                </button>
            </div>
        </div>
    );
}
