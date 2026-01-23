import React from 'react';
import { FileText, Mail, Calendar, Calculator, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const QuickActions = ({ setActiveTab }) => {
    const actions = [
        {
            icon: FileText,
            color: 'bg-blue-100 text-blue-600',
            title: 'Request Transcript',
            desc: 'Download PDF',
            action: () => setActiveTab('reports')
        },
        {
            icon: Mail,
            color: 'bg-purple-100 text-purple-600',
            title: 'Contact Advisor',
            desc: 'Send Email',
            action: () => window.location.href = 'mailto:advisor@university.edu'
        },
        {
            icon: Calendar,
            color: 'bg-green-100 text-green-600',
            title: 'Study Planner',
            desc: 'View Schedule',
            action: () => setActiveTab('schedule')
        },
        {
            icon: Calculator,
            color: 'bg-orange-100 text-orange-600',
            title: 'GPA Calculator',
            desc: 'Estimate Grades',
            action: () => setActiveTab('grades')
        }
    ];

    return (
        <div className="card h-full">
            <h3>Quick Actions</h3>
            <div className="grid gap-3">
                {actions.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <motion.button
                            key={index}
                            className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-colors w-full text-left border border-transparent hover:border-gray-100 group"
                            whileHover={{ x: 4 }}
                            onClick={item.action}
                            style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.75rem', border: '1px solid transparent', borderRadius: '12px', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            <div className={`p-3 rounded-lg mr-4 ${item.color}`} style={{ padding: '0.75rem', borderRadius: '8px', marginRight: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.color.includes('bg-blue') ? '#dbeafe' : item.color.includes('bg-purple') ? '#f3e8ff' : item.color.includes('bg-green') ? '#dcfce7' : '#ffedd5', color: item.color.includes('text-blue') ? '#2563eb' : item.color.includes('text-purple') ? '#9333ea' : item.color.includes('text-green') ? '#16a34a' : '#ea580c' }}>
                                <Icon size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold text-gray-800 text-sm" style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.9rem', marginBottom: '2px' }}>{item.title}</div>
                                <div className="text-xs text-gray-500" style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.desc}</div>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400" style={{ color: '#d1d5db' }} />
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default QuickActions;
