/**
 * Learning Behavior Analysis - Activity Tracker Utility
 * Frontend utility for tracking user interactions and learning activities
 * 
 * Usage:
 * import { initActivityTracker, usePageViewTracking } from '@/lib/activityTracker';
 * 
 * // In App.jsx or main component:
 * useEffect(() => {
 *   const token = localStorage.getItem('token');
 *   initActivityTracker(token);
 * }, []);
 * 
 * // In any component:
 * usePageViewTracking('dashboard');
 * window.activityTracker?.logVideoInteraction(videoId, 'start', { title: '...' });
 */

import { API_BASE } from '../config';

// Configuration
const BATCH_TIMEOUT = 5000; // 5 seconds
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_QUEUE_SIZE = 10;

/**
 * ActivityTracker Class
 * Handles batching and sending of activity events
 */
export class ActivityTracker {
    constructor(authToken) {
        this.authToken = authToken;
        this.queue = [];
        this.batchTimer = null;
        this.sessionStartTime = Date.now();
        this.lastActivityTime = Date.now();
        this.isOnline = navigator.onLine;
        this.currentPage = null;
        this.pageStartTime = null;

        // Network status handlers
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.flushQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });

        // Save queue before page unload
        window.addEventListener('beforeunload', () => {
            this.logPageExit();
            this.flushQueueSync();
        });

        // Visibility change handling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.flushQueue();
            }
        });

        // Initialize session monitoring
        this.initSessionMonitor();

        console.debug('[ActivityTracker] Initialized');
    }

    /**
     * Update auth token (e.g., after token refresh)
     */
    updateToken(newToken) {
        this.authToken = newToken;
    }

    /**
     * Log page view
     */
    logPageView(page, metadata = {}) {
        // Log exit from previous page
        if (this.currentPage && this.pageStartTime) {
            const duration = Math.floor((Date.now() - this.pageStartTime) / 1000);
            this.enqueueActivity({
                action: 'page_exit',
                content_type: 'page_view',
                content_title: this.currentPage,
                duration_seconds: duration,
                metadata: { page: this.currentPage }
            });
        }

        // Log entry to new page
        this.currentPage = page;
        this.pageStartTime = Date.now();

        this.enqueueActivity({
            action: 'page_view',
            content_type: 'page_view',
            content_title: page,
            metadata: { page, ...metadata, timestamp: new Date().toISOString() }
        });
    }

    /**
     * Log page exit (called on beforeunload)
     */
    logPageExit() {
        if (this.currentPage && this.pageStartTime) {
            const duration = Math.floor((Date.now() - this.pageStartTime) / 1000);
            this.enqueueActivity({
                action: 'page_exit',
                content_type: 'page_view',
                content_title: this.currentPage,
                duration_seconds: duration,
                metadata: { page: this.currentPage }
            });
        }
    }

    /**
     * Generic content interaction logging
     */
    logContentInteraction(contentType, action, details = {}) {
        const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

        this.enqueueActivity({
            action: `${contentType}_${action}`,
            content_type: contentType,
            content_id: details.contentId,
            content_title: details.contentTitle,
            duration_seconds: details.duration || 0,
            subject_id: details.subjectId,
            is_completed: details.isCompleted ? 1 : 0,
            metadata: { ...details, sessionDuration }
        });
    }

    /**
     * Log video interaction
     */
    logVideoInteraction(videoId, action, details = {}) {
        this.logContentInteraction('video', action, {
            contentId: videoId,
            contentTitle: details.title,
            duration: details.duration,
            position: details.position,
            subjectId: details.subjectId,
            isCompleted: action === 'complete'
        });
    }

    /**
     * Log assignment interaction
     */
    logAssignmentInteraction(assignmentId, action, details = {}) {
        this.logContentInteraction('assignment', action, {
            contentId: assignmentId,
            contentTitle: details.title,
            duration: details.duration,
            subjectId: details.subjectId,
            isCompleted: action === 'submit',
            onTime: details.onTime
        });
    }

    /**
     * Log quiz interaction
     */
    logQuizInteraction(quizId, action, details = {}) {
        this.logContentInteraction('quiz', action, {
            contentId: quizId,
            contentTitle: details.title,
            duration: details.timeSpent,
            subjectId: details.subjectId,
            score: details.score,
            isCompleted: action === 'submit'
        });
    }

    /**
     * Log discussion interaction
     */
    logDiscussionInteraction(discussionId, action, details = {}) {
        this.logContentInteraction('discussion', action, {
            contentId: discussionId,
            contentTitle: details.title,
            subjectId: details.subjectId,
            isCompleted: action === 'post'
        });
    }

    /**
     * Log reading/material interaction
     */
    logReadingInteraction(materialId, action, details = {}) {
        this.logContentInteraction('reading', action, {
            contentId: materialId,
            contentTitle: details.title,
            duration: details.duration,
            subjectId: details.subjectId,
            isCompleted: action === 'complete'
        });
    }

    /**
     * Log button click (for feature usage tracking)
     */
    logButtonClick(buttonName, location = '') {
        this.enqueueActivity({
            action: 'button_click',
            content_type: 'other',
            content_title: `${location}.${buttonName}`,
            metadata: { button: buttonName, location }
        });
    }

    /**
     * Log search action
     */
    logSearch(query, resultCount, context = '') {
        this.enqueueActivity({
            action: 'search',
            content_type: 'other',
            content_title: `search:${context}`,
            metadata: { query, resultCount, context }
        });
    }

    /**
     * Log file download
     */
    logDownload(fileId, fileName, fileType) {
        this.enqueueActivity({
            action: 'download',
            content_type: 'other',
            content_id: fileId,
            content_title: fileName,
            metadata: { fileType, fileName }
        });
    }

    /**
     * Add activity to queue
     */
    enqueueActivity(activity) {
        if (!this.authToken) return;

        try {
            const timestamp = new Date().toISOString();
            const queueItem = {
                ...activity,
                timestamp,
                session_start: new Date(this.sessionStartTime).toISOString()
            };

            this.queue.push(queueItem);
            this.lastActivityTime = Date.now();

            // Flush if queue is full
            if (this.queue.length >= MAX_QUEUE_SIZE) {
                this.flushQueue();
            } else if (!this.batchTimer) {
                this.batchTimer = setTimeout(() => this.flushQueue(), BATCH_TIMEOUT);
            }
        } catch (e) {
            console.debug('[ActivityTracker] Error enqueueing activity:', e);
        }
    }

    /**
     * Flush queue asynchronously
     */
    async flushQueue() {
        if (this.queue.length === 0) return;

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        const activitiesToSend = [...this.queue];
        this.queue = [];

        try {
            // Send activities one by one (or batch endpoint if available)
            for (const activity of activitiesToSend) {
                await this.sendActivity(activity);
            }
        } catch (e) {
            console.debug('[ActivityTracker] Failed to send activity batch:', e);
            // Re-queue failed activities (optional - could lead to duplicates)
            // this.queue = [...activitiesToSend, ...this.queue];
        }
    }

    /**
     * Flush queue synchronously (for beforeunload)
     */
    flushQueueSync() {
        if (this.queue.length === 0) return;

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        // Use sendBeacon for reliable delivery during page unload
        const activities = [...this.queue];
        this.queue = [];

        for (const activity of activities) {
            try {
                const blob = new Blob([JSON.stringify(activity)], { type: 'application/json' });
                navigator.sendBeacon(`${API_BASE}/behavior/log_activity.php`, blob);
            } catch (e) {
                console.debug('[ActivityTracker] SendBeacon failed:', e);
            }
        }
    }

    /**
     * Send single activity to server
     */
    async sendActivity(activity) {
        if (!this.isOnline || !this.authToken) return;

        try {
            const response = await fetch(`${API_BASE}/behavior/log_activity.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(activity)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return response.json();
        } catch (e) {
            // Silent fail for analytics - don't disrupt user experience
            console.debug('[ActivityTracker] Failed to send activity:', e);
        }
    }

    /**
     * Initialize session monitor
     */
    initSessionMonitor() {
        setInterval(() => {
            const inactiveTime = Date.now() - this.lastActivityTime;
            if (inactiveTime > SESSION_TIMEOUT) {
                this.flushQueue();
                // Start new session
                this.sessionStartTime = Date.now();
                console.debug('[ActivityTracker] Session reset due to inactivity');
            }
        }, 60000); // Check every minute
    }

    /**
     * Get current session info
     */
    getSessionInfo() {
        return {
            sessionStartTime: new Date(this.sessionStartTime),
            sessionDuration: Math.floor((Date.now() - this.sessionStartTime) / 1000),
            activityCount: this.queue.length,
            lastActivity: new Date(this.lastActivityTime),
            currentPage: this.currentPage
        };
    }

    /**
     * Force flush queue
     */
    async flushNow() {
        return this.flushQueue();
    }
}

// ============================================================================
// React Hooks
// ============================================================================

import { useEffect, useRef } from 'react';

/**
 * Hook to track page views
 * @param {string} pageName - Name of the page
 * @param {object} metadata - Additional metadata
 */
export function usePageViewTracking(pageName, metadata = {}) {
    const metadataRef = useRef(metadata);

    useEffect(() => {
        if (window.activityTracker) {
            window.activityTracker.logPageView(pageName, metadataRef.current);
        }
    }, [pageName]);
}

/**
 * Hook to flush activities on component unmount
 */
export function useSessionTracking() {
    useEffect(() => {
        return () => {
            if (window.activityTracker) {
                window.activityTracker.flushNow();
            }
        };
    }, []);
}

/**
 * Hook to track time spent on a component/section
 * @param {string} sectionName - Name of the section
 * @param {object} details - Additional details
 */
export function useSectionTracking(sectionName, details = {}) {
    const startTime = useRef(Date.now());

    useEffect(() => {
        startTime.current = Date.now();

        return () => {
            if (window.activityTracker) {
                const duration = Math.floor((Date.now() - startTime.current) / 1000);
                window.activityTracker.logContentInteraction('other', 'section_view', {
                    contentTitle: sectionName,
                    duration,
                    ...details
                });
            }
        };
    }, [sectionName]);
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the global activity tracker
 * @param {string} authToken - JWT authentication token
 * @returns {ActivityTracker} The tracker instance
 */
export function initActivityTracker(authToken) {
    if (!authToken) {
        console.debug('[ActivityTracker] No auth token provided, skipping initialization');
        return null;
    }

    if (!window.activityTracker) {
        window.activityTracker = new ActivityTracker(authToken);
    } else {
        // Update token if tracker already exists
        window.activityTracker.updateToken(authToken);
    }

    return window.activityTracker;
}

/**
 * Get the current activity tracker instance
 * @returns {ActivityTracker|null}
 */
export function getActivityTracker() {
    return window.activityTracker || null;
}

/**
 * Destroy the activity tracker
 */
export function destroyActivityTracker() {
    if (window.activityTracker) {
        window.activityTracker.flushQueueSync();
        window.activityTracker = null;
    }
}

export default ActivityTracker;
