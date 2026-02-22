import './SkeletonCard.css'

const SkeletonCard = () => (
    <div className="subject-card skeleton-card">
        <div className="skeleton-gradient"></div>
        <div className="skeleton-content">
            <div className="skeleton-icon shimmer"></div>
            <div className="skeleton-header">
                <div className="skeleton-title shimmer"></div>
                <div className="skeleton-code shimmer"></div>
            </div>
            <div className="skeleton-metrics">
                <div className="skeleton-metric shimmer"></div>
                <div className="skeleton-metric shimmer"></div>
                <div className="skeleton-metric shimmer"></div>
            </div>
            <div className="skeleton-progress shimmer"></div>
        </div>
    </div>
)

export default SkeletonCard
