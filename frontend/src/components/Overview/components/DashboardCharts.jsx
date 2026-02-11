import React from 'react'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
    BarChart3,
    PieChart,
    Calendar,
    CheckCircle,
    AlertTriangle,
    Zap,
    Activity
} from 'lucide-react'

const DashboardCharts = ({ semesterTrends, performanceData }) => {
    // Chart configurations
    const getGPATrendChart = () => {
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

    const getPerformanceChart = () => {
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

    return (
        <div className="charts-row">
            {/* GPA Trend Chart */}
            <div className="chart-card">
                <div className="chart-header">
                    <h3><BarChart3 size={18} /> GPA Trend</h3>
                    <span className="chart-subtitle">Last 8 semesters</span>
                </div>
                <div className="chart-body">
                    {getGPATrendChart() ? (
                        <Line
                            data={getGPATrendChart()}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false }
                                },
                                scales: {
                                    y: {
                                        min: 0,
                                        max: 4,
                                        grid: { color: 'rgba(0,0,0,0.05)' }
                                    },
                                    x: {
                                        grid: { display: false }
                                    }
                                }
                            }}
                        />
                    ) : (
                        <div className="empty-state">
                            <BarChart3 size={32} />
                            <p>No GPA trend data</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Performance Distribution */}
            <div className="chart-card">
                <div className="chart-header">
                    <h3><PieChart size={18} /> Performance Distribution</h3>
                    <span className="chart-subtitle">Student grades breakdown</span>
                </div>
                <div className="chart-body doughnut-chart">
                    {getPerformanceChart() ? (
                        <Doughnut
                            data={getPerformanceChart()}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'right',
                                        labels: {
                                            padding: 15,
                                            usePointStyle: true,
                                            font: { size: 12 }
                                        }
                                    }
                                }
                            }}
                        />
                    ) : (
                        <div className="empty-state">
                            <PieChart size={32} />
                            <p>No performance data</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DashboardCharts
