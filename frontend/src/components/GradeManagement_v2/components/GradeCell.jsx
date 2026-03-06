// ==========================================
// GRADEBOOK v2 — GradeCell
// Editable inline grade input
// ==========================================
import { AlertCircle } from 'lucide-react';
import { useMemo } from 'react';

export default function GradeCell({ value, maxMarks, weight, onChange, error }) {
    const pct = useMemo(() => {
        const n = parseFloat(value);
        const m = parseFloat(maxMarks);
        return (!isNaN(n) && !isNaN(m) && m > 0) ? (n / m) * 100 : 0;
    }, [value, maxMarks]);

    // Progress colour
    const fillColor = pct >= 80 ? '#10b981'
        : pct >= 60 ? '#6366f1'
            : pct >= 40 ? '#f59e0b'
                : '#ef4444';

    return (
        <div className={`gmv2-cell ${error ? 'gmv2-cell-error' : ''}`}>
            {/* Input row */}
            <div className="gmv2-cell-input-row">
                <input
                    className="gmv2-score-input"
                    type="number"
                    value={value}
                    min={0}
                    max={maxMarks}
                    step="0.5"
                    onChange={e => onChange(e.target.value)}
                    placeholder="—"
                />
                <span className="gmv2-score-max">/ {maxMarks}</span>
            </div>

            {/* Error hint */}
            {error && (
                <div className="gmv2-cell-err-hint">
                    <AlertCircle size={10} /> {error}
                </div>
            )}

            {/* Weighted badge */}
            {!error && (
                <div className="gmv2-cell-badge">
                    {pct > 0 ? `${pct.toFixed(1)}%` : '0%'} weighted
                </div>
            )}

            {/* Progress bar */}
            <div className="gmv2-cell-bar">
                <div
                    className="gmv2-cell-bar-fill"
                    style={{ width: `${Math.min(pct, 100)}%`, background: fillColor }}
                />
            </div>
        </div>
    );
}
