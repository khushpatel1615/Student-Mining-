import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GradesTab from '../components/Student/Grades/GradesTab';
import * as AuthContext from '../context/AuthContext';
import * as StudentService from '../services/studentService';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    ChevronDown: () => <div data-testid="icon-down" />,
    ChevronUp: () => <div data-testid="icon-up" />,
    Calculator: () => <div data-testid="icon-calc" />,
    Download: () => <div data-testid="icon-download" />,
    AlertCircle: () => <div data-testid="icon-alert" />,
    Target: () => <div data-testid="icon-target" />,
    ArrowRight: () => <div data-testid="icon-arrow" />,
    TrendingUp: () => <div data-testid="icon-trend-up" />,
    TrendingDown: () => <div data-testid="icon-trend-down" />,
    Filter: () => <div data-testid="icon-filter" />,
    BookOpen: () => <div data-testid="icon-book" />,
    Award: () => <div data-testid="icon-award" />,
    Mail: () => <div data-testid="icon-mail" />,
    FileText: () => <div data-testid="icon-file" />,
    Clock: () => <div data-testid="icon-clock" />,
}));

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../services/studentService', () => ({
    fetchStudentGrades: vi.fn(),
}));

describe('GradesTab Component', () => {
    const mockUser = { id: 3, full_name: 'Student User', current_semester: 1 };

    const mockGrades = [
        {
            enrollment_id: 1,
            subject_name: 'Database Systems',
            subject_code: 'CS202',
            credits: 4,
            final_percentage: 85.0,
            final_grade: 'A',
            semester: 1,
            status: 'active',
            grades: [
                { component_name: 'Midterm', weight_percentage: 40, max_marks: 100, marks_obtained: 80 },
                { component_name: 'Final', weight_percentage: 60, max_marks: 100, marks_obtained: null }
            ]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        AuthContext.useAuth.mockReturnValue({ user: mockUser });
        StudentService.fetchStudentGrades.mockResolvedValue({ data: mockGrades, error: null });
    });

    test('renders grades and calculated stats', async () => {
        render(<GradesTab />);

        await waitFor(() => {
            expect(screen.getByText('Database Systems')).toBeDefined();
            expect(screen.getByText('CS202')).toBeDefined();
            // multiple 85 might exist (stats + card), so we check that at least one exists
            expect(screen.getAllByText(/85/).length).toBeGreaterThan(0);
        });

        // GPA calculation: 85.0% is 'A' which is 3.7 GPA in gpa_helpers.php logic used in component
        expect(screen.getByText('3.70')).toBeDefined();
    });

    test('toggles simulator and calculates projected grade', async () => {
        render(<GradesTab />);

        await waitFor(() => screen.getByText('Database Systems'));

        const simBtn = screen.getByText('What-If Simulator');
        fireEvent.click(simBtn);

        expect(screen.getByText('Grade Simulator')).toBeDefined();

        // Find input for the 'Final' component (which is null)
        const simInput = screen.getByPlaceholderText('Enter score');
        fireEvent.change(simInput, { target: { value: '90' } });

        // Calculation: 
        // Current: (80/100)*40 = 32.0%
        // Simulated: (90/100)*60 = 54.0%
        // Total Projected: 32.0 + 54.0 = 86.0%
        await waitFor(() => {
            // Looking for 86.0 in the simulator area
            expect(screen.getAllByText(/86/).length).toBeGreaterThan(0);
        });
    });

    test('expands subject to show breakdown', async () => {
        render(<GradesTab />);

        await waitFor(() => screen.getByText('Database Systems'));

        const card = screen.getByText('Database Systems');
        fireEvent.click(card);

        expect(screen.getByText('Assessment Breakdown')).toBeDefined();
        expect(screen.getByText('Midterm')).toBeDefined();
        expect(screen.getByText('40% weight')).toBeDefined();
        expect(screen.getByText('Pending')).toBeDefined(); // For the Final exam
    });
});
