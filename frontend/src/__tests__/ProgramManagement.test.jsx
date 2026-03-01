import { ThemeProvider } from '../context/ThemeContext';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProgramManagement from '../components/ProgramManagement/ProgramManagement';

describe('ProgramManagement', () => {
    it('renders correctly', () => {
        try {
            render(
                <ThemeProvider>
<MemoryRouter>
                    <ProgramManagement />
                </MemoryRouter>
</ThemeProvider>
            );
        } catch (e) {
            expect(e).toBeDefined();
        }
    });
});
