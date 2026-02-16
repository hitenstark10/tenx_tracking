import { createContext, useContext, useState, useEffect } from 'react';
import { getTheme, saveTheme, getAccentColor, saveAccentColor } from '../utils/storage';

const ThemeContext = createContext();

const ACCENT_COLORS = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Fuchsia', value: '#d946ef' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Slate', value: '#64748b' },
];

function hexToHSL(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => getTheme());
    const [accentColor, setAccentColor] = useState(() => getAccentColor() || '#6366f1');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        saveTheme(theme);
    }, [theme]);

    useEffect(() => {
        if (accentColor) {
            const { h, s, l } = hexToHSL(accentColor);
            document.documentElement.style.setProperty('--accent-primary', accentColor);
            document.documentElement.style.setProperty('--accent-secondary', `hsl(${h}, ${s}%, ${Math.min(l + 15, 90)}%)`);
            document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${accentColor}, hsl(${h + 20}, ${s}%, ${l}%))`);
            document.documentElement.style.setProperty('--accent-glow', `${accentColor}33`);
            saveAccentColor(accentColor);
        }
    }, [accentColor]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    const changeAccentColor = (color) => {
        setAccentColor(color);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, accentColor, changeAccentColor, accentColors: ACCENT_COLORS }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
