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
            
            try {
                const response = await fetch('/auth/login/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': this.getCsrfToken()
                    },
                    credentials: 'same-origin',
                    redirect: 'manual' // Don't auto-follow redirects
                });
                
                // Check for successful login
                // Django Allauth redirects on success, returns 200 with errors on failure
                if (response.type === 'opaqueredirect' || response.status === 302 || response.status === 0) {
                    // Login successful - redirect happened
                    // Note: We can't read response body on redirect, so we'll show toast after page loads
                    window.location.href = '/'; // Dashboard
                    return;
                }
                
                if (response.ok && response.redirected) {
                    // Another success pattern
                    window.location.href = response.url || '/';
                    return;
                }
                
                // If we get here, login failed - parse errors
                const html = await response.text();
                
                // Check for common error patterns in the HTML response
                if (html.includes('The email address and/or password you specified are not correct') || 
                    html.includes('errorlist') || 
                    html.includes('This field is required')) {
                    window.showToast('Invalid email or password. Please try again.', 'error');
                } else {
                    window.showToast('Login failed. Please try again.', 'error');
                }
                
                // Could parse specific errors from HTML and display them inline
                // For now, we'll just show a toast
                
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
                const response = await fetch('/auth/logout/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': this.getCsrfToken()
                    },
                    credentials: 'same-origin',
                    redirect: 'manual'
                });
                
                // Logout is almost always successful
                // Clear user data immediately
                this.user = null;
                this.isAuthenticated = false;
                
                
                
                // Show success toast
                window.showToast('Logged out successfully', 'success', 3000);
                
                // Redirect to login page after showing toast
                setTimeout(() => {
                    // Hide loading overlay
                    
                    window.location.href = '/auth/login/';
                }, 1500);
                
            } catch (error) {
                console.error('Logout error:', error);
                this.hidePageLoadingOverlay();
                window.showToast('An error occurred during logout.', 'error');
                // Still redirect even on error
                setTimeout(() => {
                    window.location.href = '/auth/login/';
                }, 1500);
            }
        },
        
        // ============ SIGNUP METHOD (Future) ============
        async signup(formData) {
            this.loading = true;
            
            try {
                const response = await fetch('/auth/signup/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': this.getCsrfToken()
                    },
                    credentials: 'same-origin',
                    redirect: 'manual'
                });
                
                // Similar pattern to login
                if (response.type === 'opaqueredirect' || response.status === 302 || response.status === 0) {
                    // Signup successful
                    window.location.href = '/';
                    return;
                }
                
                if (response.ok && response.redirected) {
                    // Another success pattern
                    window.location.href = response.url || '/';
                    return;
                }
                
                // If we get here, signup failed - parse errors
                const html = await response.text();
                
                // Check for common error patterns in the HTML response
                if (html.includes('A user is already registered with this email address')) {
                    window.showToast('This email is already registered. Please login instead.', 'error');
                } else if (html.includes('This password is too common') || 
                           html.includes('This password is too short') ||
                           html.includes('This password is entirely numeric')) {
                    window.showToast('Please choose a stronger password.', 'error');
                } else if (html.includes('errorlist') || html.includes('This field is required')) {
                    window.showToast('Please fix the errors and try again.', 'error');
                } else {
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
         * Get CSRF token from form or meta tag
         * @returns {string} CSRF token
         */
        getCsrfToken() {
            return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                   document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                   '';
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

