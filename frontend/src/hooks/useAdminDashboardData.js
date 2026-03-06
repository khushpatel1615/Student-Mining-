import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';

export const useAdminDashboardData = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Dashboard Data States
    const [systemStats, setSystemStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalPrograms: 0,
        totalSubjects: 0,
        averageGPA: 0,
        attendanceRate: 0,
        atRiskCount: 0,
        engagementScore: 0,
        passRate: 0,
        pendingActions: 0
    });

    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [topStudents, setTopStudents] = useState([]);
    const [atRiskStudents, setAtRiskStudents] = useState([]);
    const [performanceData, setPerformanceData] = useState(null);
    const [semesterTrends, setSemesterTrends] = useState([]);
    const [programStats, setProgramStats] = useState([]);

    const fetchDashboardData = useCallback(async () => {
        if (!token) return;

        setRefreshing(true);
        setError(null);

        try {
            // Parallel fetch using apiClient for centralized error handling
            const [analyticsRes, eventsRes, notifRes] = await Promise.allSettled([
                apiClient.get('/analytics/admin.php'),
                apiClient.get('/calendar.php'),
                apiClient.get('/notifications.php', { limit: 8 })
            ]);

            let activeAlerts = [];

            // Process Analytics
            if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
                const analyticsData = analyticsRes.value;
                if (analyticsData.success) {
                    const {
                        system_overview = {},
                        performance_distribution = {},
                        at_risk_students = [],
                        program_analytics = [],
                        semester_trends = [],
                        subject_difficulty = []
                    } = analyticsData.data || {};

                    setSystemStats(prev => ({
                        ...prev,
                        totalStudents: system_overview?.total_students || 0,
                        totalPrograms: system_overview?.total_programs || 0,
                        totalSubjects: system_overview?.total_subjects || 0,
                        totalTeachers: system_overview?.total_teachers || 0,
                        averageGPA: Number(system_overview?.system_gpa || 0),
                        passRate: Number(system_overview?.pass_rate || 0),
                        atRiskCount: at_risk_students?.length || 0,
                        engagementScore: Number(system_overview?.engagement_score || 0),
                        pendingActions: Number(system_overview?.pending_actions || 0)
                    }));

                    setPerformanceData(performance_distribution);
                    setSemesterTrends(semester_trends || []);
                    setProgramStats(program_analytics || []);
                    setTopStudents(at_risk_students?.slice(0, 5) || []);
                    setAtRiskStudents(at_risk_students || []);

                    // Generate Alerts Logic
                    try {
                        if (at_risk_students?.length > 0) {
                            activeAlerts.push({
                                id: 1,
                                type: 'warning',
                                title: `${at_risk_students.length} students need attention`,
                                description: 'Students with GPA below 2.0 require intervention',
                                actionPath: '/admin/dashboard?tab=students&filter=at-risk'
                            });
                        }

                        if (subject_difficulty?.length > 0) {
                            const hardestSubject = subject_difficulty[0];
                            const avgGrade = Number(hardestSubject?.average_grade || 0);
                            activeAlerts.push({
                                id: 2,
                                type: 'info',
                                title: `${hardestSubject?.name || 'Subject'} has lowest average`,
                                description: `Average grade: ${avgGrade.toFixed(1)}% - Consider additional support`,
                                actionPath: '/admin/dashboard?tab=subjects'
                            });
                        }

                        if (program_analytics?.length > 0) {
                            const topProgram = program_analytics.reduce((a, b) =>
                                Number(a?.pass_rate || 0) > Number(b?.pass_rate || 0) ? a : b
                                , program_analytics[0]);

                            if (topProgram) {
                                const passRate = Number(topProgram.pass_rate || 0);
                                activeAlerts.push({
                                    id: 3,
                                    type: 'success',
                                    title: `${topProgram.name || 'Program'} leads with ${passRate.toFixed(1)}% pass rate`,
                                    description: 'Best performing program this semester',
                                    actionPath: '/admin/dashboard?tab=programs'
                                });
                            }
                        }
                    } catch {
                        // Error generating alerts — non-critical
                    }
                    setAlerts(activeAlerts);
                }
            }

            // Process Events
            const today = new Date();
            if (eventsRes.status === 'fulfilled' && eventsRes.value) {
                const eventsData = eventsRes.value;
                if (eventsData.success && Array.isArray(eventsData.data)) {
                    const upcoming = eventsData.data
                        .filter(e => e && new Date(e.event_date) >= today)
                        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                        .slice(0, 5);
                    setUpcomingEvents(upcoming);
                }
            } else {
                setUpcomingEvents([]);
            }

            // Process Notifications
            if (notifRes.status === 'fulfilled' && notifRes.value) {
                const notifData = notifRes.value;
                if (notifData.success) {
                    setRecentActivity(Array.isArray(notifData.data?.notifications) ? notifData.data.notifications : []);
                }
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchDashboardData();
        // Auto-refresh every 5 minutes so admin dashboard stats stay live
        const interval = setInterval(() => fetchDashboardData(), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    return {
        loading,
        refreshing,
        error,
        systemStats,
        upcomingEvents,
        recentActivity,
        alerts,
        topStudents,
        atRiskStudents,
        performanceData,
        semesterTrends,
        programStats,
        fetchDashboardData
    };
};
