import apiClient from '../utils/apiClient';

/**
 * Auth Service
 */

export const login = async (studentId, password) => {
    try {
        const data = await apiClient.post('/login.php', {
            student_id: studentId,
            password: password
        });
        if (data.success && data.token) {
            apiClient.setToken(data.token);
        }
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const logout = async () => {
    try {
        // Optional backend call for logout
        // await apiClient.post('/logout.php');
        apiClient.clearToken();
        return { success: true };
    } catch (error) {
        apiClient.clearToken(); // Always clear local token
        return { success: false, error: error.message };
    }
};

export const loginWithGoogle = async (credential) => {
    try {
        const data = await apiClient.post('/google-auth.php', { credential });
        if (data.success && data.token) {
            apiClient.setToken(data.token);
        }
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};

export const verifyToken = async () => {
    try {
        // skipUnauthorizedHandler: true prevents the global auto-logout
        // from firing during the initial auth check on page load.
        // AuthContext handles the 401 case explicitly itself.
        const data = await apiClient.get('/verify-token.php', {}, { skipUnauthorizedHandler: true });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message, status: error.status };
    }
};

export const setPassword = async (newPassword, currentPassword = null) => {
    try {
        const data = await apiClient.post('/set-password.php', {
            new_password: newPassword,
            current_password: currentPassword
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error.message };
    }
};
