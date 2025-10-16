/**
 * Master Task Library Store
 * Global state management for master task library using Alpine.store()
 * 
 * This pattern allows:
 * - Clean separation of state and UI
 * - Access from any component (including Django includes)
 * - React/Redux-style global state management
 * - True component-based architecture
 * 
 * Usage in templates:
 * - Access state: $store.taskManager.tasks
 * - Call methods: $store.taskManager.loadTasks()
 * - Computed values: $store.taskManager.filteredTasks
 */

// Store definition function
function defineTaskManagerStore() {
    Alpine.store('taskManager', {
        // ==========================================
        // STATE
        // ==========================================
        tasks: [],
        loading: true,
        error: null,
        searchQuery: '',
        _initialized: false,  // Guard flag for initialization
        
        // ==========================================
        // INITIALIZATION
        // ==========================================
        
        /**
         * Initialize store - call this from page component
         * Safe to call multiple times (idempotent)
         */
        async init() {
            // Guard: only initialize once
            if (this._initialized) {
                return;
            }
            
            console.log('Initializing Task Manager Store...');
            this._initialized = true;
            await this.loadTasks();
        },
        
        // ==========================================
        // DATA FETCHING
        // ==========================================
        
        /**
         * Load all tasks from API
         */
        async loadTasks() {
            this.loading = true;
            this.error = null;
            
            try {
                const tasks = await api.getTasks();
                this.tasks = tasks || [];
            } catch (error) {
                console.error('Error loading tasks:', error);
                this.error = error.message || 'Failed to load tasks';
            } finally {
                this.loading = false;
                
                // Hide global page loading overlay once initial data is loaded
                if (window.hidePageLoading) {
                    window.hidePageLoading();
                }
            }
        },
        
        // ==========================================
        // SEARCH & FILTER
        // ==========================================
        
        /**
         * Set search query
         * @param {string} query - Search query
         */
        setSearchQuery(query) {
            this.searchQuery = query;
        },
        
        /**
         * Clear search query
         */
        clearSearch() {
            this.searchQuery = '';
        },
        
        // ==========================================
        // TASK CRUD OPERATIONS
        // ==========================================
        
        /**
         * Open create task modal
         */
        createTask() {
            window.showCreateTaskModal({
                onSuccess: async (newTask) => {
                    await this.loadTasks(); // Reload tasks
                }
            });
        },
        
        /**
         * Open edit task modal
         * @param {object} task - Task to edit
         */
        editTask(task) {
            window.showEditTaskModal({
                taskId: task.id,
                title: task.title,
                onSuccess: async (updatedTask) => {
                    await this.loadTasks(); // Reload tasks
                }
            });
        },
        
        /**
         * Delete task with confirmation
         * @param {object} task - Task to delete
         */
        deleteTask(task) {
            // Get task usage info
            const templateCount = task.template_count || 0;
            const templateNames = task.template_names || [];
            
            // Build warning message
            let warningMessage = `Are you sure you want to delete "<strong>${task.title}</strong>"?`;
            
            if (templateCount > 0) {
                warningMessage += `<br><br><strong>Warning:</strong> This task is used in ${templateCount} template(s):`;
                warningMessage += `<br><ul class="list-disc list-inside mt-2 text-left">`;
                templateNames.forEach(name => {
                    warningMessage += `<li>${name}</li>`;
                });
                warningMessage += `</ul>`;
                warningMessage += `<br>Deleting this task will remove it from all templates and may affect analytics.`;
            }
            
            window.showConfirmModal({
                title: 'Delete Task',
                message: warningMessage,
                type: 'danger',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                onConfirm: async () => {
                    await this.performDelete(task.id);
                }
            });
        },
        
        /**
         * Perform task deletion
         * @param {number} taskId - ID of task to delete
         */
        async performDelete(taskId) {
            try {
                await api.deleteTask(taskId);
                
                // Remove from local state
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                
                // Show success message
                this.showSuccessToast('Task deleted successfully');
            } catch (error) {
                console.error('Error deleting task:', error);
                this.showErrorToast(error.message || 'Failed to delete task');
            }
        },
        
        // ==========================================
        // UI HELPERS
        // ==========================================
        
        /**
         * Show success toast notification
         * @param {string} message - Success message
         */
        showSuccessToast(message) {
            window.dispatchEvent(new CustomEvent('show-toast', {
                detail: { message, type: 'success' }
            }));
        },
        
        /**
         * Show error toast notification
         * @param {string} message - Error message
         */
        showErrorToast(message) {
            window.dispatchEvent(new CustomEvent('show-toast', {
                detail: { message, type: 'error' }
            }));
        },
        
        // ==========================================
        // COMPUTED PROPERTIES (GETTERS)
        // ==========================================
        
        /**
         * Get filtered tasks based on search query
         * @returns {Array} - Filtered tasks
         */
        get filteredTasks() {
            const query = this.searchQuery.toLowerCase().trim();
            
            if (!query) {
                return this.tasks;
            }
            
            return this.tasks.filter(task => 
                task.title.toLowerCase().includes(query)
            );
        },
        
        /**
         * Check if there are any tasks
         * @returns {boolean}
         */
        get hasTasks() {
            return this.tasks.length > 0;
        },
        
        /**
         * Check if search has results
         * @returns {boolean}
         */
        get hasResults() {
            return this.filteredTasks.length > 0;
        },
        
        /**
         * Get task count (filtered)
         * @returns {number}
         */
        get taskCount() {
            return this.filteredTasks.length;
        }
    });
}

// Timing-safe initialization
// This ensures the store is registered regardless of when Alpine loads
if (window.Alpine) {
    // Alpine is already loaded, register store immediately
    defineTaskManagerStore();
} else {
    // Alpine not loaded yet, wait for alpine:init event
    document.addEventListener('alpine:init', () => {
        defineTaskManagerStore();
    });
}

