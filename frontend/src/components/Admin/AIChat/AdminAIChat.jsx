import { API_BASE } from '../../../config';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Minimize2, Maximize2, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import './AdminAIChat.css';



const AdminAIChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            content: "Hello Admin! 👋 I'm your AI Assistant. How can I help you manage the Student Data Mining system today?"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        console.log("AdminAIChat Mounted. isOpen:", isOpen);
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Prepare history for API (exclude IDs)
        const history = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content }));

        try {
            const response = await fetch(`${API_BASE}/ai_chat.php`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ message: userMsg.content, history: history })
            });

            const text = await response.text();
            console.log("Raw API Response:", text); // Debugging

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error("Invalid server response (not JSON): " + text.substring(0, 100));
            }

            if (data.status === 'success') {
                const aiMsg = { id: Date.now() + 1, role: 'assistant', content: data.reply };
                setMessages(prev => [...prev, aiMsg]);
            } else {
                const errorMsg = data.details || data.message || "Unknown API Error";
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `⚠️ **API Error**: ${errorMsg}` }]);
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: `⚠️ **Connection Error**: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Toggle Button */}
            {!isOpen && (
                <button
                    className="ai-chat-toggle"
                    onClick={() => setIsOpen(true)}
                    style={{ zIndex: 99999 }}
                >
                    <div className="ai-icon-wrapper">
                        <Sparkles size={24} color="white" />
                    </div>
                </button>
            )}

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="ai-chat-window"
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <div className="ai-chat-header">
                            <div className="header-info">
                                <Sparkles size={18} className="header-icon" />
                                <h3>AI Assistant</h3>
                            </div>
                            <button className="close-btn" onClick={() => setIsOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="ai-chat-messages">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="avatar assistant">
                                            <Sparkles size={14} />
                                        </div>
                                    )}
                                    <div className={`message-bubble ${msg.role}`}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="avatar user">
                                            <div className="user-initial">A</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="message-wrapper assistant">
                                    <div className="avatar assistant">
                                        <Sparkles size={14} />
                                    </div>
                                    <div className="message-bubble assistant loading">
                                        <span className="dot"></span>
                                        <span className="dot"></span>
                                        <span className="dot"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="ai-chat-input">
                            <input
                                type="text"
                                placeholder="Ask about students, reports, or data..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                disabled={isLoading}
                            />
                            <button
                                className="send-btn"
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                            >
                                {isLoading ? <Loader size={18} className="spin" /> : <Send size={18} />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AdminAIChat;



