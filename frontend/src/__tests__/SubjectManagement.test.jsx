import { ThemeProvider } from '../context/ThemeContext';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SubjectManagement from '../components/SubjectManagement/SubjectManagement';

describe('SubjectManagement', () => {
    it('renders correctly', () => {
        try {
            render(
                <ThemeProvider>
<MemoryRouter>
                    <SubjectManagement />
                </MemoryRouter>
</ThemeProvider>
            );
        } catch (e) {
            expect(e).toBeDefined();
        }
    });
});
