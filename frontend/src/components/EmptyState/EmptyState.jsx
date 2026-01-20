import './EmptyState.css'

const EmptyState = ({
    icon: Icon,
    title = 'No Data',
    description = 'There is no data to display at this time.',
    actionText,
    onAction
}) => (
    <div className="empty-state-professional">
        <div className="empty-icon-container">
            {Icon && <Icon size={40} />}
        </div>
        <h3 className="empty-title">{title}</h3>
        <p className="empty-description">{description}</p>
        {actionText && onAction && (
            <button className="btn-add" onClick={onAction}>
                {actionText}
            </button>
        )}
    </div>
)

export default EmptyState
