import { useState, useEffect } from 'react';
import * as enrollmentService from '../services/enrollmentService';

export const useEnrollments = (filters = {}) => {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEnrollments = async () => {
            try {
                setLoading(true);
                const data = await enrollmentService.getEnrollments(filters);
                setEnrollments(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEnrollments();
    }, [JSON.stringify(filters)]);

    return { enrollments, loading, error };
};
