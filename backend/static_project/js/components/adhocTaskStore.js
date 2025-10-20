/**
 * Adhoc Task Store - Alpine.js Store
 * Manages adhoc tasks: CRUD operations, overdue detection
 * Follows Alpine.store() pattern for Django template compatibility
 */

function defineAdhocTaskStore() {
    Alpine.store('adhocTasks', {
        // STATE
        incompleteTasks: [],  // Separate array for incomplete tasks
        completedTasks: [],   // Separate array for completed tasks
        loading: false,
        error: null,
        _initialized: false,

        // Modal state
        editingTask: null,
        showEditModal: false,
        
        get selectedDate() {
            const dashboardStore = Alpine.store('dashboard');
            return dashboardStore?.selectedDate || null;
        },

        // INITIALIZATION (idempotent)
        async init() {
            if (this._initialized) return;
            this._initialized = true;
            // Don't load tasks here - let the caller (dashboard) provide the date
        },
        
        // ACTIONS
        
        /**
         * Load adhoc tasks with optional date filtering
         * @param {string|null} date - Date string (YYYY-MM-DD) to filter completed tasks, null for all incomplete
         */
        async loadTasks(date = null) {
            this.loading = true;
            this.error = null;
            
            try {
                // Load incomplete tasks (always show all incomplete)
                const incompleteResponse = await api.getAdhocTasks(false, null);
                this.incompleteTasks = incompleteResponse.adhoc_tasks || [];
                // Load completed tasks (filtered by date if provided)
                if (date) {
                    const nextDate = dateUtils.formatDate(dateUtils.getNextDay(date));
                    const datesToFetch = [date, nextDate];
                    const allCompletedTasks = [];

                    // Fetch tasks for each date
                    for (const fetchDate of datesToFetch) {
                        const completedResponse = await api.getAdhocTasks(true, fetchDate);
                        allCompletedTasks.push(...(completedResponse.adhoc_tasks || []));
                    }
                    this.completedTasks = allCompletedTasks.filter(t => dateUtils.formatDate(t.completed_at) === date);
                } else {
                    this.completedTasks = [];
                }
            } catch (error) {
                this.error = error.message;
                console.error('Failed to load adhoc tasks:', error);
            } finally {
                this.loading = false;
            }
        },
        
        /**
         * Open create modal
         */
        openCreateModal() {
            this.editingTask = null;
            this.showEditModal = true;
        },
        
        /**
         * Open edit modal
         * @param {object} task - Task to edit
         */
        openEditModal(task) {
            this.editingTask = { ...task }; // Clone to avoid direct mutation
            this.showEditModal = true;
        },
        
        /**
         * Close edit modal
         */
        closeEditModal() {
            this.showEditModal = false;
            this.editingTask = null;
        },
        
        /**
         * Create new adhoc task
         * @param {object} taskData - Task data {title, due_date}
         */
        async createTask(taskData) {
            this.loading = true;
            this.error = null;
            
            try {
                await api.createAdhocTask(taskData);
                await this.loadTasks(this.selectedDate);
                this.closeEditModal();
                window.showToast('Adhoc task created successfully!', 'success');
            } catch (error) {
                this.error = error.message;
                window.showToast(error.message, 'error');
                console.error('Failed to create adhoc task:', error);
            } finally {
                this.loading = false;
            }
        },
        
        /**
         * Update adhoc task
         * @param {number} taskId - Task ID
         * @param {object} updates - Updates {title?, due_date?}
         */
        async updateTask(taskId, updates) {
            this.loading = true;
            this.error = null;
            
            try {
                await api.updateDailyTask(taskId, updates);
                await this.loadTasks(this.selectedDate);
                this.closeEditModal();
                window.showToast('Adhoc task updated successfully!', 'success');
            } catch (error) {
                this.error = error.message;
                window.showToast(error.message, 'error');
                console.error('Failed to update adhoc task:', error);
            } finally {
                this.loading = false;
            }
        },
        
        /**
         * Delete adhoc task
         * @param {object} task - Task to delete
         */
        async deleteTask(task) {
            const confirmed = await window.showConfirm(
                'Delete Adhoc Task',
                `Are you sure you want to delete "${task.title}"?`,
                'Delete',
                'Cancel'
            );
            
            if (!confirmed) return;
            
            this.loading = true;
            this.error = null;
            
            try {
                await api.deleteDailyTask(task.id);
                if (task.completed) {
                    this.completedTasks = this.completedTasks.filter(t => t.id !== task.id);
                } else {
                    this.incompleteTasks = this.incompleteTasks.filter(t => t.id !== task.id);
                }
                window.showToast('Adhoc task deleted successfully!', 'success');
            } catch (error) {
                this.error = error.message;
                window.showToast(error.message, 'error');
                console.error('Failed to delete adhoc task:', error);
            } finally {
                this.loading = false;
            }
        },
        
        /**
         * Update task order
         * @param {number} taskId - Task ID
         * @param {number} order - New order value
         */
        async updateTaskOrder(taskId, order) {
            try {
                await api.updateDailyTask(taskId, { order });
            } catch (error) {
                console.error('Failed to update task order:', error);
                throw error;
            }
        },
        
        /**
         * Reload tasks (for after reordering)
         */
        async reloadTasks() {
            await this.loadTasks(this.selectedDate);
        },
        
        /**
         * Toggle task completion
         * @param {object} task - Task to toggle
         */
        async toggleComplete(task) {
            const previousState = task.completed;
            
            // Optimistic update
            task.completed = !task.completed;
            task.completed_at = task.completed ? new Date().toISOString() : null;
            
            try {
                if (task.completed) {
                    await api.completeTask(task.id);
                    // Move from incomplete to completed array
                    this.incompleteTasks = this.incompleteTasks.filter(t => t.id !== task.id);
                    this.completedTasks.unshift(task);
                } else {
                    await api.uncompleteTask(task.id);
                    // Move from completed to incomplete array (will be reordered by backend)
                    this.completedTasks = this.completedTasks.filter(t => t.id !== task.id);
                    this.incompleteTasks.push(task);
                }
            } catch (error) {
                // Revert on error
                task.completed = previousState;
                task.completed_at = previousState ? task.completed_at : null;
                window.showToast('Failed to update task: ' + error.message, 'error');
                console.error('Failed to toggle task:', error);
            }
        },
        
        /**
         * Submit edit modal form
         * Handles both create and update based on editingTask
         * @param {object} formData - Form data {title, due_date}
         */
        async submitForm(formData) {
            if (this.editingTask && this.editingTask.id) {
                // Update existing task
                await this.updateTask(this.editingTask.id, formData);
            } else {
                // Create new task
                await this.createTask(formData);
            }
        },
        
        // GETTERS
        
        /**
         * Get overdue tasks
         * @param {object} task - Task to check
         * @returns {boolean}
         */
        isOverdue(task) {
            if (task.completed) return false;
            const today = dateUtils.getToday();
            const dueDate = dateUtils.parseDate(task.due_date);
            return dueDate < today;
        },
        
        /**
         * Check if task is due today
         * @param {object} task - Task to check
         * @returns {boolean}
         */
        isDueToday(task) {
            const today = dateUtils.formatDate(new Date());
            return task.due_date === today;
        },
        
        /**
         * Get formatted due date
         * @param {string} dateStr - Date string YYYY-MM-DD
         * @returns {string}
         */
        formatDueDate(dateStr) {
            return dateUtils.formatDateMedium(dateStr);
        }
    });
}

// CRITICAL: Timing-safe initialization
if (window.Alpine) {
    defineAdhocTaskStore();
} else {
    document.addEventListener('alpine:init', () => {
        defineAdhocTaskStore();
    });
}

