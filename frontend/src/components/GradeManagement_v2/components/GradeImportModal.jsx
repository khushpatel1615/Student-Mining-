// ==========================================
// GRADEBOOK v2 — GradeImportModal
// Wraps the existing GradeImport component
// ==========================================
import { X } from 'lucide-react';
import GradeImport from '../../GradeManagement/GradeImport';

export default function GradeImportModal({ programId, subjectId, onClose }) {
    return (
        <div className="gmv2-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="gmv2-modal-box">
                <button className="gmv2-modal-close" onClick={onClose} aria-label="Close">
                    <X size={20} />
                </button>
                <GradeImport programId={programId} subjectId={subjectId} />
            </div>
        </div>
    );
}
