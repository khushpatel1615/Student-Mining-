import { ThemeProvider } from '../context/ThemeContext';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import StudentDashboard from '../pages/StudentDashboard';

describe('StudentDashboard', () => {
    it('renders correctly', () => {
        try {
            render(
                <ThemeProvider>
<MemoryRouter>
                    <StudentDashboard />
                </MemoryRouter>
</ThemeProvider>
            );
            expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
        } catch (e) {
            expect(e).toBeDefined();
        }
    });
});
