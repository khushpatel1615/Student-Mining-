import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        // Apply zoom to document (supported in modern browsers)
        document.documentElement.style.zoom = zoom;
    }, [zoom]);

    const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.3));
    const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.8));
    const resetZoom = () => setZoom(1);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light')
    }

    const value = {
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
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
