import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Download, XCircle, ArrowRight } from 'lucide-react';
import { importService } from '../../services/importService';
import * as gradeService from '../../services/gradeService';

const GradeImport = ({ programId, subjectId }) => {
    const [step, setStep] = useState(1);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(subjectId || '');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Validation state
    const [report, setReport] = useState(null);
    const [activeTab, setActiveTab] = useState('ready');

    // Success state
    const [successData, setSuccessData] = useState(null);

    useEffect(() => {
        if (programId) {
            loadSubjects(programId);
        }
    }, [programId]);

    useEffect(() => {
        if (subjectId && subjectId !== 'all') {
            setSelectedSubject(subjectId);
        }
    }, [subjectId]);

    const loadSubjects = async (pid) => {
        // Assuming gradeService.fetchGradeData returns subjects/enrollments
        const { data, error } = await gradeService.fetchGradeData(pid);
        if (data?.subjects) {
            setSubjects(data.subjects);
        }
    };

    const handleDownloadTemplate = async () => {
        if (!selectedSubject) return;
        const { data } = await gradeService.fetchGradeData(null, selectedSubject);
        if (data?.criteria) {
            importService.downloadTemplate(selectedSubject, data.criteria);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            if (f.name.endsWith('.csv')) {
                setFile(f);
                setError(null);
            } else {
                setError('Only .csv files are supported.');
                setFile(null);
            }
        }
    };

    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const f = e.dataTransfer.files[0];
            if (f.name.endsWith('.csv')) {
                setFile(f);
                setError(null);
            } else {
                setError('Only .csv files are supported.');
            }
        }
    };

    const handleValidate = async () => {
        if (!selectedSubject || !file) return;
        setLoading(true);
        setError(null);
        const { data, error: err } = await importService.validateCSV(selectedSubject, file);
        setLoading(false);

        if (err) {
            setError(err);
        } else if (data) {
            setReport(data);
            setStep(2);
            setActiveTab('ready');
        }
    };

    const handleApply = async () => {
        if (!report?.import_job_id) return;
        setLoading(true);
        setError(null);
        const { data, error: err } = await importService.applyImport(report.import_job_id);
        setLoading(false);

        if (err) {
            setError(err);
        } else if (data) {
            setSuccessData(data);
            setStep(3);
        }
    };

    const resetWizard = () => {
        setStep(1);
        setFile(null);
        setReport(null);
        setSuccessData(null);
        setSelectedSubject('');
    };

    return (
        <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-6">Bulk Grade Import</h2>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg flex items-center gap-3 mb-6">
                    <AlertTriangle className="h-5 w-5" />
                    <p>{error}</p>
                </div>
            )}

            {/* STEP 1: UPLOAD */}
            {step === 1 && (
                <div className="grid gap-6 max-w-2xl mx-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full bg-slate-800 border-slate-700 rounded-lg text-white"
                        >
                            <option value="">Select a Subject...</option>
                            {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedSubject && (
                        <div className="flex justify-end">
                            <button
                                onClick={handleDownloadTemplate}
                                className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" /> Download CSV Template
                            </button>
                        </div>
                    )}

                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        {file ? (
                            <div className="flex flex-col items-center gap-3">
                                <FileText className="h-10 w-10 text-indigo-400" />
                                <p className="text-white font-medium">{file.name}</p>
                                <button onClick={() => setFile(null)} className="text-sm text-slate-400 hover:text-white">
                                    Remove File
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <UploadCloud className="h-10 w-10 text-slate-400" />
                                <p className="text-slate-300">Drag and drop your CSV file here</p>
                                <p className="text-sm text-slate-500">or</p>
                                <label className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer transition-colors">
                                    Browse Files
                                    <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleValidate}
                            disabled={!file || !selectedSubject || loading}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2"
                        >
                            {loading ? 'Validating...' : 'Validate CSV'}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: PREVIEW */}
            {step === 2 && report && (
                <div className="animate-fade-in">
                    <div className="flex items-center gap-6 p-4 bg-slate-800 rounded-lg mb-6 text-sm">
                        <span className="flex items-center gap-2 font-medium text-emerald-400">
                            <CheckCircle className="h-5 w-5" /> {report.valid_rows} rows ready to import
                        </span>
                        <span className="flex items-center gap-2 font-medium text-red-400">
                            <AlertTriangle className="h-5 w-5" /> {report.error_rows} rows have errors
                        </span>
                        <span className="flex items-center gap-2 text-slate-400 ml-auto border-l border-slate-700 pl-6">
                            <FileText className="h-5 w-5" /> {report.total_rows} total
                        </span>
                    </div>

                    {report.error_rows > 0 && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-400 font-medium">Error rows will be skipped.</p>
                                <p className="text-sm text-red-300/80 mt-1">Fix your CSV and re-upload to include them, or proceed to apply only the valid rows.</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                        <div className="flex border-b border-slate-700 bg-slate-800/50">
                            <button
                                onClick={() => setActiveTab('ready')}
                                className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'ready' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-400/5' : 'text-slate-400 hover:text-slate-300'}`}
                            >
                                Ready to Import ({report.valid_rows})
                            </button>
                            <button
                                onClick={() => setActiveTab('errors')}
                                className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'errors' ? 'text-red-400 border-b-2 border-red-400 bg-red-400/5' : 'text-slate-400 hover:text-slate-300'}`}
                            >
                                Errors ({report.error_rows})
                            </button>
                        </div>

                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/50 text-slate-400 sticky top-0 z-10 hidden md:table-header-group">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Student</th>
                                        {activeTab === 'ready' ? (
                                            <th className="px-6 py-3 font-medium">Grades</th>
                                        ) : (
                                            <th className="px-6 py-3 font-medium">Error Details</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {report.rows.filter(r => (activeTab === 'ready' ? r.status === 'valid' : r.status === 'error')).map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-700/50 flex flex-col md:table-row p-4 md:p-0">
                                            <td className="md:px-6 md:py-4">
                                                <div className="font-medium text-slate-200">{row.student_name}</div>
                                                <div className="text-xs text-slate-500 mt-1 font-mono">{row.student_id}</div>
                                            </td>
                                            <td className="md:px-6 md:py-4 mt-2 md:mt-0">
                                                {activeTab === 'ready' ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(row.grades).map(([comp, val]) => (
                                                            <span key={comp} className="px-2 py-1 rounded bg-slate-900 border border-slate-600 text-xs text-slate-300">
                                                                {comp}: <strong className="text-white">{val}</strong>
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <ul className="list-disc list-inside text-xs text-red-400 space-y-1">
                                                        {row.errors.map((err, j) => <li key={j}>{err}</li>)}
                                                    </ul>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {report.rows.filter(r => (activeTab === 'ready' ? r.status === 'valid' : r.status === 'error')).length === 0 && (
                                        <tr>
                                            <td colSpan="2" className="px-6 py-8 text-center text-slate-500 italic">
                                                No {activeTab === 'ready' ? 'valid' : 'error'} rows found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mt-6">
                        <button
                            onClick={() => setStep(1)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={loading || report.valid_rows === 0}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Applying...' : `Apply Import (${report.valid_rows} students)`}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: SUCCESS */}
            {step === 3 && successData && (
                <div className="max-w-md mx-auto text-center py-12 animate-fade-in">
                    <div className="h-16 w-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shrink-0">
                        <CheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Import Complete</h3>
                    <p className="text-slate-400 mb-6">
                        ✅ {successData.applied} grades imported successfully for {successData.subject_name}.
                    </p>
                    {successData.skipped > 0 && (
                        <div className="bg-slate-800 p-4 rounded-lg mb-6 text-sm text-slate-300 text-left border border-slate-700">
                            ⏭️ {successData.skipped} rows were skipped due to validation errors.
                            <br />
                            Grade calculations and student analytics have been automatically updated.
                        </div>
                    )}

                    <button
                        onClick={resetWizard}
                        className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            )}
        </div>
    );
};

export default GradeImport;
