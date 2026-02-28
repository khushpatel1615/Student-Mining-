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
            // Read body as text first (safe, single read), then try to parse as JSON
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        }

        if (response.status === 401) {
            if (this.onUnauthorized) {
                this.onUnauthorized();
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
     */
    async get(endpoint, params = {}, options = {}) {
        const { headers: customHeaders, ...fetchOptions } = options;
        const url = this.buildURL(endpoint, params);
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders(customHeaders),
            ...fetchOptions
        });
        return await this.handleResponse(response);
    }

    /**
     * POST request
     */
    async post(endpoint, body = {}, options = {}) {
        const { headers: customHeaders, ...fetchOptions } = options;
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(customHeaders),
            body: JSON.stringify(body),
            ...fetchOptions
        });
        return await this.handleResponse(response);
    }

    /**
     * PUT request
     */
    async put(endpoint, body = {}, options = {}) {
        const { headers: customHeaders, ...fetchOptions } = options;
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(customHeaders),
            body: JSON.stringify(body),
            ...fetchOptions
        });
        return await this.handleResponse(response);
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
