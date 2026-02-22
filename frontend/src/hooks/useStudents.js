import { useState, useEffect } from 'react';
import * as studentService from '../services/studentService';

export const useStudents = (filters = {}) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                setLoading(true);
                const data = await studentService.getStudents(filters);
                setStudents(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, [JSON.stringify(filters)]);

    return { students, loading, error };
};
