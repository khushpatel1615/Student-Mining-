import React, { useState, useEffect } from 'react';
import { Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
} from 'chart.js';
import { useAuth } from '../../../context/AuthContext';
import { Brain, TrendingUp, Sparkles, Target } from 'lucide-react';
import './StudentSkills.css';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

const API_BASE = 'http://localhost/StudentDataMining/backend/api';

const StudentSkills = () => {
    const { token } = useAuth();
    const [skillsData, setSkillsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSkills();
    }, []);

    const fetchSkills = async () => {
        try {
            const res = await fetch(`${API_BASE}/skills.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSkillsData(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="skills-loading">Mining your competencies...</div>;
    if (!skillsData) return <div className="skills-error">Unable to load skills profile.</div>;

    const chartData = {
        labels: skillsData.labels,
        datasets: [
            {
                label: ' competency Score',
                data: skillsData.values,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                borderWidth: 2,
                pointBackgroundColor: '#4f46e5',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#4f46e5'
            }
        ]
    };

    const chartOptions = {
        scales: {
            r: {
                angleLines: { color: 'rgba(0,0,0,0.1)' },
                grid: { color: 'rgba(0,0,0,0.1)' },
                pointLabels: {
                    font: { size: 12, weight: '600' },
                    color: '#374151'
                },
                ticks: { backdropColor: 'transparent', z: 1 }
            }
        },
        plugins: {
            legend: { display: false }
        },
        maintainAspectRatio: false
    };

    // Analysis
    const maxVal = Math.max(...skillsData.values);
    const maxIndex = skillsData.values.indexOf(maxVal);
    const topSkill = skillsData.labels[maxIndex];

    const minVal = Math.min(...skillsData.values);
    const minIndex = skillsData.values.indexOf(minVal);
    const weakSkill = skillsData.labels[minIndex];

    return (
        <div className="skills-container">
            <div className="skills-header">
                <div className="header-icon">
                    <Brain size={28} />
                </div>
                <div>
                    <h1>Competency Map</h1>
                    <p>AI-mined analysis of your academic strengths</p>
                </div>
            </div>

            <div className="skills-content-grid">
                {/* Chart Section */}
                <div className="skills-card chart-card">
                    <h3>Skill Radar</h3>
                    <div className="radar-container">
                        <Radar data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* Insights Section */}
                <div className="skills-insights">
                    <div className="insight-card highlight">
                        <div className="insight-icon custom-blue">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h4>Top Strength</h4>
                            <div className="insight-value">{topSkill}</div>
                            <p className="insight-desc">You show exceptional performance in subjects related to {topSkill}.</p>
                        </div>
                    </div>

                    <div className="insight-card">
                        <div className="insight-icon custom-orange">
                            <Target size={20} />
                        </div>
                        <div>
                            <h4>Area for Growth</h4>
                            <div className="insight-value">{weakSkill}</div>
                            <p className="insight-desc">
                                Considering taking more electives in this area to balance your profile.
                            </p>
                        </div>
                    </div>

                    <div className="insight-card">
                        <div className="insight-icon custom-green">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h4>Market Relevance</h4>
                            <div className="insight-value">High</div>
                            <p className="insight-desc">
                                Your score in {topSkill} aligns with top industry demands for Data Analysts.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentSkills;
