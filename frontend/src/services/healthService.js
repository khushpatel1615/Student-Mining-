import apiClient from '../utils/apiClient';

export const fetchHealthDetailed = async () => {
    try {
        const data = await apiClient.get('/health.php', { detailed: 1 });
        return { data: data, error: null };
    } catch (error) {
        return { data: null, error: error.message || 'Health check failed' };
    }
};

export const fetchHealthPing = async () => {
    try {
        const data = await apiClient.get('/health.php');
        return { data: data, error: null };
    } catch (error) {
        return { data: null, error: error.message || 'Ping failed' };
    }
};

export const clearCache = async () => {
    try {
        const data = await apiClient.delete('/health.php?action=clear_cache');
        return { data: data, error: null };
    } catch (error) {
        return { data: null, error: error.message || 'Cache clear failed' };
    }
};
