import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    // Always light — dark mode removed
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        // Force light theme, clear any stored dark preference
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.style.colorScheme = 'light';
        localStorage.removeItem('theme');
    }, []);

    useEffect(() => {
        document.documentElement.style.zoom = zoom;
    }, [zoom]);

    const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.3));
    const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.8));
    const resetZoom = () => setZoom(1);

    const value = {
        theme: 'light',
        setTheme: () => { },
        toggleTheme: () => { },
        isDark: false,
        zoom,
        zoomIn,
        zoomOut,
        resetZoom
    }

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}

export default ThemeContext
