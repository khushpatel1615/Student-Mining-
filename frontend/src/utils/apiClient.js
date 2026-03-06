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

// Milliseconds to debounce duplicate 401 triggers (prevents multi-request race on page load)
const UNAUTHORIZED_DEBOUNCE_MS = 1000;

class ApiClient {
    constructor() {
        this.baseURL = API_BASE;
        this.token = this.getTokenFromStorage();
        this.onUnauthorized = null;
        this._lastUnauthorizedAt = 0; // Debounce guard
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
     * @param {Response} response - The fetch Response object
     * @param {boolean} skipUnauthorizedHandler - If true, the global 401 logout handler is NOT called
     */
    async handleResponse(response, skipUnauthorizedHandler = false) {
        const contentType = response.headers ? response.headers.get('content-type') : null;
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // Read body as text first (safe, single read), then try to parse as JSON
            let text;
            if (typeof response.text === 'function') {
                text = await response.text();
            } else {
                text = await response.json();
            }
            try {
                data = typeof text === 'string' ? JSON.parse(text) : text;
            } catch {
                data = text;
            }
        }

        if (response.status === 401) {
            // Only trigger the global logout handler if:
            // 1. A handler is registered
            // 2. The caller hasn't opted out (e.g. verifyToken during init)
            // 3. We aren't already handling a recent 401 (debounce)
            if (this.onUnauthorized && !skipUnauthorizedHandler) {
                const now = Date.now();
                if (now - this._lastUnauthorizedAt > UNAUTHORIZED_DEBOUNCE_MS) {
                    this._lastUnauthorizedAt = now;
                    this.onUnauthorized();
                }
            }
            const errorMessage = data?.error || data?.message || 'Session expired. Please login again.';
            throw new ApiError(errorMessage, 401, data);
        }

        if (!response.ok) {
            const errorMessage = data?.error || data?.message || `Error ${response.status}: ${response.statusText}`;
            throw new ApiError(errorMessage, response.status, data);
        }

        return data;
    }

    /**
     * GET request
     * @param {boolean} [options.skipUnauthorizedHandler] - Pass true to suppress auto-logout on 401
     */
    async get(endpoint, params = {}, options = {}) {
        const { headers: customHeaders, skipUnauthorizedHandler = false, ...fetchOptions } = options;
        const url = this.buildURL(endpoint, params);
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders(customHeaders),
            ...fetchOptions
        });
        return await this.handleResponse(response, skipUnauthorizedHandler);
    }

    /**
     * POST request
     * @param {boolean} [options.skipUnauthorizedHandler] - Pass true to suppress auto-logout on 401
     */
    async post(endpoint, body = {}, options = {}) {
        const { headers: customHeaders, skipUnauthorizedHandler = false, ...fetchOptions } = options;
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(customHeaders),
            body: JSON.stringify(body),
            ...fetchOptions
        });
        return await this.handleResponse(response, skipUnauthorizedHandler);
    }

    /**
     * PUT request
     * @param {boolean} [options.skipUnauthorizedHandler] - Pass true to suppress auto-logout on 401
     */
    async put(endpoint, body = {}, options = {}) {
        const { headers: customHeaders, skipUnauthorizedHandler = false, ...fetchOptions } = options;
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(customHeaders),
            body: JSON.stringify(body),
            ...fetchOptions
        });
        return await this.handleResponse(response, skipUnauthorizedHandler);
    }

    /**
     * DELETE request
     */
    async delete(endpoint, params = {}, options = {}) {
        const { headers: customHeaders, ...fetchOptions } = options;
        const url = this.buildURL(endpoint, params);
        const response = await fetch(url, {
            method: 'DELETE',
            headers: this.getHeaders(customHeaders),
            ...fetchOptions
        });
        return await this.handleResponse(response);
    }

    /**
     * Upload / Multipart request
     */
    async upload(endpoint, formData, options = {}) {
        const { headers: customHeaders, ...fetchOptions } = options;
        const headers = { ...customHeaders };
        const currentToken = this.getTokenFromStorage();
        if (currentToken) {
            headers['Authorization'] = `Bearer ${currentToken}`;
        }
        // Note: Don't set Content-Type, browser will handle it for FormData

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
            ...fetchOptions
        });
        return await this.handleResponse(response);
    }
}

const apiClient = new ApiClient();
export { apiClient, ApiError };
export default apiClient;
