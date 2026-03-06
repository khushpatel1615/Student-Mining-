// ==========================================
// GRADEBOOK v2 — Constants & Configuration
// ==========================================

export const GRADE_SCALE = [
    { label: 'A+', min: 90, max: 100, color: '#10b981', bg: '#d1fae5' },
    { label: 'A', min: 80, max: 89, color: '#06b6d4', bg: '#cffafe' },
    { label: 'B+', min: 70, max: 79, color: '#6366f1', bg: '#e0e7ff' },
    { label: 'B', min: 60, max: 69, color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'C', min: 50, max: 59, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'D', min: 40, max: 49, color: '#f97316', bg: '#ffedd5' },
    { label: 'F', min: 0, max: 39, color: '#ef4444', bg: '#fee2e2' },
];

export function getGradeInfo(score) {
    const n = parseFloat(score);
    if (isNaN(n)) return { label: '—', color: '#94a3b8', bg: '#f1f5f9', class: 'grade-none' };
    const found = GRADE_SCALE.find(g => n >= g.min && n <= g.max);
    return found || GRADE_SCALE[GRADE_SCALE.length - 1];
}

export const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({
    value: String(i + 1),
    label: `Semester ${i + 1}`,
}));

export const STUDENT_STATUSES = {
    valid: { label: 'Valid', color: '#10b981', bg: '#d1fae5' },
    incomplete: { label: 'Incomplete', color: '#f59e0b', bg: '#fef3c7' },
    pending: { label: 'Pending', color: '#94a3b8', bg: '#f1f5f9' },
};

export const AVATAR_PALETTE = [
    '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981',
    '#f59e0b', '#f97316', '#3b82f6', '#14b8a6', '#a855f7',
];

export function avatarColor(name = '') {
    const code = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}
