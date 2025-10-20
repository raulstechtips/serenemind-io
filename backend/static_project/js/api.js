/**
 * API Client for Task Manager
 * Centralized API client for all backend endpoints
 * Includes error handling and consistent response formatting
 */

const api = {
    baseURL: '/api',
    authURL: '/_allauth/browser/v1/auth',
    profileURL: '/account/api',
    
    /**
     * Helper method to make API requests
     * @param {string} endpoint - API endpoint path
     * @param {object} options - Fetch options
     * @param {string} baseURL - Base URL to use (default: this.baseURL)
     * @returns {Promise} - Response data
     */
    async request(endpoint, options = {}, baseURL = null) {
        try {
            // Get CSRF token from cookies
            const csrfToken = this.getCsrfToken();
            
            const url = baseURL ? `${baseURL}${endpoint}` : `${this.baseURL}${endpoint}`;
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                    ...options.headers,
                },
                ...options
            });
            
            // Handle empty responses (204 No Content)
            if (response.status === 204) {
                return { success: true };
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || data.detail || `Request failed with status ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    /**
     * Get CSRF token from cookie (SINGLE SOURCE OF TRUTH)
     * Always reads from cookie as Django keeps this updated.
     * Do not read from DOM or meta tags as they can become stale.
     * @returns {string} - CSRF token
     */
    getCsrfToken() {
        const name = 'csrftoken';
        let cookieValue = null;
        
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                // Check if this cookie string begins with the name we want
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        
        return cookieValue || '';
    },
    
    // ==========================================
    // AUTHENTICATION ENDPOINTS (Headless API)
    // ==========================================
    
    /**
     * Login user via headless API
     * @param {string} email - User email address
     * @param {string} password - User password
     * @returns {Promise<object>} - Login response with user data or errors
     */
    async login(email, password) {
        try {
            const response = await fetch(`${this.authURL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'include', // Important: Include cookies in request
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });
            
            const data = await response.json();
            return { ok: response.ok, status: response.status, data };
        } catch (error) {
            console.error('Login API error:', error);
            throw error;
        }
    },
    
    /**
     * Signup user via headless API
     * @param {object} userData - User data {email, password1, password2, first_name, last_name}
     * @returns {Promise<object>} - Signup response with user data or errors
     */
    async signup(userData) {
        try {
            const response = await fetch(`${this.authURL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'include', // Important: Include cookies in request
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            return { ok: response.ok, status: response.status, data };
        } catch (error) {
            console.error('Signup API error:', error);
            throw error;
        }
    },
    
    /**
     * Logout user via headless API
     * @returns {Promise<object>} - Logout response
     */
    async logout() {
        try {
            const response = await fetch(`${this.authURL}/session`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'include' // Important: Include cookies in request
            });
            
            // Allauth headless browser returns 401 on successful logout (you're now "unauthorized")
            // Also accept 200/204 for compatibility
            if (response.status === 200 || response.status === 204 || response.status === 401) {
                return { ok: true, status: response.status };
            }
            
            const data = await response.json();
            return { ok: response.ok, status: response.status, data };
        } catch (error) {
            console.error('Logout API error:', error);
            throw error;
        }
    },
    
    /**
     * Request password reset (send email with reset link)
     * @param {string} email - User's email address
     * @returns {Promise<object>} - Password reset request response
     */
    async requestPasswordReset(email) {
        try {
            // Correct endpoint for requesting password reset - sends email with key
            const response = await fetch('/_allauth/browser/v1/auth/password/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'include',
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            return { ok: response.ok, status: response.status, data };
        } catch (error) {
            console.error('Password reset request API error:', error);
            throw error;
        }
    },
    
    /**
     * Confirm password reset with key from email
     * @param {string} key - Reset key from email link
     * @param {string} password - New password
     * @returns {Promise<object>} - Password reset confirm response
     */
    async confirmPasswordReset(key, password) {
        try {
            // Endpoint for confirming password reset with key from email
            const response = await fetch('/_allauth/browser/v1/auth/password/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'include',
                body: JSON.stringify({ key, password })
            });
            const data = await response.json();
            return { ok: response.ok, status: response.status, data };
        } catch (error) {
            console.error('Password reset confirm API error:', error);
            throw error;
        }
    },
    
    /**
     * Change password (when logged in)
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<object>} - Password change response
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await fetch('/_allauth/browser/v1/account/password/change', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'include',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            const data = await response.json();
            return { ok: response.ok, status: response.status, data };
        } catch (error) {
            console.error('Password change API error:', error);
            throw error;
        }
    },
    
    /**
     * Update email via allauth headless (for proper email change handling)
     * Two-step process: 1) POST to add email, 2) PATCH to mark as primary
     * @param {string} email - New email address
     * @returns {Promise<object>} - Email update response
     */
    async updateEmail(email) {
        try {
            // Step 1: Add the new email (POST)
            const addResponse = await fetch('/_allauth/browser/v1/account/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'include',
                body: JSON.stringify({ email })
            });
            const addData = await addResponse.json();
            
            if (!addResponse.ok) {
                return { ok: false, status: addResponse.status, data: addData };
            }
            
            // Step 2: Mark the new email as primary (PATCH)
            const primaryResponse = await fetch('/_allauth/browser/v1/account/email', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'include',
                body: JSON.stringify({ email, primary: true })
            });
            const primaryData = await primaryResponse.json();
            
            return { ok: primaryResponse.ok, status: primaryResponse.status, data: primaryData };
        } catch (error) {
            console.error('Email update API error:', error);
            throw error;
        }
    },
    
    /**
     * Get current user profile
     * @returns {Promise<object>} - User profile data
     */
    getProfile() {
        return this.request('/profile/', {}, this.profileURL);
    },
    
    /**
     * Update user profile
     * @param {object} data - Profile data {first_name, last_name, email, avatar}
     * @returns {Promise<object>} - Updated profile response
     */
    updateProfile(data) {
        return this.request('/profile/', {
            method: 'PUT',
            body: JSON.stringify(data)
        }, this.profileURL);
    },
    
    // ==========================================
    // TASK ENDPOINTS (Master Library)
    // ==========================================
    
    /**
     * Get all tasks
     * @returns {Promise<Array>} - List of tasks
     */
    getTasks() {
        return this.request('/tasks/');
    },
    
    /**
     * Create a new task
     * @param {object} data - Task data {title: string}
     * @returns {Promise<object>} - Created task
     */
    createTask(data) {
        return this.request('/tasks/create/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Get a specific task
     * @param {string} id - Task ID (UUID)
     * @returns {Promise<object>} - Task details
     */
    getTask(id) {
        return this.request(`/tasks/${id}/`);
    },
    
    /**
     * Update a task
     * @param {string} id - Task ID (UUID)
     * @param {object} data - Task data {title: string}
     * @returns {Promise<object>} - Updated task
     */
    updateTask(id, data) {
        return this.request(`/tasks/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Delete a task
     * @param {string} id - Task ID (UUID)
     * @returns {Promise<object>} - Success response
     */
    deleteTask(id) {
        return this.request(`/tasks/${id}/`, {
            method: 'DELETE'
        });
    },
    
    // ==========================================
    // TEMPLATE ENDPOINTS
    // ==========================================
    
    /**
     * Get all templates
     * @returns {Promise<Array>} - List of templates
     */
    getTemplates() {
        return this.request('/templates/');
    },
    
    /**
     * Create a new template
     * @param {object} data - Template data {title: string, weekdays: array, tasks: array}
     * @returns {Promise<object>} - Created template
     */
    createTemplate(data) {
        return this.request('/templates/create/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Get a specific template
     * @param {string} id - Template ID (UUID)
     * @returns {Promise<object>} - Template details with tasks
     */
    getTemplate(id) {
        return this.request(`/templates/${id}/`);
    },
    
    /**
     * Update a template
     * @param {string} id - Template ID (UUID)
     * @param {object} data - Template data {title: string, weekdays: array, tasks: array}
     * @returns {Promise<object>} - Updated template
     */
    updateTemplate(id, data) {
        return this.request(`/templates/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Delete a template
     * @param {string} id - Template ID (UUID)
     * @returns {Promise<object>} - Success response
     */
    deleteTemplate(id) {
        return this.request(`/templates/${id}/`, {
            method: 'DELETE'
        });
    },
    
    // ==========================================
    // DAILY TASK LIST ENDPOINTS
    // ==========================================
    
    /**
     * Get all daily task lists
     * @returns {Promise<Array>} - List of daily task lists
     */
    getDailyTaskLists() {
        return this.request('/daily-task-lists/');
    },
    
    /**
     * Create a new daily task list
     * @param {object} data - {date: string (YYYY-MM-DD)}
     * @returns {Promise<object>} - Created daily task list with tasks
     */
    createDailyTaskList(data) {
        return this.request('/daily-task-lists/create/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Get a specific daily task list
     * @param {string} id - Daily task list ID (UUID)
     * @returns {Promise<object>} - Daily task list details
     */
    getDailyTaskList(id) {
        return this.request(`/daily-task-lists/${id}/`);
    },
    
    /**
     * Delete a daily task list
     * @param {string} id - Daily task list ID (UUID)
     * @returns {Promise<object>} - Success response
     */
    deleteDailyTaskList(id) {
        return this.request(`/daily-task-lists/${id}/`, {
            method: 'DELETE'
        });
    },
    
    /**
     * Get daily task list by date
     * @param {string} date - Date (YYYY-MM-DD)
     * @returns {Promise<object>} - Daily task list for that date
     */
    getDailyTaskListByDate(date) {
        return this.request(`/daily-task-lists/date/${date}/`);
    },
    
    /**
     * Get today's daily task list
     * @returns {Promise<object>} - Today's daily task list
     */
    getTodaySchedule() {
        return this.request('/daily-task-lists/today/');
    },
    
    // ==========================================
    // DAILY TASK ENDPOINTS
    // ==========================================
    
    /**
     * Get a specific daily task
     * @param {string} id - Daily task ID (UUID)
     * @returns {Promise<object>} - Daily task details
     */
    getDailyTask(id) {
        return this.request(`/daily-tasks/${id}/`);
    },
    
    /**
     * Update a daily task
     * @param {string} id - Daily task ID (UUID)
     * @param {object} data - {title: string, order: number, completed: boolean}
     * @returns {Promise<object>} - Updated daily task
     */
    updateDailyTask(id, data) {
        return this.request(`/daily-tasks/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Delete a daily task
     * @param {string} id - Daily task ID (UUID)
     * @returns {Promise<object>} - Success response
     */
    deleteDailyTask(id) {
        return this.request(`/daily-tasks/${id}/`, {
            method: 'DELETE'
        });
    },
    
    /**
     * Mark a daily task as complete
     * @param {string} id - Daily task ID (UUID)
     * @returns {Promise<object>} - Updated daily task
     */
    completeTask(id) {
        return this.request(`/daily-tasks/${id}/complete/`, {
            method: 'POST'
        });
    },
    
    /**
     * Mark a daily task as incomplete
     * @param {string} id - Daily task ID (UUID)
     * @returns {Promise<object>} - Updated daily task
     */
    uncompleteTask(id) {
        return this.request(`/daily-tasks/${id}/incomplete/`, {
            method: 'POST'
        });
    },
    
    // ==========================================
    // ADHOC TASK ENDPOINTS
    // ==========================================
    
    /**
     * Get adhoc tasks
     * @param {boolean} completed - Filter by completion status (default: false)
     * @param {string|null} date - Date string (YYYY-MM-DD) to filter completed tasks by completion date
     * @returns {Promise<Array>} - List of adhoc tasks
     */
    getAdhocTasks(completed = false, date = null) {
        let url = `/adhoc-tasks/`;
        
        if (date) {
            url += `?date=${date}&completed=${completed}`;
        } else {
            url += `?completed=${completed}`;
        }
        
        return this.request(url);
    },
    
    /**
     * Create a new adhoc task
     * @param {object} data - {title: string, due_date: string (YYYY-MM-DD)}
     * @returns {Promise<object>} - Created adhoc task
     */
    createAdhocTask(data) {
        return this.request('/adhoc-tasks/create/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    // ==========================================
    // ANALYTICS ENDPOINTS
    // ==========================================
    
    /**
     * Get completion statistics
     * @returns {Promise<object>} - Completion stats
     */
    getCompletionStats() {
        return this.request('/analytics/completion-stats/');
    },

    // ==========================================
    // LABEL ENDPOINTS
    // ==========================================

    /**
     * Get all user's labels
     * @returns {Promise<Array>} - List of labels
     */
    getLabels() {
        return this.request('/labels/');
    },

    /**
     * Create a new label
     * @param {object} data - {name: string, color: string (hex)}
     * @returns {Promise<object>} - Created label
     */
    createLabel(data) {
        return this.request('/labels/create/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    /**
     * Get a specific label
     * @param {string} id - Label ID (UUID)
     * @returns {Promise<object>} - Label details
     */
    getLabel(id) {
        return this.request(`/labels/${id}/`);
    },

    /**
     * Update a label
     * @param {string} id - Label ID (UUID)
     * @param {object} data - {name: string, color: string (hex)}
     * @returns {Promise<object>} - Updated label
     */
    updateLabel(id, data) {
        return this.request(`/labels/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    /**
     * Delete a label
     * @param {string} id - Label ID (UUID)
     * @returns {Promise<object>} - Success response
     */
    deleteLabel(id) {
        return this.request(`/labels/${id}/`, {
            method: 'DELETE'
        });
    }
};

// Make api globally available
window.api = api;

