export const getGPATrendChart = (semesterTrends) => {
    if (!semesterTrends?.length) return null
    return {
        labels: semesterTrends.map(s => `Sem ${s.semester}`),
        datasets: [{
            label: 'Average GPA',
            data: semesterTrends.map(s => s.average_gpa),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5
        }]
    }
}

export const getPerformanceChart = (performanceData) => {
    if (!performanceData) return null
    return {
        labels: ['Excellent', 'Good', 'Average', 'Below Avg', 'At Risk'],
        datasets: [{
            data: [
                performanceData.excellent || 0,
                performanceData.good || 0,
                performanceData.average || 0,
                performanceData.below_average || 0,
                performanceData.at_risk || 0
            ],
            backgroundColor: [
                '#10b981',
                '#3b82f6',
                '#f59e0b',
                '#f97316',
                '#ef4444'
            ],
            borderWidth: 0,
            cutout: '70%'
        }]
    }
}

export const getAttendanceChart = () => {
    return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [{
            label: 'Attendance %',
            data: [92, 95, 94, 88, 85],
            backgroundColor: '#3b82f6',
            borderRadius: 4
        }]
    }
}
