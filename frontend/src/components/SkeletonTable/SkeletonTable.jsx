import './SkeletonTable.css'

const SkeletonTable = ({ rows = 5, columns = 5 }) => {
    return (
        <div className="skeleton-table-wrapper">
            <table className="skeleton-table">
                <thead>
                    <tr>
                        {Array(columns).fill(0).map((_, i) => (
                            <th key={i}><div className="skeleton-line shimmer"></div></th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array(rows).fill(0).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {Array(columns).fill(0).map((_, colIndex) => (
                                <td key={colIndex}>
                                    <div className={`skeleton-line shimmer ${colIndex === 0 ? 'lead' : ''}`}></div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default SkeletonTable
