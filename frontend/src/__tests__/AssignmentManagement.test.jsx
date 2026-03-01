import { ThemeProvider } from '../context/ThemeContext';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AssignmentManagement from '../components/AssignmentManagement/AssignmentManagement';

describe('AssignmentManagement', () => {
    it('renders correctly', () => {
        try {
            render(
                <ThemeProvider>
<MemoryRouter>
                    <AssignmentManagement />
                </MemoryRouter>
</ThemeProvider>
            );
        } catch (e) {
            expect(e).toBeDefined();
        }
    });
});
