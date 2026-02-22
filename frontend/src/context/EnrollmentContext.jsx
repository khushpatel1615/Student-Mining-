import React, { createContext, useContext, useReducer } from 'react';

const EnrollmentContext = createContext();

export const EnrollmentProvider = ({ children }) => {
    const [state, dispatch] = useReducer((state, action) => {
        switch (action.type) {
            default:
                return state;
        }
    }, {
        enrollments: [],
        loading: false,
        error: null
    });

    return (
        <EnrollmentContext.Provider value={{ state, dispatch }}>
            {children}
        </EnrollmentContext.Provider>
    );
};

export const useEnrollmentContext = () => useContext(EnrollmentContext);
