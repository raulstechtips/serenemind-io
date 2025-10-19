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
                const emailChanged = this.profile.email !== this.originalProfile.email;
                
                // If email changed, update via allauth FIRST
                // This adds the new email AND marks it as primary
                if (emailChanged) {
                    const emailResult = await api.updateEmail(this.profile.email);
                    if (!emailResult.ok) {
                        // Email update failed - don't proceed with profile update
                        const errorMsg = emailResult.data?.error || 'Failed to update email. Email may already be in use.';
                        this.errors.email = errorMsg;
                        window.showToast(errorMsg, 'error');
                        this.saving = false;
                        return;
                    }
                    // Email added and marked as primary, continue with profile update
                }
                
                // Build update payload with only changed fields
                const updates = {};
                if (this.profile.first_name !== this.originalProfile.first_name) {
                    updates.first_name = this.profile.first_name;
                }
                if (this.profile.last_name !== this.originalProfile.last_name) {
                    updates.last_name = this.profile.last_name;
                }
                if (emailChanged) {
                    updates.email = this.profile.email;
                }
                if (this.profile.avatar !== this.originalProfile.avatar) {
                    updates.avatar = this.profile.avatar;
                }
                
                // Only send request if something changed
                if (Object.keys(updates).length === 0) {
                    window.showToast('No changes to save', 'info');
                    this.saving = false;
                    return;
                }
                
                // Update profile via custom endpoint with only changed fields
                const data = await api.updateProfile(updates);
                
                if (data.success) {
                    if (emailChanged) {
                        window.showToast('Profile and email updated successfully!', 'success');
                    } else {
                        window.showToast(data.message, 'success');
                    }
                    
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
         * Change password (when logged in)
         * @param {string} currentPassword - Current password
         * @param {string} newPassword - New password
         * @param {string} confirmPassword - Confirm new password
         * @returns {Promise<boolean>} - Success status
         */
        async changePassword(currentPassword, newPassword, confirmPassword) {
            if (newPassword !== confirmPassword) {
                this.errors.password_confirm = 'Passwords do not match';
                return false;
            }
            
            this.saving = true;
            this.errors = {};
            
            try {
                const result = await api.changePassword(currentPassword, newPassword);
                
                if (result.ok) {
                    window.showToast('Password changed successfully!', 'success');
                    return true;
                } else {
                    if (result.data.errors) {
                        this.errors = result.data.errors;
                    } else {
                        this.errors.password = result.data.error || 'Failed to change password';
                    }
                    window.showToast('Failed to change password', 'error');
                    return false;
                }
            } catch (error) {
                console.error('Error changing password:', error);
                window.showToast('Error changing password', 'error');
                return false;
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
         * Check if profile has unsaved changes
         */
        get hasProfileChanges() {
            if (!this.originalProfile || !this.profile) return false;
            
            return this.profile.first_name !== this.originalProfile.first_name ||
                   this.profile.last_name !== this.originalProfile.last_name ||
                   this.profile.email !== this.originalProfile.email ||
                   this.profile.avatar !== this.originalProfile.avatar;
        },
        
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

