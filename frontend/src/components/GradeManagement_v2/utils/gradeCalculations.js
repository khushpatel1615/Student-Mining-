// ==========================================
// GRADEBOOK v2 — Grade Calculations
// ==========================================
import { getGradeInfo } from './constants';

/**
 * Weighted total for one student across all criteria.
 * Formula: Σ (marks / maxMarks × weightPct)
 */
export function calcWeightedTotal(gradesMap, criteriaList) {
    let total = 0;
    criteriaList.forEach(c => {
        const raw = parseFloat(gradesMap?.[c.id]);
        if (!isNaN(raw) && parseFloat(c.max_marks) > 0) {
            total += (raw / parseFloat(c.max_marks)) * parseFloat(c.weight_percentage);
        }
    });
    return total;
}

/**
 * Class statistics across all enrollments.
 */
export function calcClassStats(enrollments, gradesMap, criteriaList) {
    const scores = enrollments.map(e => calcWeightedTotal(gradesMap[e.id] ?? {}, criteriaList));
    const valid = scores.filter(s => s > 0);
    if (valid.length === 0) return { average: 0, highest: 0, lowest: 0, passing: 0 };
    return {
        average: valid.reduce((a, b) => a + b, 0) / valid.length,
        highest: Math.max(...valid),
        lowest: Math.min(...valid),
        passing: (valid.filter(s => s >= 40).length / valid.length) * 100,
    };
}

/**
 * Grade distribution buckets.
 */
export function calcGradeDistribution(enrollments, gradesMap, criteriaList) {
    const dist = {};
    enrollments.forEach(e => {
        const score = calcWeightedTotal(gradesMap[e.id] ?? {}, criteriaList);
        const info = getGradeInfo(score);
        dist[info.label] = (dist[info.label] || 0) + 1;
    });
    return dist;
}

/**
 * Per-component class averages.
 */
export function calcComponentAverages(enrollments, gradesMap, criteriaList) {
    return criteriaList.map(c => {
        const vals = enrollments
            .map(e => parseFloat(gradesMap[e.id]?.[c.id]))
            .filter(v => !isNaN(v));
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return {
            name: c.component_name,
            average: avg,
            max: parseFloat(c.max_marks),
            pct: parseFloat(c.max_marks) > 0 ? (avg / parseFloat(c.max_marks)) * 100 : 0,
        };
    });
}

/**
 * Weight calibration total (ideally 100%).
 */
export function calcTotalWeight(criteriaList) {
    return criteriaList.reduce((s, c) => s + parseFloat(c.weight_percentage), 0);
}

/**
 * Data completion percentage.
 */
export function calcDataCompletion(enrollments, gradesMap, criteriaList) {
    if (!enrollments.length || !criteriaList.length) return 0;
    let filled = 0, total = enrollments.length * criteriaList.length;
    enrollments.forEach(e => {
        criteriaList.forEach(c => {
            const v = gradesMap[e.id]?.[c.id];
            if (v !== '' && v !== null && v !== undefined) filled++;
        });
    });
    return total ? (filled / total) * 100 : 0;
}

/**
 * Student completion status.
 */
export function getStudentStatus(gradesForEnrollment = {}) {
    const values = Object.values(gradesForEnrollment);
    if (!values.length || values.every(v => v === '' || v === null)) return 'pending';
    if (values.some(v => v === '' || v === null)) return 'incomplete';
    return 'valid';
}
