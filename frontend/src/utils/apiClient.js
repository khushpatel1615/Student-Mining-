import { API_BASE } from '../config';

/**
 * Standardized API Error class
 */
class ApiError extends Error {
    constructor(message, status, data = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

class ApiClient {
    constructor() {
        this.baseURL = API_BASE;
        this.token = this.getTokenFromStorage();
        this.onUnauthorized = null;
    }

    getTokenFromStorage() {
        return localStorage.getItem('token');
    }

    /**
     * Set the authentication token and persist it
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    /**
     * Clear the authentication token
     */
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    /**
     * Set callback for unauthorized responses (401)
     */
    setUnauthorizedHandler(callback) {
        this.onUnauthorized = callback;
    }

    /**
     * Build URL with query parameters
     */
    buildURL(endpoint, params = {}) {
        const url = new URL(`${this.baseURL}${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });
        return url.toString();
    }

    /**
     * Get default headers
     */
    getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...customHeaders
        };

        const currentToken = this.getTokenFromStorage();
        if (currentToken) {
            headers['Authorization'] = `Bearer ${currentToken}`;
        }

        return headers;
    }

    /**
     * Handle API response
     */
    async handleResponse(response) {
        const contentType = response.headers ? response.headers.get('content-type') : null;
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // If contentType is missing (like in some poorly mocked tests), assume JSON if response.json exists and returns JSON
            try {
                // If response.json exists, we prefer it.
                if (response.json) {
                    data = await response.json();
                } else {
                    data = await response.text();
                }
            } catch {
                data = await response.text();
            }
        }
        if (response.status === 401) {
            if (this.onUnauthorized) {
                this.onUnauthorized();
            }
            throw new ApiError('Session expired. Please login again.', 401, data);
        }

        if (!response.ok) {
            const errorMessage = data?.error || data?.message || `Error ${response.status}: ${response.statusText}`;
            throw new ApiError(errorMessage, response.status, data);
        }

        return data;
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}, options = {}) {
        try {
            const url = this.buildURL(endpoint, params);
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(options.headers),
                ...options
            });
            return await this.handleResponse(response);
        } catch (error) {
            throw error;
        }
    }

    /**
     * POST request
     */
    async post(endpoint, body = {}, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(options.headers),
                body: JSON.stringify(body),
                ...options
            });
            return await this.handleResponse(response);
        } catch (error) {
            throw error;
        }
    }

    /**
     * PUT request
     */
    async put(endpoint, body = {}, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(options.headers),
                body: JSON.stringify(body),
                ...options
            });
            return await this.handleResponse(response);
        } catch (error) {
            throw error;
        }
    }

    /**
     * DELETE request
     */
    async delete(endpoint, params = {}, options = {}) {
        try {
            const url = this.buildURL(endpoint, params);
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.getHeaders(options.headers),
                ...options
            });
            return await this.handleResponse(response);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Upload / Multipart request
     */
    async upload(endpoint, formData, options = {}) {
        try {
            const headers = { ...options.headers };
            const currentToken = this.getTokenFromStorage();
            if (currentToken) {
                headers['Authorization'] = `Bearer ${currentToken}`;
            }
            // Note: Don't set Content-Type, browser will handle it for FormData

            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers,
                body: formData,
                ...options
            });
            return await this.handleResponse(response);
        } catch (error) {
            throw error;
        }
    }
}

const apiClient = new ApiClient();
export { apiClient, ApiError };
export default apiClient;

