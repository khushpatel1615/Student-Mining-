import { useState, useEffect } from 'react'
import { Play, CheckCircle, Clock, Video, Plus, Trash2, Edit2, X } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '../../context/AuthContext'
import { API_BASE } from '../../config';
import './VideoLectures.css'



function VideoLectures({ subjectId = null }) {
    const { token, user } = useAuth()
    const [videos, setVideos] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeVideo, setActiveVideo] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [featured, setFeatured] = useState([])
    const [newVideo, setNewVideo] = useState({ title: '', description: '', video_url: '', duration_minutes: 0 })

    useEffect(() => {
        if (subjectId) {
            fetchVideos()
        } else {
            fetchFeatured()
        }
    }, [subjectId])

    const fetchVideos = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/video_lectures.php?action=list&subject_id=${subjectId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) setVideos(data.data)
        } catch (err) {
            toast.error('Failed to load videos')
        } finally {
            setLoading(false)
        }
    }

    const fetchFeatured = async () => {
        try {
            const res = await fetch(`${API_BASE}/video_lectures.php?action=featured`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) setFeatured(data.data)
        } catch (err) { /* ignore */ } finally { setLoading(false) }
    }

    const addVideo = async () => {
        if (!newVideo.title || !newVideo.video_url) {
            toast.error('Title and URL required')
            return
        }
        try {
            const res = await fetch(`${API_BASE}/video_lectures.php`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', subject_id: subjectId, ...newVideo })
            })
            const data = await res.json()
            if (data.success) {
                toast.success('Video added!')
                setShowForm(false)
                setNewVideo({ title: '', description: '', video_url: '', duration_minutes: 0 })
                fetchVideos()
            }
        } catch (err) {
            toast.error('Failed to add video')
        }
    }

    const deleteVideo = async (id) => {
        if (!window.confirm('Delete this video?')) return
        try {
            await fetch(`${API_BASE}/video_lectures.php`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            toast.success('Deleted')
            fetchVideos()
        } catch (err) { /* ignore */ }
    }

    const updateProgress = async (videoId, seconds, completed = false) => {
        try {
            await fetch(`${API_BASE}/video_lectures.php`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_progress', video_id: videoId, watched_seconds: seconds, completed })
            })
        } catch (err) { /* ignore */ }
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

    if (!subjectId) {
        return (
            <div className="video-lectures">
                <div className="videos-header">
                    <h2><Video size={24} /> Featured Video Lectures</h2>
                    <p>Watch and learn from our curated video content</p>
                </div>
                {loading ? <div className="loading">Loading...</div> : (
                    <div className="featured-grid">
                        {featured.map(video => (
                            <div key={video.id} className="video-card featured" onClick={() => setActiveVideo(video)}>
                                <div className="thumbnail" style={{ backgroundImage: `url(${getThumbnail(video.video_url)})` }}>
                                    <div className="play-overlay"><Play size={40} /></div>
                                    <span className="duration">{video.duration_minutes} min</span>
                                </div>
                                <div className="video-info">
                                    <h4>{video.title}</h4>
                                    <span className="subject">{video.subject_name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="video-lectures">
            <div className="videos-header">
                <div>
                    <h2><Video size={24} /> Video Lectures</h2>
                    <p>{videos.length} videos available</p>
                </div>
                {(user.role === 'admin' || user.role === 'teacher') && (
                    <button className="btn-add" onClick={() => setShowForm(true)}>
                        <Plus size={18} /> Add Video
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
                            <button className="btn-complete" onClick={() => { updateProgress(activeVideo.id, activeVideo.duration_minutes * 60, true); toast.success('Marked complete!') }}>
                                <CheckCircle size={16} /> Mark as Completed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="video-form">
                    <h3>Add New Video</h3>
                    <input type="text" placeholder="Video title" value={newVideo.title} onChange={e => setNewVideo({ ...newVideo, title: e.target.value })} />
                    <textarea placeholder="Description (optional)" value={newVideo.description} onChange={e => setNewVideo({ ...newVideo, description: e.target.value })} />
                    <input type="text" placeholder="YouTube or Vimeo URL" value={newVideo.video_url} onChange={e => setNewVideo({ ...newVideo, video_url: e.target.value })} />
                    <input type="number" placeholder="Duration (minutes)" value={newVideo.duration_minutes || ''} onChange={e => setNewVideo({ ...newVideo, duration_minutes: +e.target.value })} />
                    <div className="form-actions">
                        <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
                        <button className="btn-submit" onClick={addVideo}>Add Video</button>
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
                            <div className="thumbnail" style={{ backgroundImage: `url(${getThumbnail(video.video_url)})` }}>
                                <div className="play-overlay"><Play size={32} /></div>
                                <span className="sequence">{index + 1}</span>
                                {video.duration_minutes && <span className="duration"><Clock size={12} /> {video.duration_minutes}m</span>}
                            </div>
                            <div className="video-info">
                                <h4>{video.title}</h4>
                                {video.description && <p>{video.description}</p>}
                            </div>
                            {(user.role === 'admin' || user.role === 'teacher') && (
                                <button className="btn-delete" onClick={(e) => { e.stopPropagation(); deleteVideo(video.id) }}>
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



