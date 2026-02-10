import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, AlertTriangle, Calendar, Filter, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import './AdminAttendance.css';

// v2.0 - Modern UI Update

const AdminAttendance = () => {
    const { token } = useAuth();

    // Filters
    const [programs, setPrograms] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');

    // Data
    const [students, setStudents] = useState([]);
    const [pastDates, setPastDates] = useState([]);

    // Attendance State
    const [markingDate, setMarkingDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentAttendance, setCurrentAttendance] = useState({}); // student_id -> status

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Initial Load - Programs
    useEffect(() => {
        fetchPrograms();
    }, []);

    const fetchPrograms = async () => {
        try {
            const res = await fetch(`${API_BASE}/programs.php`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPrograms(data.data);
            }
        } catch (err) {
            toast.error("Failed to load programs");
        }
    };

    // Fetch Subjects when Program/Semester changes
    useEffect(() => {
        if (selectedProgram && selectedSemester) {
            fetchSubjects();
        } else {
            setSubjects([]);
        }
    }, [selectedProgram, selectedSemester]);

    const fetchSubjects = async () => {
        try {
            const res = await fetch(`${API_BASE}/subjects.php?program_id=${selectedProgram}&semester=${selectedSemester}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSubjects(data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Fetch Attendance Sheet when Subject Selected
    useEffect(() => {
        if (selectedSubject) {
            fetchAttendanceSheet();
        } else {
            setStudents([]);
            setPastDates([]);
            setCurrentAttendance({});
        }
    }, [selectedSubject, markingDate]);

    const fetchAttendanceSheet = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/attendance.php?action=fetch_sheet&subject_id=${selectedSubject}&date=${markingDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPastDates(data.data.dates);
                setStudents(data.data.students);
                setCurrentAttendance(data.data.current || {});
            }
        } catch (err) {
            toast.error("Failed to load attendance sheet");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setCurrentAttendance(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const markAll = (status) => {
        const newStatus = {};
        students.forEach(s => {
            newStatus[s.student_id] = status;
        });
        setCurrentAttendance(newStatus);
    };

    const handleSave = async () => {
        if (!selectedSubject || !markingDate) {
            toast.error("Please select subject and date");
            return;
        }

        // Validate
        const missing = students.filter(s => !currentAttendance[s.student_id]);
        if (missing.length > 0) {
            toast.error(`Please mark attendance for all students (${missing.length} remaining).`);
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/attendance.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'save_daily',
                    subject_id: selectedSubject,
                    date: markingDate,
                    records: currentAttendance
                })
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Attendance saved successfully");
                fetchAttendanceSheet(); // Refresh to show new column in history
            } else {
                toast.error(data.error || "Failed to save");
            }
        } catch (err) {
            toast.error("Connection failed");
        } finally {
            setSaving(false);
        }
    };

    // Helper for Program Semester Count
    const getSemesters = () => {
        const prog = programs.find(p => p.id == selectedProgram);
        if (!prog) return [];
        const count = prog.total_semesters || (prog.duration_years * 2) || 8;
        return Array.from({ length: count }, (_, i) => i + 1);
    };

    return (
        <div className="admin-attendance">
            <h2>Attendance Management</h2>

            <div className="filters-container">
                <div className="filters-section">
                    <div className="filter-group">
                        <label className="filter-label">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                <path d="M6 12v5c3 3 9 3 12 0v-5" />
                            </svg>
                            Program
                        </label>
                        <select
                            className="filter-select"
                            value={selectedProgram}
                            onChange={(e) => {
                                setSelectedProgram(e.target.value);
                                setSelectedSemester('');
                                setSelectedSubject('');
                            }}
                        >
                            <option value="">Select...</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            Semester
                        </label>
                        <select
                            className="filter-select"
                            value={selectedSemester}
                            onChange={(e) => {
                                setSelectedSemester(e.target.value);
                                setSelectedSubject('');
                            }}
                            disabled={!selectedProgram}
                        >
                            <option value="">Select...</option>
                            {getSemesters().map(s => (
                                <option key={s} value={s}>Semester {s}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                            Subject
                        </label>
                        <select
                            className="filter-select"
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            disabled={!selectedSemester}
                        >
                            <option value="">Select...</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">
                            <Calendar size={14} />
                            Marking Date
                        </label>
                        <input
                            type="date"
                            className="filter-select date-input"
                            value={markingDate}
                            onChange={(e) => setMarkingDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-state" style={{ textAlign: 'center', padding: '2rem' }}>
                    <Loader className="animate-spin" /> Loading Sheet...
                </div>
            ) : !selectedSubject ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', color: 'gray' }}>
                    <Filter size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Select a subject to view and mark attendance.</p>
                </div>
            ) : (
                <>
                    {/* Toolbar */}
                    <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div className="bulk-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="status-btn" onClick={() => markAll('P')} title="Mark All Present">
                                <CheckCircle size={16} color="#16a34a" /> All Present
                            </button>
                            <button className="status-btn" onClick={() => markAll('A')} title="Mark All Absent">
                                <XCircle size={16} color="#dc2626" /> All Absent
                            </button>
                        </div>
                    </div>

                    <div className="attendance-table-container">
                        <table className="attendance-table">
                            <thead>
                                <tr>
                                    <th>Student ID</th>
                                    <th>Name</th>
                                    {/* Show last 3 past dates for context */}
                                    {pastDates.slice(-3).map(d => (
                                        <th key={d} style={{ opacity: 0.6, fontSize: '0.8em' }}>{d}</th>
                                    ))}
                                    <th style={{ background: 'var(--bg-secondary)', borderLeft: '2px solid var(--primary)' }}>
                                        {markingDate} (Today)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => (
                                    <tr key={student.student_id}>
                                        <td>{student.student_id}</td>
                                        <td>{student.name}</td>

                                        {/* History */}
                                        {pastDates.slice(-3).map(d => (
                                            <td key={d} style={{ opacity: 0.6 }}>
                                                {student.attendance[d] === 'P' && <span style={{ color: 'green' }}>P</span>}
                                                {student.attendance[d] === 'A' && <span style={{ color: 'red' }}>A</span>}
                                                {student.attendance[d] === 'E' && <span style={{ color: 'orange' }}>E</span>}
                                                {(!student.attendance[d] || student.attendance[d] === '-') && '-'}
                                            </td>
                                        ))}

                                        {/* Marking Area */}
                                        <td style={{ borderLeft: '2px solid var(--primary-light)' }}>
                                            <div className="status-actions">
                                                <button
                                                    className={`status-btn present ${currentAttendance[student.student_id] === 'P' ? 'active' : ''}`}
                                                    onClick={() => handleStatusChange(student.student_id, 'P')}
                                                    title="Present"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button
                                                    className={`status-btn absent ${currentAttendance[student.student_id] === 'A' ? 'active' : ''}`}
                                                    onClick={() => handleStatusChange(student.student_id, 'A')}
                                                    title="Absent"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                                <button
                                                    className={`status-btn exception ${currentAttendance[student.student_id] === 'E' ? 'active' : ''}`}
                                                    onClick={() => handleStatusChange(student.student_id, 'E')}
                                                    title="Exception"
                                                >
                                                    <AlertTriangle size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="save-section">
                        <button className="btn-save" onClick={handleSave} disabled={saving}>
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Attendance'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminAttendance;
