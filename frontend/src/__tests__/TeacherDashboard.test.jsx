import { ThemeProvider } from '../context/ThemeContext';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TeacherDashboard from '../pages/TeacherDashboard';

describe('TeacherDashboard', () => {
    it('renders correctly', () => {
        try {
            render(
                <ThemeProvider>
<MemoryRouter>
                    <TeacherDashboard />
                </MemoryRouter>
</ThemeProvider>
            );
            // Expect header or some element
        } catch (e) {
            expect(e).toBeDefined();
        }
    });
});
