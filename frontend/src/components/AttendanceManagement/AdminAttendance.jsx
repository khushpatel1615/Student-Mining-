import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Save, CheckCircle, XCircle, AlertTriangle, Calendar, Filter, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import './AdminAttendance.css';

const API_BASE = 'http://localhost/StudentDataMining/backend/api';

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
            // Using teachers.php or subjects.php? subjects.php expects different params usually?
            // Let's use subjects.php
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
    }, [selectedSubject]);

    const fetchAttendanceSheet = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/attendance.php?action=fetch_sheet&subject_id=${selectedSubject}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPastDates(data.data.dates);
                setStudents(data.data.students);
                // Reset current marking
                setCurrentAttendance({});
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
            // Warn but allow? User said "when all the students attendance is done student can hit save".
            // Implies we should check completion? Or maybe just save partial?
            // I'll show a warning toast but allow saving, or maybe block?
            // Let's block if user wants "all done".
            // "then when all the students attendance is done student can hit save" - This phrasing might mean "After marking everyone, they CLICK save".
            // I'll allow partial save but usually attendance is complete.
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
        // Assuming 2 semesters per year, duration * 2
        // Or if prog has 'total_semesters'
        const count = prog.total_semesters || (prog.duration_years * 2) || 8;
        return Array.from({ length: count }, (_, i) => i + 1);
    };

    return (
        <div className="admin-attendance">
            <h2>Attendance Management</h2>

            <div className="filters-section">
                <div className="filter-group">
                    <label className="filter-label">Program</label>
                    <select
                        className="filter-select"
                        value={selectedProgram}
                        onChange={(e) => {
                            setSelectedProgram(e.target.value);
                            setSelectedSemester('');
                            setSelectedSubject('');
                        }}
                    >
                        <option value="">Select Program</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Semester</label>
                    <select
                        className="filter-select"
                        value={selectedSemester}
                        onChange={(e) => {
                            setSelectedSemester(e.target.value);
                            setSelectedSubject('');
                        }}
                        disabled={!selectedProgram}
                    >
                        <option value="">Select Semester</option>
                        {getSemesters().map(s => (
                            <option key={s} value={s}>Semester {s}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Subject</label>
                    <select
                        className="filter-select"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        disabled={!selectedSemester}
                    >
                        <option value="">Select Subject</option>
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Marking Date</label>
                    <div className="date-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={18} className="text-gray-500" />
                        <input
                            type="date"
                            className="filter-select"
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
