/**
 * Profile Store - Alpine.js Store
 * Manages user profile state: loading, editing, and saving profile data via API
 * Follows Alpine.store() pattern for Django template compatibility
 */

function defineProfileStore() {
    Alpine.store('profile', {
        // STATE
        loading: true,
        saving: false,
        profile: {},
        originalProfile: {},
        errors: {},
        _initialized: false,
        
        // INITIALIZATION (idempotent)
        async init() {
            if (this._initialized) return;
            this._initialized = true;
            
            // Load profile data
            await this.loadProfile();
            
            // Hide page loading overlay
            if (window.hidePageLoading) {
                window.hidePageLoading();
            }
        },
        
        // ACTIONS
        
        /**
         * Load profile data from API
         */
        async loadProfile() {
            this.loading = true;
            this.errors = {};
            
            try {
                this.profile = await api.getProfile();
                // Store original for cancel functionality
                this.originalProfile = JSON.parse(JSON.stringify(this.profile));
            } catch (error) {
                console.error('Error loading profile:', error);
                window.showToast('Failed to load profile', 'error');
            } finally {
                this.loading = false;
            }
        },
        
        /**
         * Save profile changes
         */
        async saveProfile() {
            this.saving = true;
            this.errors = {};
            
            try {
                const data = await api.updateProfile({
                    first_name: this.profile.first_name,
                    last_name: this.profile.last_name,
                    email: this.profile.email,
                    avatar: this.profile.avatar,
                });
                
                if (data.success) {
                    window.showToast(data.message, 'success');
                    // Reload profile to get updated data
                    await this.loadProfile();
                } else {
                    // Handle validation errors
                    if (data.errors) {
                        this.errors = data.errors;
                        window.showToast('Please fix the errors', 'error');
                    } else {
                        window.showToast(data.error || 'Failed to update profile', 'error');
                    }
                }
            } catch (error) {
                console.error('Error saving profile:', error);
                window.showToast('Error saving profile', 'error');
            } finally {
                this.saving = false;
            }
        },
        
        /**
         * Cancel editing and restore original values
         */
        cancelEdit() {
            this.profile = JSON.parse(JSON.stringify(this.originalProfile));
            this.errors = {};
            window.showToast('Changes cancelled', 'info');
        },
        
        // GETTERS
        
        /**
         * Get full name or fallback to email
         */
        get fullName() {
            if (this.profile.first_name || this.profile.last_name) {
                return `${this.profile.first_name || ''} ${this.profile.last_name || ''}`.trim();
            }
            return 'User';
        },
        
        /**
         * Format date to readable string
         */
        formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        },
        
        /**
         * Format datetime to readable string with relative time
         */
        formatDateTime(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            // Relative time for recent activity
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            
            // Absolute date for older activity
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        }
    });
}

// Timing-safe initialization
if (window.Alpine) {
    defineProfileStore();
} else {
    document.addEventListener('alpine:init', defineProfileStore);
}

console.log('Profile store loaded');

