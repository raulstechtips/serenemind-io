/**
 * Global Utility Functions
 * Helper functions available throughout the application
 */

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 5000)
 */
window.showToast = function(message, type = 'info', duration = 5000) {
    window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message, type, duration }
    }));
};

/**
 * Show confirmation modal (Promise-based)
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {string} confirmText - Confirm button text (default: 'Confirm')
 * @param {string} cancelText - Cancel button text (default: 'Cancel')
 * @param {string} type - Type: 'danger', 'warning', 'info' (default: 'danger')
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
window.showConfirm = function(title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger') {
    return new Promise((resolve) => {
        window.dispatchEvent(new CustomEvent('confirm-modal', {
            detail: {
                title,
                message,
                type,
                confirmText,
                cancelText,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            }
        }));
    });
};

/**
 * Format currency (utility for future features)
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} - Formatted currency string
 */
window.formatCurrency = function(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
};

/**
 * Debounce function (utility for search inputs, etc.)
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
window.debounce = function(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Resolves to true if successful
 */
window.copyToClipboard = async function(text) {
    try {
        await navigator.clipboard.writeText(text);
        window.showToast('Copied to clipboard!', 'success', 2000);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        window.showToast('Failed to copy to clipboard', 'error');
        return false;
    }
};

console.log('Global utilities loaded');

