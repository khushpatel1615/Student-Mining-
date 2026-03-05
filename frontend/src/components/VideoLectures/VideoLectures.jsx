import { useState, useEffect } from 'react'
import { Play, CheckCircle, Clock, Video, Plus, Trash2, Edit2, X } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '../../context/AuthContext'
import apiClient from '../../utils/apiClient';
import * as programService from '../../services/programService';
import './VideoLectures.css'

function VideoLectures({ subjectId = null }) {
    const { token, user } = useAuth()
    const [videos, setVideos] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeVideo, setActiveVideo] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [newVideo, setNewVideo] = useState({ title: '', description: '', video_url: '', duration_minutes: 0, program_id: '', semester: '', subject_selected: '' })

    // For global add form
    const [programs, setPrograms] = useState([])
    const [subjectsOptions, setSubjectsOptions] = useState([])

    useEffect(() => {
        fetchVideos()
        if (!subjectId && (user?.role === 'admin' || user?.role === 'teacher')) {
            loadPrograms()
        }
    }, [subjectId])

    useEffect(() => {
        if (newVideo.program_id && newVideo.semester) {
            loadSubjectsForForm(newVideo.program_id, newVideo.semester)
        } else {
            setSubjectsOptions([])
        }
    }, [newVideo.program_id, newVideo.semester])

    const loadPrograms = async () => {
        const { data } = await programService.fetchPrograms()
        if (data) setPrograms(data)
    }

    const loadSubjectsForForm = async (progId, sem) => {
        const { data } = await programService.fetchSubjects(progId, sem)
        if (data) setSubjectsOptions(data)
    }

    const fetchVideos = async () => {
        setLoading(true)
        try {
            const params = { action: 'list' };
            if (subjectId) params.subject_id = subjectId;

            const data = await apiClient.get('/video_lectures.php', params);
            if (data.success) setVideos(data.data)
        } catch {
            toast.error('Failed to load videos')
        } finally {
            setLoading(false)
        }
    }

    const addVideo = async () => {
        if (!newVideo.title || !newVideo.video_url) {
            toast.error('Title and URL required')
            return
        }
        if (!subjectId) {
            if (!newVideo.program_id) {
                toast.error('Please select a course/program')
                return
            }
            if (!newVideo.semester) {
                toast.error('Please select a semester')
                return
            }
        }

        try {
            const payload = {
                action: 'create',
                ...newVideo,
                subject_id: subjectId || newVideo.subject_selected || null
            }

            const data = await apiClient.post('/video_lectures.php', payload);
            if (data.success) {
                toast.success('Video added!')
                setShowForm(false)
                setNewVideo({ title: '', description: '', video_url: '', duration_minutes: 0, program_id: '', semester: '', subject_selected: '' })
                fetchVideos()
            }
        } catch {
            toast.error('Failed to add video')
        }
    }

    const deleteVideo = async (id) => {
        if (!window.confirm('Delete this video?')) return
        try {
            await apiClient.delete('/video_lectures.php', { id });
            toast.success('Deleted')
            fetchVideos()
        } catch { /* ignore */ }
    }

    const updateProgress = async (videoId, seconds, completed = false) => {
        if (user?.role !== 'student') return;
        try {
            await apiClient.post('/video_lectures.php', { action: 'update_progress', video_id: videoId, watched_seconds: seconds, completed });
        } catch { /* ignore */ }
    }

    const getYouTubeId = (url) => {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
        return match ? match[1] : null
    }

    const getVimeoId = (url) => {
        const match = url.match(/vimeo\.com\/(\d+)/)
        return match ? match[1] : null
    }

    const getEmbedUrl = (url) => {
        const ytId = getYouTubeId(url)
        if (ytId) return `https://www.youtube.com/embed/${ytId}`
        const vimeoId = getVimeoId(url)
        if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`
        return url
    }

    const getThumbnail = (url) => {
        const ytId = getYouTubeId(url)
        if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
        return null
    }

    return (
        <div className="video-lectures">
            <div className="videos-header">
                <div>
                    <h2><Video size={24} /> {subjectId ? 'Subject Video Lectures' : 'Video Lectures'}</h2>
                    <p>{videos.length} videos available</p>
                </div>
                {(user?.role === 'admin' || user?.role === 'teacher') && (
                    <button className="btn-add" onClick={() => setShowForm(true)}>
                        <Plus size={18} /> Add Link
                    </button>
                )}
            </div>

            {activeVideo && (
                <div className="video-player-overlay" onClick={() => setActiveVideo(null)}>
                    <div className="video-player" onClick={e => e.stopPropagation()}>
                        <button className="btn-close" onClick={() => setActiveVideo(null)}><X size={20} /></button>
                        <iframe
                            src={getEmbedUrl(activeVideo.video_url)}
                            title={activeVideo.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                        <div className="player-info">
                            <h3>{activeVideo.title}</h3>
                            <p>{activeVideo.description}</p>
                            {user?.role === 'student' && (
                                <button className="btn-complete" onClick={() => { updateProgress(activeVideo.id, activeVideo.duration_minutes * 60, true); toast.success('Marked complete!') }}>
                                    <CheckCircle size={16} /> Mark as Completed
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="video-form" style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#1e293b' }}>Add New Video Link</h3>

                    {!subjectId && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Course / Program *</label>
                                <select
                                    value={newVideo.program_id}
                                    onChange={e => setNewVideo({ ...newVideo, program_id: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="">Select Course</option>
                                    {programs.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Semester *</label>
                                <select
                                    value={newVideo.semester}
                                    onChange={e => setNewVideo({ ...newVideo, semester: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    disabled={!newVideo.program_id}
                                >
                                    <option value="">Select Semester</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                        <option key={s} value={s}>Semester {s}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Specific Subject (Optional)</label>
                                <select
                                    value={newVideo.subject_selected}
                                    onChange={e => setNewVideo({ ...newVideo, subject_selected: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                    disabled={!newVideo.semester}
                                >
                                    <option value="">All Subjects</option>
                                    {subjectsOptions.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <input type="text" placeholder="Video title *" value={newVideo.title} onChange={e => setNewVideo({ ...newVideo, title: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        <input type="text" placeholder="YouTube or Vimeo URL (Link) *" value={newVideo.video_url} onChange={e => setNewVideo({ ...newVideo, video_url: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                        <textarea placeholder="Description (optional)" value={newVideo.description} onChange={e => setNewVideo({ ...newVideo, description: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical' }} />
                        <input type="number" placeholder="Duration (minutes)" value={newVideo.duration_minutes || ''} onChange={e => setNewVideo({ ...newVideo, duration_minutes: +e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    </div>

                    <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button className="btn-cancel" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                        <button className="btn-submit" onClick={addVideo} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Add Video Link</button>
                    </div>
                </div>
            )}

            {loading ? <div className="loading">Loading videos...</div> : videos.length === 0 ? (
                <div className="empty-state">
                    <Video size={48} />
                    <p>No videos available yet</p>
                </div>
            ) : (
                <div className="videos-grid">
                    {videos.map((video, index) => (
                        <div key={video.id} className="video-card" onClick={() => setActiveVideo(video)}>
                            <div className="thumbnail" style={{ backgroundImage: `url(${getThumbnail(video.video_url)})`, position: 'relative' }}>
                                <div className="play-overlay"><Play size={32} /></div>
                                {/* <span className="sequence">{index + 1}</span> */}
                                {video.duration_minutes > 0 && <span className="duration"><Clock size={12} /> {video.duration_minutes}m</span>}
                            </div>
                            <div className="video-info">
                                <h4>{video.title}</h4>
                                {video.program_name && <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>{video.program_name} - Sem {video.semester}</span>}
                                {video.description && <p>{video.description}</p>}
                            </div>
                            {(user?.role === 'admin' || user?.role === 'teacher') && (
                                <button className="btn-delete" onClick={(e) => { e.stopPropagation(); deleteVideo(video.id) }} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default VideoLectures
