/**
 * API Client for Task Manager
 * Centralized API client for all backend endpoints
 * Includes error handling and consistent response formatting
 */

const api = {
    baseURL: '/api',
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
    // AUTHENTICATION ENDPOINTS
    // ==========================================
    
    /**
     * Login user
     * Note: Auth endpoints return HTML, not JSON, so we use raw fetch
     * @param {FormData} formData - Form data with login credentials
     * @returns {Promise<Response>} - Fetch response (for redirect detection)
     */
    async login(formData) {
        return fetch('/auth/login/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': this.getCsrfToken()
            },
            redirect: 'manual'
        });
    },
    
    /**
     * Signup user
     * Note: Auth endpoints return HTML, not JSON, so we use raw fetch
     * @param {FormData} formData - Form data with signup information
     * @returns {Promise<Response>} - Fetch response (for redirect detection)
     */
    async signup(formData) {
        return fetch('/auth/signup/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': this.getCsrfToken()
            },
            redirect: 'manual'
        });
    },
    
    /**
     * Logout user
     * Note: Auth endpoints return HTML, not JSON, so we use raw fetch
     * @returns {Promise<Response>} - Fetch response (for redirect detection)
     */
    async logout() {
        return fetch('/auth/logout/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': this.getCsrfToken()
            },
            redirect: 'manual'
        });
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
     * @param {number} id - Task ID
     * @returns {Promise<object>} - Task details
     */
    getTask(id) {
        return this.request(`/tasks/${id}/`);
    },
    
    /**
     * Update a task
     * @param {number} id - Task ID
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
     * @param {number} id - Task ID
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
     * @param {number} id - Template ID
     * @returns {Promise<object>} - Template details with tasks
     */
    getTemplate(id) {
        return this.request(`/templates/${id}/`);
    },
    
    /**
     * Update a template
     * @param {number} id - Template ID
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
     * @param {number} id - Template ID
     * @returns {Promise<object>} - Success response
     */
    deleteTemplate(id) {
        return this.request(`/templates/${id}/`, {
            method: 'DELETE'
        });
    },
    
    /**
     * Get available weekdays (not assigned to any template)
     * @returns {Promise<object>} - {available_weekdays: array, assigned_weekdays: object}
     */
    getAvailableWeekdays() {
        return this.request('/templates/available-weekdays/');
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
     * @param {number} id - Daily task list ID
     * @returns {Promise<object>} - Daily task list details
     */
    getDailyTaskList(id) {
        return this.request(`/daily-task-lists/${id}/`);
    },
    
    /**
     * Delete a daily task list
     * @param {number} id - Daily task list ID
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
     * @param {number} id - Daily task ID
     * @returns {Promise<object>} - Daily task details
     */
    getDailyTask(id) {
        return this.request(`/daily-tasks/${id}/`);
    },
    
    /**
     * Update a daily task
     * @param {number} id - Daily task ID
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
     * @param {number} id - Daily task ID
     * @returns {Promise<object>} - Success response
     */
    deleteDailyTask(id) {
        return this.request(`/daily-tasks/${id}/`, {
            method: 'DELETE'
        });
    },
    
    /**
     * Mark a daily task as complete
     * @param {number} id - Daily task ID
     * @returns {Promise<object>} - Updated daily task
     */
    completeTask(id) {
        return this.request(`/daily-tasks/${id}/complete/`, {
            method: 'POST'
        });
    },
    
    /**
     * Mark a daily task as incomplete
     * @param {number} id - Daily task ID
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
     * @returns {Promise<Array>} - List of adhoc tasks
     */
    getAdhocTasks(completed = false) {
        return this.request(`/adhoc-tasks/?completed=${completed}`);
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
    }
};

// Make api globally available
window.api = api;

