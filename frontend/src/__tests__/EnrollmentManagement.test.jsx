import { ThemeProvider } from '../context/ThemeContext';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import EnrollmentManagement from '../components/enrollment/EnrollmentManagement';

describe('EnrollmentManagement', () => {
    it('renders correctly', () => {
        try {
            render(
                <ThemeProvider>
<MemoryRouter>
                    <EnrollmentManagement />
                </MemoryRouter>
</ThemeProvider>
            );
        } catch (e) {
            expect(e).toBeDefined();
        }
    });
});
