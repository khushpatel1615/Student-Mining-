import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { useAuth } from '../../context/AuthContext';
import { Users, TrendingUp, Award, AlertCircle } from 'lucide-react';
import './CohortBenchmarking.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const API_BASE = 'http://localhost/StudentDataMining/backend/api';

const CohortBenchmarking = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBenchmarks();
    }, []);

    const fetchBenchmarks = async () => {
        try {
            const res = await fetch(`${API_BASE}/analytics/benchmarking.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                setStats(data.data);
            }
        } catch (err) {
            console.error("Benchmarking Error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="benchmarking-card loading">
            <div className="shimmer-line"></div>
            <div className="shimmer-line short"></div>
        </div>
    );

    if (!stats) return null;

    const { metrics, cohort_size } = stats;

    const gpaData = {
        labels: ['You', 'Class Avg', 'Top 10%'],
        datasets: [
            {
                label: 'GPA',
                data: [metrics.gpa.you, metrics.gpa.avg, metrics.gpa.top],
                backgroundColor: [
                    '#6366f1', // You (Primary)
                    '#e2e8f0', // Avg (Gray)
                    '#10b981'  // Top (Green)
                ],
                borderRadius: 8,
                barThickness: 40,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 14, weight: 'bold' }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 4.0,
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            x: {
                grid: { display: false }
            }
        }
    };

    // Analysis Text
    const diff = metrics.gpa.you - metrics.gpa.avg;
    const isAboveAvg = diff >= 0;

    return (
        <div className="benchmarking-card">
            <div className="bench-header">
                <div className="bench-title">
                    <Users size={20} className="icon-blue" />
                    <h3>Cohort Comparison</h3>
                </div>
                <div className="cohort-badge">
                    {cohort_size} Students
                </div>
            </div>

            <div className="bench-content">
                <div className="chart-wrapper">
                    <Bar data={gpaData} options={options} />
                </div>

                <div className="bench-insight">
                    {cohort_size > 1 ? (
                        <>
                            <div className={`insight-pill ${isAboveAvg ? 'positive' : 'negative'}`}>
                                {isAboveAvg ? <TrendingUp size={16} /> : <AlertCircle size={16} />}
                                <span>
                                    {isAboveAvg ? '+' : ''}{diff.toFixed(2)} GPA
                                </span>
                            </div>
                            <p className="insight-text">
                                {isAboveAvg
                                    ? "You're performing above the class average. Keep it up!"
                                    : "You're slightly below average. Check the Recommender for help."}
                            </p>
                        </>
                    ) : (
                        <p className="insight-text text-center">
                            You are the first student in this cohort!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CohortBenchmarking;
