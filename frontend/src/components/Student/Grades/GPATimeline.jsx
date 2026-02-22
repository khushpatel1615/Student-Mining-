import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { TrendingUp, Info } from 'lucide-react';
import { analyticsService } from '../../../services/analyticsService';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const semData = payload[0].payload;
        return (
            <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl text-sm z-50">
                <p className="font-bold text-white mb-2">{label}</p>
                <div className="space-y-1">
                    <p className="text-indigo-400">Semester GPA: <span className="font-medium text-white">{semData.semester_gpa.toFixed(2)}</span></p>
                    <p className="text-emerald-400">Cumulative GPA: <span className="font-medium text-white">{semData.cumulative_gpa.toFixed(2)}</span></p>
                    <div className="border-t border-slate-700 my-1 pt-1">
                        <p className="text-slate-400">Credits Completed: {semData.credits}</p>
                        <p className="text-slate-400">Subjects: {semData.subjects}</p>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const GPATimeline = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const { data: res, error: err } = await analyticsService.fetchStudentGPAHistory();
        setLoading(false);
        if (err) setError(err);
        if (res) {
            // Map "Semester X" label for XAxis
            const formatted = res.map(d => ({
                ...d,
                name: `Semester ${d.semester}`
            }));
            setData(formatted);
        }
    };

    if (loading) return <div className="p-6 bg-slate-800/50 rounded-xl mb-6 text-slate-400 animate-pulse">Loading GPA timeline...</div>;
    if (error) return <div className="p-6 bg-red-500/10 rounded-xl mb-6 text-red-400">Error: {error}</div>;

    if (data.length === 0) {
        return (
            <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-xl mb-6 text-center animate-fade-in">
                <TrendingUp className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Your GPA timeline will appear after your first semester grades are finalized.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-slate-800 border border-slate-700 rounded-xl mb-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Academic GPA Timeline</h3>
            </div>

            {data.length === 1 && (
                <div className="mb-4 p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>More semesters will appear as you progress.</p>
                </div>
            )}

            {/* Chart container responsive height */}
            <div className="w-full h-[200px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={12}
                            tickMargin={10}
                            tickLine={false}
                            axisLine={{ stroke: '#334155' }}
                        />
                        <YAxis
                            domain={[0, 4]}
                            ticks={[0, 1, 2, 3, 4]}
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={35}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '10px' }}
                        />
                        {/* References */}
                        <ReferenceLine y={2.0} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Min GPA Requirement', fill: '#ef4444', fontSize: 11, className: "hidden md:block" }} />
                        <ReferenceLine y={3.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Good Standing', fill: '#f59e0b', fontSize: 11, className: "hidden md:block" }} />

                        {/* Lines */}
                        <Line
                            type="monotone"
                            dataKey="semester_gpa"
                            name="Semester GPA"
                            stroke="#6366f1"
                            strokeWidth={2}
                            activeDot={{ r: 6, fill: '#6366f1' }}
                            dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="cumulative_gpa"
                            name="Cumulative GPA"
                            stroke="#10b981"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            activeDot={{ r: 6, fill: '#10b981' }}
                            dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default GPATimeline;
