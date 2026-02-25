import React from 'react'
import { FileText, Mail, Calendar, Calculator, ChevronRight, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const QuickActionsRedesigned = ({ setActiveTab }) => {
    const actions = [
        {
            icon: FileText,
            color: '#06b6d4',
            bgColor: '#cffafe',
            title: 'Request Transcript',
            desc: 'Download PDF',
            action: () => setActiveTab('reports')
        },
        {
            icon: Mail,
            color: '#8b5cf6',
            bgColor: '#ede9fe',
            title: 'Contact Advisor',
            desc: 'Send Email',
            action: () => window.location.href = 'mailto:patel.khush1615.gnu@gmail.com'
        },
        {
            icon: Calendar,
            color: '#10b981',
            bgColor: '#d1fae5',
            title: 'Study Planner',
            desc: 'View Schedule',
            action: () => setActiveTab('schedule')
        },
        {
            icon: Calculator,
            color: '#f59e0b',
            bgColor: '#fef3c7',
            title: 'GPA Calculator',
            desc: 'Estimate Grades',
            action: () => setActiveTab('grades')
        }
    ]

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.2
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.3 }
        }
    }

    return (
        <div className="card-redesigned quick-actions-container">
            <div className="card-header-redesigned">
                <div className="header-icon" style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <ChevronRight size={14} />
                </div>
                <h3>Quick Actions</h3>
            </div>

            <motion.div
                className="quick-actions-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {actions.map((item, index) => {
                    const Icon = item.icon

                    return (
                        <motion.button
                            key={index}
                            className="quick-action-btn"
                            variants={itemVariants}
                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                            whileTap={{ scale: 0.98 }}
                            onClick={item.action}
                        >
                            <div className="action-icon-wrapper" style={{ backgroundColor: item.bgColor, color: item.color }}>
                                <Icon size={22} />
                            </div>

                            <div className="action-content">
                                <h5 className="action-title">{item.title}</h5>
                                <p className="action-desc">{item.desc}</p>
                            </div>

                            <motion.div
                                className="action-arrow"
                                initial={{ x: 0, opacity: 0.3 }}
                                whileHover={{ x: 4, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                style={{ color: item.color }}
                            >
                                <ArrowRight size={18} />
                            </motion.div>
                        </motion.button>
                    )
                })}
            </motion.div>
        </div>
    )
}

export default QuickActionsRedesigned
