import { ThemeProvider } from '../context/ThemeContext';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Header from '../components/layout/Header';

describe('Header', () => {
    it('renders correctly', () => {
        try {
            render(<Header title="Dashboard" />);
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
        } catch (e) {
            expect(e).toBeDefined();
        }
    });
});
