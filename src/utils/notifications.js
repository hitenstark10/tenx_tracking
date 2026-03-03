// ═══════════════════════════════════════════════════════
// TenX Web — Notification Service
// Browser notifications for task times, milestones,
// streaks, and activity updates with different sounds
// ═══════════════════════════════════════════════════════

// ─── Sound Effects (Web Audio API) ───────────────────
function createOscillatorSound(type, frequency, duration, volume = 0.3) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) { /* Audio not supported */ }
}

// Task start sound — ascending chime
export function playTaskSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523, 659, 784]; // C5, E5, G5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.12);
            osc.stop(ctx.currentTime + i * 0.12 + 0.3);
        });
    } catch (e) { /* Audio not supported */ }
}

// Milestone sound — triumphant fanfare
export function playMilestoneSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [392, 523, 659, 784, 1047]; // G4, C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
            gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + i * 0.1);
            osc.stop(ctx.currentTime + i * 0.1 + 0.4);
        });
    } catch (e) { /* Audio not supported */ }
}

// Notification alert sound — single ping
export function playNotifSound() {
    createOscillatorSound('sine', 880, 0.15, 0.2);
}

// ─── Request browser notification permission ─────────
export async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
}

// ─── Send browser notification ───────────────────────
export function sendBrowserNotification(title, body, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const notif = new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: options.tag || 'tenx-notification',
        renotify: true,
        silent: false,
        ...options,
    });

    // Auto-close after 8 seconds
    setTimeout(() => notif.close(), 8000);

    notif.onclick = () => {
        window.focus();
        notif.close();
        if (options.onClick) options.onClick();
    };

    return notif;
}

// ─── In-app toast notification ───────────────────────
let toastContainer = null;

function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'tenx-toast-container';
        toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: 380px;
    `;
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

export function showToast(title, body, type = 'info') {
    const container = getToastContainer();

    const colors = {
        info: { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', icon: 'ℹ️' },
        success: { bg: 'rgba(52,211,153,0.15)', border: '#34d399', icon: '✅' },
        warning: { bg: 'rgba(251,191,36,0.15)', border: '#fbbf24', icon: '⚠️' },
        milestone: { bg: 'rgba(168,85,247,0.15)', border: '#a855f7', icon: '🏆' },
        streak: { bg: 'rgba(248,113,113,0.15)', border: '#f87171', icon: '🔥' },
        task: { bg: 'rgba(96,165,250,0.15)', border: '#60a5fa', icon: '⏰' },
    };

    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
    background: ${c.bg};
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid ${c.border};
    border-left: 3px solid ${c.border};
    border-radius: 12px;
    padding: 14px 18px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    pointer-events: auto;
    cursor: pointer;
    animation: toastSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
    opacity: 1;
    transform: translateX(0);
  `;

    toast.innerHTML = `
    <span style="font-size: 20px; flex-shrink: 0; margin-top: 2px;">${c.icon}</span>
    <div style="flex: 1; min-width: 0;">
      <div style="font-weight: 700; color: #f0f1f5; font-size: 13px; margin-bottom: 3px;">${title}</div>
      <div style="color: #a0a8c4; font-size: 12px; line-height: 1.4;">${body}</div>
    </div>
    <button style="background: none; border: none; color: #6b7394; cursor: pointer; font-size: 16px; padding: 0; line-height: 1; flex-shrink: 0;">✕</button>
  `;

    // Add CSS animation if not already added
    if (!document.getElementById('tenx-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'tenx-toast-styles';
        style.textContent = `
      @keyframes toastSlideIn {
        from { opacity: 0; transform: translateX(100px) scale(0.95); }
        to { opacity: 1; transform: translateX(0) scale(1); }
      }
      @keyframes toastSlideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100px); }
      }
    `;
        document.head.appendChild(style);
    }

    const dismiss = () => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('button').onclick = dismiss;
    toast.onclick = dismiss;

    container.appendChild(toast);

    // Auto dismiss after 6 seconds
    setTimeout(dismiss, 6000);
}

// ─── Task notification scheduler ─────────────────────
const scheduledTimers = new Map();

export function scheduleTaskNotifications(tasks) {
    // Clear existing timers
    scheduledTimers.forEach(timer => clearTimeout(timer));
    scheduledTimers.clear();

    const today = new Date().toISOString().slice(0, 10);
    const todayTasks = tasks.filter(t => t.date === today && !t.completed);

    todayTasks.forEach(task => {
        // Task start notification
        if (task.startTime) {
            const [h, m] = task.startTime.split(':').map(Number);
            const startDate = new Date();
            startDate.setHours(h, m, 0, 0);
            const msUntilStart = startDate.getTime() - Date.now();

            if (msUntilStart > 0) {
                const timer = setTimeout(() => {
                    playTaskSound();
                    showToast('⏰ Task Starting Now!', task.name, 'task');
                    sendBrowserNotification('⏰ Task Starting Now!', task.name, { tag: `task-${task.id}` });
                }, msUntilStart);
                scheduledTimers.set(`start-${task.id}`, timer);
            }
        }

        // Task overdue notification
        if (task.endTime) {
            const [h, m] = task.endTime.split(':').map(Number);
            const endDate = new Date();
            endDate.setHours(h, m, 0, 0);
            const msUntilEnd = endDate.getTime() - Date.now();

            if (msUntilEnd > 0) {
                const timer = setTimeout(() => {
                    playTaskSound();
                    showToast('⚠️ Task Time Passed!', `"${task.name}" was due at ${task.endTime}`, 'warning');
                    sendBrowserNotification('⚠️ Task Time Passed!', `"${task.name}" was due at ${task.endTime}`, { tag: `overdue-${task.id}` });
                }, msUntilEnd);
                scheduledTimers.set(`overdue-${task.id}`, timer);
            }
        }
    });
}

// ─── Milestone notification ──────────────────────────
export function notifyMilestone(milestoneName, tier) {
    const tierEmojis = { bronze: '🥉', silver: '🥈', gold: '🥇', diamond: '💎', legend: '👑' };
    const emoji = tierEmojis[tier?.toLowerCase()] || '🏆';

    playMilestoneSound();
    showToast(`${emoji} Milestone Unlocked!`, milestoneName, 'milestone');
    sendBrowserNotification(`${emoji} Milestone Unlocked!`, milestoneName, { tag: 'milestone' });
}

// ─── Streak notification ─────────────────────────────
export function notifyStreak(count) {
    playMilestoneSound();
    const msg = count >= 7
        ? `Amazing! You've been consistent for ${count} days!`
        : `Keep it going! ${count} days and counting!`;
    showToast(`🔥 ${count} Day Streak!`, msg, 'streak');
    sendBrowserNotification(`🔥 ${count} Day Streak!`, msg, { tag: 'streak' });
}

// ─── Task completion notification ────────────────────
export function notifyTaskComplete(taskName, remaining) {
    playNotifSound();
    showToast('✅ Task Complete!', `${taskName}${remaining > 0 ? ` — ${remaining} tasks remaining` : ' — All done for today! 🎉'}`, 'success');
}

// ─── General activity notification ───────────────────
export function notifyActivity(title, body) {
    playNotifSound();
    showToast(title, body, 'info');
}
