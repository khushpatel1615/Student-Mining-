import React, { useState } from 'react';
import {
    BookOpen,
    MoreVertical,
    ChevronDown,
    Check,
    Hash,
    Calendar,
    Eye,
    Edit3,
    UserMinus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * StudentEnrollmentCard - Redesigned for Admin Dashboard
 * 
 * @param {Object} props
 * @param {Object} props.student - { name, enrollmentId, subjects, academicYear, status, department, enrolledOn }
 * @param {Boolean} props.selected - Bulk selection state
 * @param {Function} props.onSelect - Toggle selection
 * @param {Function} props.onAction - Action menu callback (type, student)
 */
const StudentEnrollmentCard = ({
    student,
    selected = false,
    onSelect = () => { },
    onAction = () => { }
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Dynamic styles based on status
    const statusConfig = {
        active: { color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-500' },
        pending: { color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-500' },
        inactive: { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-500' }
    };

    const currentStatus = student.status?.toLowerCase() || 'active';
    const config = statusConfig[currentStatus] || statusConfig.active;

    const getInitials = (name) => {
        return name
            ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : '??';
    };

    return (
        <div className={`
            relative group mb-4 bg-white border border-slate-200 rounded-[12px] 
            transition-all duration-300 ease-in-out
            hover:shadow-lg hover:-translate-y-1 overflow-hidden
            ${selected ? 'ring-2 ring-primary-DEFAULT border-transparent' : ''}
        `}>
            {/* Status Accent Left Border */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.color}`} />

            <div className="flex items-center p-4">
                {/* 1. Bulk Selection Checkbox */}
                <div className="flex-shrink-0 mr-4">
                    <button
                        onClick={() => onSelect(!selected)}
                        className={`
                            w-5 h-5 rounded border flex items-center justify-center transition-colors
                            ${selected ? 'bg-primary-DEFAULT border-primary-DEFAULT' : 'border-slate-300 hover:border-primary-DEFAULT'}
                        `}
                    >
                        {selected && <Check size={14} className="text-white" />}
                    </button>
                </div>

                {/* 2. Left Section: Avatar & Identity */}
                <div className="flex items-center space-x-4 min-w-[250px]">
                    <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-primary-DEFAULT font-bold text-lg">
                        {getInitials(student.name)}
                    </div>
                    <div>
                        <h3 className="text-slate-900 font-bold text-base leading-tight">
                            {student.name}
                        </h3>
                        <p className="text-slate-500 text-xs font-medium mt-0.5">
                            {student.department || 'General Computer Engineering'}
                        </p>
                    </div>
                </div>

                {/* 3. Middle Section: Key-Value Pairs */}
                <div className="flex-grow flex items-center justify-between px-8 space-x-8">
                    {/* Enrollment ID */}
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                            Enrollment ID
                        </span>
                        <span className="font-mono text-sm text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {student.enrollmentId || 'N/A'}
                        </span>
                    </div>

                    {/* Subjects Pill */}
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                            Subjects
                        </span>
                        <div className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">
                            <BookOpen size={14} className="text-slate-500" />
                            <span>{student.subjects?.length || 0} Subjects</span>
                        </div>
                    </div>

                    {/* Academic Year */}
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                            Academic Year
                        </span>
                        <div className="flex items-center space-x-1.5 text-slate-700 font-medium text-sm">
                            <Calendar size={14} className="text-slate-400" />
                            <span>{student.academicYear || '2024-25'}</span>
                        </div>
                    </div>
                </div>

                {/* 4. Right Section: Status & Actions */}
                <div className="flex items-center space-x-3 ml-auto">
                    {/* Status Badge */}
                    <span className={`
                        px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider
                        ${config.bg} ${config.text} border ${config.border.replace('border-', 'border-opacity-30 border-')}
                    `}>
                        {student.status || 'Active'}
                    </span>

                    {/* Action Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <MoreVertical size={18} />
                        </button>

                        <AnimatePresence>
                            {isMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-20 py-1"
                                    >
                                        <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2">
                                            <Eye size={14} /> <span>View Profile</span>
                                        </button>
                                        <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2">
                                            <Edit3 size={14} /> <span>Edit</span>
                                        </button>
                                        <div className="h-px bg-slate-100 my-1" />
                                        <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2">
                                            <UserMinus size={14} /> <span>Unenroll</span>
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Expand Chevron */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`
                            p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition-transform duration-300
                            ${isExpanded ? 'rotate-180 bg-slate-50 text-primary-DEFAULT' : ''}
                        `}
                    >
                        <ChevronDown size={20} />
                    </button>
                </div>
            </div>

            {/* Subtle Timestamp */}
            <div className="absolute bottom-1 right-3">
                <p className="text-[10px] text-slate-300 font-medium">
                    Enrolled on {student.enrolledOn || 'Oct 24, 2024'}
                </p>
            </div>

            {/* Collapsible Section: Subjects */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden bg-slate-50 border-t border-slate-100"
                    >
                        <div className="p-4 pt-3 flex flex-wrap gap-2">
                            {student.subjects?.map((sub, idx) => (
                                <span
                                    key={idx}
                                    className="bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-md text-xs font-medium shadow-sm"
                                >
                                    {typeof sub === 'string' ? sub : sub.subject_name || sub.name}
                                </span>
                            )) || (
                                    <p className="text-xs text-slate-400 italic">No subjects enrolled</p>
                                )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudentEnrollmentCard;
