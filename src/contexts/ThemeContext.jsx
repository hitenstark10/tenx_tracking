import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Force dark theme — matching Landing page
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
    }, []);

    return (
        <ThemeContext.Provider value={{
            theme: 'dark',
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
