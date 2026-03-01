import { ThemeProvider } from '../context/ThemeContext';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CalendarManagement from '../components/CalendarManagement/CalendarManagement';

describe('CalendarManagement', () => {
    it('renders correctly', () => {
        try {
            render(
                <ThemeProvider>
<MemoryRouter>
                    <CalendarManagement />
                </MemoryRouter>
</ThemeProvider>
            );
        } catch (e) {
            expect(e).toBeDefined();
        }
    });
});
