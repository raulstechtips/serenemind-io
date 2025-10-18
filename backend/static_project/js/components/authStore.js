/**
 * Auth Store - Alpine.js Store
 * Manages global authentication state and handles login/logout/signup flows
 * Follows Alpine.store() pattern for Django template compatibility
 */

function defineAuthStore() {
    Alpine.store('auth', {
        // ============ STATE ============
        user: null,                    // Current user object {email, first_name, last_name, avatar, full_name}
        isAuthenticated: false,        // Auth status boolean
        loading: false,                // Loading state for async operations
        _initialized: false,           // Guard for idempotent init
        errors: {},                    // Field-specific errors {field: message}
        
        // ============ INITIALIZATION ============
        async init() {
            if (this._initialized) return;
            this._initialized = true;
            
            // User data is passed from Django template (see Phase 5)
            // No additional init needed
            console.log('Auth store initialized');
        },
        
        // ============ LOGIN METHOD ============
        async login(formData) {
            this.loading = true;
            this.errors = {}; // Clear previous errors
            
            try {
                // Extract email and password from FormData
                const email = formData.get('login');
                const password = formData.get('password');
                
                // Call headless API
                const response = await api.login(email, password);
                
                // Check for successful login (200 status)
                if (response.ok && response.status === 200) {
                    // Login successful - redirect to dashboard
                    window.showToast('Login successful!', 'success', 2000);
                    window.location.href = '/';
                    return;
                }
                
                // Handle errors from headless API
                if (response.data && response.data.errors) {
                    // Parse field-specific errors
                    this.errors = this.parseErrors(response.data.errors);
                    
                    // Show error message from API (first error's message)
                    const errorMessage = response.data.errors[0]?.message || 'Please fix the errors and try again.';
                    window.showToast(errorMessage, 'error');
                } else {
                    // Generic error
                    window.showToast('Login failed. Please try again.', 'error');
                }
                
            } catch (error) {
                console.error('Login error:', error);
                window.showToast('An error occurred. Please try again.', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        // ============ LOGOUT METHOD ============
        async logout() {
            // Show global page loading overlay
            this.showPageLoadingOverlay();
            
            try {
                const response = await api.logout();
                
                // Clear user data immediately
                this.user = null;
                this.isAuthenticated = false;
                this.errors = {};
                
                // Show success toast
                window.showToast('Logged out successfully', 'success', 3000);
                
                // Redirect to login page after showing toast
                setTimeout(() => {
                    window.location.href = '/account/login/';
                }, 1500);
                
            } catch (error) {
                console.error('Logout error:', error);
                this.hidePageLoadingOverlay();
                window.showToast('An error occurred during logout.', 'error');
                // Still redirect even on error
                setTimeout(() => {
                    window.location.href = '/account/login/';
                }, 1500);
            }
        },
        
        // ============ SIGNUP METHOD ============
        async signup(formData) {
            this.loading = true;
            this.errors = {}; // Clear previous errors
            
            try {
                // Extract form data
                const userData = {
                    email: formData.get('email'),
                    email2: formData.get('email2'),
                    password1: formData.get('password1'),
                    password2: formData.get('password2'),
                    first_name: formData.get('first_name'),
                    last_name: formData.get('last_name')
                };
                
                // Call headless API
                const response = await api.signup(userData);
                
                // Check for successful signup (200 status)
                if (response.ok && response.status === 200) {
                    // Signup successful - redirect to dashboard
                    window.showToast('Account created successfully!', 'success', 2000);
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 500);
                    return;
                }
                
                // Handle errors from headless API
                if (response.data && response.data.errors) {
                    // Parse field-specific errors
                    this.errors = this.parseErrors(response.data.errors);
                    
                    // Show error message from API (first error's message)
                    const errorMessage = response.data.errors[0]?.message || 'Please fix the errors and try again.';
                    window.showToast(errorMessage, 'error');
                } else {
                    // Generic error
                    window.showToast('Signup failed. Please try again.', 'error');
                }
                
            } catch (error) {
                console.error('Signup error:', error);
                window.showToast('An error occurred. Please try again.', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        // ============ HELPER METHODS ============
        
        /**
         * Parse errors from headless API response
         * @param {Array} errors - Array of error objects from API
         * @returns {Object} - Map of field names to error messages
         */
        parseErrors(errors) {
            const errorMap = {};
            if (Array.isArray(errors)) {
                errors.forEach(error => {
                    if (error.param) {
                        // Map API field names to template field names
                        const fieldMap = {
                            'email': 'login',        // Login form uses 'login' for email field
                            'password': 'password',  // Password field (login form)
                            'email2': 'email2',      // Confirm email (signup form)
                            'password1': 'password1', // Password field (signup form)
                            'password2': 'password2', // Confirm password (signup form)
                            'first_name': 'first_name',
                            'last_name': 'last_name'
                        };
                        const field = fieldMap[error.param] || error.param;
                        errorMap[field] = error.message;
                    }
                });
            }
            return errorMap;
        },
        
        /**
         * Get error message for a specific field
         * @param {string} field - Field name
         * @returns {string} - Error message or empty string
         */
        getError(field) {
            return this.errors[field] || '';
        },
        
        /**
         * Check if a field has an error
         * @param {string} field - Field name
         * @returns {boolean} - True if field has error
         */
        hasError(field) {
            return !!this.errors[field];
        },
        
        /**
         * Set user data (called from Django template context)
         * @param {object} userData - User data object
         */
        setUser(userData) {
            this.user = userData;
            this.isAuthenticated = !!userData;
        },
        
        /**
         * Show global page loading overlay
         */
        showPageLoadingOverlay() {
            const overlay = document.getElementById('page-loading-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.style.opacity = '1';
            }
        },
        
        /**
         * Hide global page loading overlay
         */
        hidePageLoadingOverlay() {
            const overlay = document.getElementById('page-loading-overlay');
            if (overlay) {
                overlay.style.transition = 'opacity 0.3s ease-out';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 300);
            }
        }
    });
}

// CRITICAL: Timing-safe initialization (matches existing pattern)
if (window.Alpine) {
    defineAuthStore();
} else {
    document.addEventListener('alpine:init', () => {
        defineAuthStore();
    });
}

console.log('Auth store loaded');

