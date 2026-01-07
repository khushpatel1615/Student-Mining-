import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Upload, FileText, CheckCircle, AlertCircle, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'
import './CSVImport.css'

const API_BASE = 'http://localhost/StudentDataMining/backend/api'

function CSVImport({ onClose, onSuccess }) {
    const { token } = useAuth()
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState(null)
    const fileInputRef = useRef(null)

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile && selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile)
            setResult(null)
        } else {
            toast.error('Please select a CSV file')
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && droppedFile.name.endsWith('.csv')) {
            setFile(droppedFile)
            setResult(null)
        } else {
            toast.error('Please drop a CSV file')
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
    }

    const handleUpload = async () => {
        if (!file) {
            toast.error('Please select a file first')
            return
        }

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch(`${API_BASE}/import/grades.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            const data = await response.json()

            if (data.success) {
                setResult(data.stats)
                toast.success(`Successfully imported ${data.stats.successful} grades`)
                if (onSuccess) onSuccess()
            } else {
                toast.error(data.error || 'Upload failed')
            }
        } catch (err) {
            toast.error('Failed to upload file')
        } finally {
            setUploading(false)
        }
    }

    const downloadTemplate = () => {
        const template = 'student_id,subject_code,grade,assessment_type\n9019724,CS101,85,final\n9087102,CS101,92,final\n'
        const blob = new Blob([template], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'grade_import_template.csv'
        a.click()
        window.URL.revokeObjectURL(url)
    }

    return (
        <div className="csv-import-modal">
            <div className="modal-overlay" onClick={onClose}></div>
            <div className="modal-content">
                <div className="modal-header">
                    <div>
                        <h2>Import Grades</h2>
                        <p>Upload a CSV file to bulk import student grades</p>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    {!result ? (
                        <>
                            {/* Upload Area */}
                            <div
                                className="upload-area"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={48} />
                                <h3>Drag and drop CSV file here</h3>
                                <p>or click to browse</p>
                                {file && (
                                    <div className="selected-file">
                                        <FileText size={20} />
                                        <span>{file.name}</span>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {/* Template Download */}
                            <div className="template-section">
                                <h4>CSV Format</h4>
                                <p>Your CSV file should have these columns:</p>
                                <div className="columns-info">
                                    <span className="column-tag">student_id</span>
                                    <span className="column-tag">subject_code</span>
                                    <span className="column-tag">grade</span>
                                    <span className="column-tag">assessment_type</span>
                                </div>
                                <button className="template-btn" onClick={downloadTemplate}>
                                    <Download size={20} />
                                    Download Template
                                </button>
                            </div>

                            {/* Upload Button */}
                            <div className="modal-actions">
                                <button
                                    className="upload-btn"
                                    onClick={handleUpload}
                                    disabled={!file || uploading}
                                >
                                    {uploading ? 'Uploading...' : 'Upload Grades'}
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Results */
                        <div className="import-results">
                            <div className={`result-icon ${result.failed === 0 ? 'success' : 'warning'}`}>
                                {result.failed === 0 ? (
                                    <CheckCircle size={64} />
                                ) : (
                                    <AlertCircle size={64} />
                                )}
                            </div>
                            <h3>Import Complete</h3>
                            <div className="result-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Total Rows</span>
                                    <span className="stat-value">{result.total_rows}</span>
                                </div>
                                <div className="stat-item success">
                                    <span className="stat-label">Successful</span>
                                    <span className="stat-value">{result.successful}</span>
                                </div>
                                <div className="stat-item error">
                                    <span className="stat-label">Failed</span>
                                    <span className="stat-value">{result.failed}</span>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button className="primary-btn" onClick={onClose}>
                                    Done
                                </button>
                                <button
                                    className="secondary-btn"
                                    onClick={() => {
                                        setFile(null)
                                        setResult(null)
                                    }}
                                >
                                    Import Another File
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CSVImport
