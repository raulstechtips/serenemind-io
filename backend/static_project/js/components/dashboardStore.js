/**
 * Dashboard Store - Alpine.js Store
 * Manages dashboard state: date navigation, today's tasks, schedule loading
 * Follows Alpine.store() pattern for Django template compatibility
 */

function defineDashboardStore() {
    Alpine.store('dashboard', {
        // STATE
        selectedDate: null,
        todayDate: null,
        dailyTaskList: null,
        tasks: [],
        loading: false,
        error: null,
        _initialized: false,
        
        // Template checking
        templates: [],
        hasTemplateForDay: false,
        selectedTemplate: null,
        noTemplateMessage: '',
        
        // Template selection modal
        showTemplateSelectModal: false,
        availableTemplatesForDay: [],
        
        // INITIALIZATION (idempotent)
        async init() {
            if (this._initialized) return;
            this._initialized = true;
            
            // Set today's date
            this.todayDate = dateUtils.formatDate(new Date());
            this.selectedDate = this.todayDate;
            
            // Load templates for checking
            await this.loadTemplates();
            
            // Load today's schedule
            await this.loadScheduleForDate(this.selectedDate);
            
            // Hide page loading overlay
            if (window.hidePageLoading) {
                window.hidePageLoading();
            }
        },
        
        // ACTIONS
        
        /**
         * Load templates to check if current weekday has a template
         */
        async loadTemplates() {
            try {
                const response = await api.getTemplates();
                this.templates = response.templates || [];
            } catch (error) {
                console.error('Failed to load templates:', error);
                this.templates = [];
            }
        },
        
        /**
         * Load schedule for a specific date
         * @param {string} date - Date in YYYY-MM-DD format
         */
        async loadScheduleForDate(date) {
            this.loading = true;
            this.error = null;
            this.selectedDate = date;
            
            try {
                // Check if template exists for this weekday
                this.checkTemplateForDate(date);
                
                // Try to load schedule for this date
                const response = await api.getDailyTaskListByDate(date);
                this.dailyTaskList = response;
                this.tasks = response.tasks || [];
                
                // Load adhoc tasks for this date
                if (window.Alpine && Alpine.store('adhocTasks')) {
                    await Alpine.store('adhocTasks').loadTasks(date);
                }
            } catch (error) {
                // Schedule doesn't exist for this date
                if (error.message.includes('No daily task list found')) {
                    this.dailyTaskList = null;
                    this.tasks = [];
                    this.error = null; // Not an error, just doesn't exist yet
                } else {
                    this.error = error.message;
                    console.error('Failed to load schedule:', error);
                }
                
                // Still load adhoc tasks even if schedule doesn't exist
                if (window.Alpine && Alpine.store('adhocTasks')) {
                    await Alpine.store('adhocTasks').loadTasks(date);
                }
            } finally {
                this.loading = false;
            }
        },
        
        /**
         * Check if a template exists for the given date's weekday
         * @param {string} date - Date in YYYY-MM-DD format
         */
        checkTemplateForDate(date) {
            const weekday = dateUtils.getWeekdayName(date);
            
            // Find the template for this weekday
            const template = this.templates.find(t => t.weekdays.includes(weekday));
            
            if (template) {
                this.hasTemplateForDay = true;
                this.selectedTemplate = template;
            } else {
                this.hasTemplateForDay = false;
                this.selectedTemplate = null;
                this.noTemplateMessage = `No template set for ${weekday}. Visit Templates page to create one.`;
            }
        },
        
        /**
         * Create schedule for the selected date
         * Now opens template selection modal instead of auto-creating
         */
        async createSchedule() {
            await this.openTemplateSelectModal();
        },
        
        /**
         * Open template selection modal
         */
        async openTemplateSelectModal() {
            // Get weekday from selected date
            const date = dateUtils.parseDate(this.selectedDate);
            const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
            
            // Filter templates that have this weekday
            this.availableTemplatesForDay = this.templates.filter(t => 
                t.weekdays && t.weekdays.includes(weekday)
            );
            
            if (this.availableTemplatesForDay.length === 0) {
                window.showToast('No templates assigned to ' + weekday, 'warning');
                return;
            }
            
            this.showTemplateSelectModal = true;
        },
        
        /**
         * Close template selection modal
         */
        closeTemplateSelectModal() {
            this.showTemplateSelectModal = false;
        },
        
        /**
         * Create schedule with selected template
         */
        async createScheduleWithTemplate(templateId) {
            this.loading = true;
            this.error = null;
            
            try {
                const response = await api.createDailyTaskList({ 
                    date: this.selectedDate,
                    template_id: templateId
                });
                
                this.dailyTaskList = response;
                this.tasks = response.tasks || [];
                this.closeTemplateSelectModal();
                window.showToast('Schedule created successfully!', 'success');
            } catch (error) {
                this.error = error.message;
                window.showToast(error.message, 'error');
            } finally {
                this.loading = false;
            }
        },
        
        /**
         * Delete schedule for the selected date
         */
        async deleteSchedule() {
            if (!this.dailyTaskList) return;
            
            // Show confirmation using existing modal
            window.showConfirmModal({
                title: 'Delete Schedule',
                message: 'Are you sure you want to delete this schedule? All tasks for this day will be removed.',
                type: 'danger',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                onConfirm: async () => {
                    try {
                        await api.deleteDailyTaskList(this.dailyTaskList.id);
                        window.showToast('Schedule deleted successfully', 'success');
                        await this.loadScheduleForDate(this.selectedDate);
                    } catch (error) {
                        window.showToast('Failed to delete schedule: ' + error.message, 'error');
                    }
                }
            });
        },
        
        /**
         * Navigate to previous date
         */
        async previousDay() {
            const prevDate = dateUtils.addDays(this.selectedDate, -1);
            const prevDateString = dateUtils.formatDate(prevDate);
            await this.loadScheduleForDate(prevDateString);
        },
        
        /**
         * Navigate to next date
         */
        async nextDay() {
            const nextDate = dateUtils.addDays(this.selectedDate, 1);
            const nextDateString = dateUtils.formatDate(nextDate);
            await this.loadScheduleForDate(nextDateString);
        },
        
        /**
         * Go to today's date
         */
        async goToToday() {
            if (this.selectedDate !== this.todayDate) {
                await this.loadScheduleForDate(this.todayDate);
            }
        },
        
        /**
         * Toggle task completion
         * @param {object} task - Task to toggle
         */
        async toggleTaskComplete(task) {
            const previousState = task.completed;
            
            // Optimistic update
            task.completed = !task.completed;
            task.completed_at = task.completed ? new Date().toISOString() : null;
            
            try {
                if (task.completed) {
                    await api.completeTask(task.id);
                } else {
                    await api.uncompleteTask(task.id);
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
         * Update task order after drag-drop
         * Called by taskListSortable store
         * @param {number} taskId - Task ID
         * @param {number} newOrder - New order value
         */
        async updateTaskOrder(taskId, newOrder) {
            try {
                await api.updateDailyTask(taskId, { order: newOrder });
            } catch (error) {
                window.showToast('Failed to update task order: ' + error.message, 'error');
                throw error;
            }
        },
        
        /**
         * Reload current schedule (after reordering, etc.)
         */
        async reloadSchedule() {
            await this.loadScheduleForDate(this.selectedDate);
        },
        
        // GETTERS
        
        /**
         * Get incomplete tasks
         */
        get incompleteTasks() {
            return this.tasks.filter(t => !t.completed);
        },
        
        /**
         * Get completed tasks
         */
        get completedTasks() {
            return this.tasks.filter(t => t.completed);
        },
        
        /**
         * Get completion rate percentage
         */
        get completionRate() {
            if (this.tasks.length === 0) return 0;
            const completed = this.completedTasks.length;
            return Math.round((completed / this.tasks.length) * 100);
        },
        
        /**
         * Get formatted selected date for display
         */
        get formattedDate() {
            if (!this.selectedDate) return '';
            return dateUtils.formatDateLong(this.selectedDate);
        },
        
        /**
         * Check if selected date is today
         */
        get isToday() {
            return this.selectedDate === this.todayDate;
        },
        
        /**
         * Check if schedule exists for selected date
         */
        get hasSchedule() {
            return this.dailyTaskList !== null;
        }
    });
}

// CRITICAL: Timing-safe initialization
if (window.Alpine) {
    defineDashboardStore();
} else {
    document.addEventListener('alpine:init', () => {
        defineDashboardStore();
    });
}

