/**
 * Centralized API Client
 * 
 * Features:
 * - Automatic auth header injection
 * - Global 401 handling
 * - Standardized error handling
 * - Request/response interceptors
 */

import { API_BASE } from './config';

class ApiClient {
    constructor() {
        this.baseURL = API_BASE;
        this.token = null;
        this.onUnauthorized = null;
    }

    /**
     * Set the authentication token
     */
    setToken(token) {
        this.token = token;
    }

    /**
     * Clear the authentication token
     */
    clearToken() {
        this.token = null;
    }

    /**
     * Set callback for unauthorized responses
     */
    setUnauthorizedHandler(callback) {
        this.onUnauthorized = callback;
    }

    /**
     * Get default headers
     */
    getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Handle API response
     */
    async handleResponse(response) {
        // Handle 401 Unauthorized globally
        if (response.status === 401) {
            if (this.onUnauthorized) {
                this.onUnauthorized();
            }
            throw new ApiError('Unauthorized', 401, { shouldLogout: true });
        }

        // Parse JSON response
        const contentType = response.headers.get('content-type');
        const data = contentType && contentType.includes('application/json')
            ? await response.json()
            : await response.text();

        // Handle error responses
        if (!response.ok) {
            const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
            throw new ApiError(errorMessage, response.status, data);
        }

        return data;
    }

    /**
     * Make a GET request
     */
    async get(endpoint, options = {}) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders(options.headers),
            ...options
        });

        return this.handleResponse(response);
    }

    /**
     * Make a POST request
     */
    async post(endpoint, body, options = {}) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(options.headers),
            body: JSON.stringify(body),
            ...options
        });

        return this.handleResponse(response);
    }

    /**
     * Make a PUT request
     */
    async put(endpoint, body, options = {}) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(options.headers),
            body: JSON.stringify(body),
            ...options
        });

        return this.handleResponse(response);
    }

    /**
     * Make a DELETE request
     */
    async delete(endpoint, options = {}) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(options.headers),
            ...options
        });

        return this.handleResponse(response);
    }

    /**
     * Upload a file (multipart/form-data)
     */
    async upload(endpoint, formData, options = {}) {
        const headers = { ...options.headers };

        // Add auth header if token exists
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        // Don't set Content-Type for multipart/form-data - browser will set it with boundary
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
            ...options
        });

        return this.handleResponse(response);
    }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(message, status, data = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// Create and export singleton instance
const apiClient = new ApiClient();

export { apiClient, ApiError };
export default apiClient;
