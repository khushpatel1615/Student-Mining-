import { useState, useEffect } from 'react';
import * as attendanceService from '../services/attendanceService';

export const useAttendance = (filters = {}) => {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                setLoading(true);
                const data = await attendanceService.getAttendance(filters);
                setAttendance(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [JSON.stringify(filters)]);

    return { attendance, loading, error };
};
