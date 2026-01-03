import './SubjectCard.css'

// Subject Type Colors
const typeColors = {
    Core: { bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', badge: '#6366f1' },
    Open: { bg: 'linear-gradient(135deg, #10b981, #34d399)', badge: '#10b981' },
    Elective: { bg: 'linear-gradient(135deg, #f59e0b, #fbbf24)', badge: '#f59e0b' }
}

// Icons
const BookIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5.5 0 0 1 6.5 2z" />
    </svg>
)

const CreditIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
)

const CodeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
    </svg>
)

function SubjectCard({ subject, animationDelay = 0 }) {
    const typeStyle = typeColors[subject.subject_type] || typeColors.Open

    return (
        <div
            className="subject-card"
            style={{ animationDelay: `${animationDelay}s` }}
        >
            {/* Card Header with Type Icon */}
            <div className="subject-card-header">
                <div
                    className="subject-icon"
                    style={{ background: typeStyle.bg }}
                >
                    <BookIcon />
                </div>
                <span
                    className="subject-type-badge"
                    style={{ backgroundColor: `${typeStyle.badge}20`, color: typeStyle.badge }}
                >
                    {subject.subject_type}
                </span>
            </div>

            {/* Subject Info */}
            <div className="subject-info">
                <h3 className="subject-name">{subject.name}</h3>
                <div className="subject-code">
                    <CodeIcon />
                    <span>{subject.code}</span>
                </div>
            </div>

            {/* Subject Meta */}
            <div className="subject-meta">
                <div className="meta-item">
                    <CreditIcon />
                    <span>{subject.credits} Credits</span>
                </div>
                {subject.criteria_count > 0 && (
                    <div className="meta-item">
                        <span className="criteria-badge">{subject.criteria_count} Components</span>
                    </div>
                )}
            </div>

            {/* Action Button */}
            <button className="subject-action">
                View Details
            </button>
        </div>
    )
}

export default SubjectCard
