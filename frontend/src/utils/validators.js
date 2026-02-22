/**
 * Validation utility functions
 */

export const isValidEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
};

export const isRequired = (value) => {
    return value !== null && value !== undefined && value.toString().trim() !== '';
};
