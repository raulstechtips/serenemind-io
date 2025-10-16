/**
 * Template Builder Store
 * 
 * Global state management for template creation/editing modal with:
 * - Template name input
 * - Weekday selection with availability checking
 * - Two-column drag-drop task builder
 * - Create new tasks inline
 * 
 * Usage:
 * Access via $store.templateBuilder in templates
 */

function defineTemplateBuilderStore() {
  Alpine.store('templateBuilder', {
    // STATE
    
    // Modal state
    isEditMode: false,
    
    // Loading states
    loading: false,
    saving: false,
    
    // Template data
    templateId: null,
    templateName: '',
    selectedWeekdays: [],
    
    // Task lists
    availableTasks: [],      // Tasks not yet in template
    templateTasks: [],       // Tasks in template (with order)
    
    // Weekday availability
    disabledWeekdays: [],    // Weekdays assigned to other templates
    originalWeekdays: [],    // Original weekdays (for edit mode)
    
    // SortableJS instance (only for template tasks)
    sortableTemplate: null,
    
    // Error handling
    error: null,
    
    // Initialization guard
    _initialized: false,
    
    /**
     * Initialize store (idempotent)
     */
    async init() {
      if (this._initialized) {
        // Allow re-init if we need to reload data
        this._initialized = false;
      }
      this._initialized = true;
      
      try {
        if (this.templateId && this.isEditMode) {
          await this.loadTemplate();
        } else {
          // Create mode - load available tasks and weekdays
          await this.loadAvailableTasks();
          await this.loadWeekdayAvailability();
          this.loading = false; // Turn off loading after data is loaded
        }
      } catch (error) {
        console.error('Error initializing template builder:', error);
        this.loading = false;
      }
      
      // Initialize SortableJS after DOM is ready
      setTimeout(() => {
        this.initSortable();
      }, 200);
    },
    
    /**
     * Reset store to initial state
     */
    reset() {
      this.isEditMode = false;
      this.loading = true; // Start in loading state to prevent flash of old data
      this.saving = false;
      this.templateId = null;
      this.templateName = '';
      this.selectedWeekdays = [];
      this.availableTasks = [];
      this.templateTasks = [];
      this.disabledWeekdays = [];
      this.originalWeekdays = [];
      this.error = null;
      this._initialized = false;
      
      // Destroy sortable instance
      if (this.sortableTemplate) {
        this.sortableTemplate.destroy();
        this.sortableTemplate = null;
      }
    },
    
    /**
     * Load template data for editing
     */
    async loadTemplate() {
      try {
        this.loading = true;
        const template = await api.getTemplate(this.templateId);
        
        this.templateName = template.title;
        this.selectedWeekdays = [...template.weekdays];
        this.originalWeekdays = [...template.weekdays];
        
        // Load template tasks with order
        // Backend returns: {id: task_id, title, order, template_task_id}
        this.templateTasks = template.tasks.map(t => ({
          id: parseInt(t.id),  // This is the actual task ID
          title: t.title,
          order: t.order,
          template_task_id: t.template_task_id  // This is the TemplateTask ID
        }));
        
        // Load all tasks and filter out ones in template
        const allTasks = await api.getTasks();
        const templateTaskIds = this.templateTasks.map(t => parseInt(t.id));
        this.availableTasks = allTasks
          .filter(t => !templateTaskIds.includes(parseInt(t.id)))
          .map(t => ({ id: parseInt(t.id), title: t.title }));
        
        // Load weekday availability (current weekdays + available ones)
        await this.loadWeekdayAvailability();
        
      } catch (error) {
        console.error('Error loading template:', error);
        const errorMsg = 'Failed to load template';
        this.error = errorMsg;
        
        // Show error toast
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            message: errorMsg,
            type: 'error',
            duration: 5000
          }
        }));
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Load all available tasks
     */
    async loadAvailableTasks() {
      try {
        const tasks = await api.getTasks();
        this.availableTasks = tasks.map(t => ({ 
          id: t.id, 
          title: t.title 
        }));
      } catch (error) {
        console.error('Error loading tasks:', error);
        const errorMsg = 'Failed to load tasks';
        this.error = errorMsg;
        
        // Show error toast
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            message: errorMsg,
            type: 'error',
            duration: 5000
          }
        }));
      }
    },
    
    /**
     * Load weekday availability
     */
    async loadWeekdayAvailability() {
      try {
        const data = await api.getAvailableWeekdays();
        
        // In edit mode, can keep current weekdays + available ones
        if (this.isEditMode) {
          const assignedToOthers = data.assigned_weekdays.filter(
            day => !this.originalWeekdays.includes(day)
          );
          this.disabledWeekdays = assignedToOthers;
        } else {
          this.disabledWeekdays = data.assigned_weekdays || [];
        }
        
      } catch (error) {
        console.error('Error loading weekday availability:', error);
      }
    },
    
    /**
     * Initialize SortableJS for drag-drop
     */
    initSortable() {
      // Sortable for template tasks (reordering only)
      const templateEl = document.getElementById('template-tasks-list');
      if (templateEl && !this.sortableTemplate) {
        this.sortableTemplate = Sortable.create(templateEl, {
          animation: 150,
          handle: '.drag-handle',
          ghostClass: 'sortable-ghost',
          // Let SortableJS handle the drag freely
          // We'll read the final order when saving
        });
      }
    },
    
    /**
     * Add task by ID (auto-add on select)
     */
    addTaskById(taskId) {
      if (!taskId) return;
      
      const numericTaskId = parseInt(taskId);
      
      // Find the task in available tasks
      const task = this.availableTasks.find(t => parseInt(t.id) === numericTaskId);
      
      if (!task) return;
      
      // Add to template tasks at the end
      this.templateTasks.push({
        id: parseInt(task.id),
        title: task.title,
        order: this.templateTasks.length + 1
      });
      
      // Remove from available tasks
      this.availableTasks = this.availableTasks.filter(t => parseInt(t.id) !== numericTaskId);
    },
    
    /**
     * Remove task from template (return to available)
     */
    removeTask(task) {
      const numericTaskId = parseInt(task.id);
      
      // Remove from template
      this.templateTasks = this.templateTasks.filter(t => parseInt(t.id) !== numericTaskId);
      
      // Add back to available tasks
      this.availableTasks.push({
        id: numericTaskId,
        title: task.title
      });
      
      // Sort available tasks alphabetically
      this.availableTasks.sort((a, b) => a.title.localeCompare(b.title));
      
      // No need to renumber - final order determined on save
    },
    
    /**
     * Open modal to create new task
     * Uses the shared create task modal component
     */
    openCreateTaskModal() {
      // Use the shared window function that opens modal_create_task.html
      window.showCreateTaskModal({
        onSuccess: async (newTask) => {
          // Task is already created in the API by the modal
          // Add it directly to template tasks (not to available dropdown)
          
          // Add to template tasks
          this.templateTasks.push({
            id: newTask.id,
            title: newTask.title,
            order: this.templateTasks.length + 1
          });
          
          // Note: We don't add to availableTasks - it will only appear there
          // if the user removes it from the template (via removeTask method)
          
          // Show success message
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: {
              message: `Task "${newTask.title}" created and added to template`,
              type: 'success',
              duration: 3000
            }
          }));
        }
      });
    },
    
    /**
     * Validate form
     */
    validate() {
      if (!this.templateName.trim()) {
        const errorMsg = 'Template name is required';
        this.error = errorMsg;
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            message: errorMsg,
            type: 'warning',
            duration: 3000
          }
        }));
        return false;
      }
      
      if (this.selectedWeekdays.length === 0) {
        const errorMsg = 'Please select at least one weekday';
        this.error = errorMsg;
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            message: errorMsg,
            type: 'warning',
            duration: 3000
          }
        }));
        return false;
      }
      
      if (this.templateTasks.length === 0) {
        const errorMsg = 'Please add at least one task to the template';
        this.error = errorMsg;
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            message: errorMsg,
            type: 'warning',
            duration: 3000
          }
        }));
        return false;
      }
      
      return true;
    },
    
    /**
     * Save template
     */
    /**
     * Get final task order from DOM
     * Reads the current order after user has finished dragging
     */
    getFinalTaskOrder() {
      const templateEl = document.getElementById('template-tasks-list');
      if (!templateEl) {
        return this.templateTasks || [];
      }
      
      // Get all task elements with data-id in their current DOM order
      const taskElements = Array.from(templateEl.querySelectorAll('[data-id]'));
      const orderedIds = taskElements.map(el => el.getAttribute('data-id'));
      
      // Reorder templateTasks array to match DOM order
      const orderedTasks = [];
      orderedIds.forEach(id => {
        const numericId = parseInt(id);
        const task = this.templateTasks.find(t => parseInt(t.id) === numericId);
        if (task) {
          orderedTasks.push(task);
        }
      });
      
      return orderedTasks.length > 0 ? orderedTasks : (this.templateTasks || []);
    },
    
    async saveTemplate() {
      if (!this.validate()) {
        return;
      }
      
      try {
        this.saving = true;
        this.error = null;
        
        // Get final order from DOM (after user finished dragging)
        const orderedTasks = this.getFinalTaskOrder();
        
        // Prepare template payload
        const payload = {
          title: this.templateName.trim(),
          weekdays: this.selectedWeekdays,
          tasks: orderedTasks.map((t, idx) => ({
            task_id: parseInt(t.id),  // Ensure it's a number
            order: (idx + 1) * 10  // Use 10, 20, 30... for cleaner ordering
          }))
        };
        
        // Create or update template
        let result;
        if (this.isEditMode) {
          result = await api.updateTemplate(this.templateId, payload);
        } else {
          result = await api.createTemplate(payload);
        }
        
        // Notify parent store
        await Alpine.store('templateManager').handleTemplateSaved(!this.isEditMode);
        
      } catch (error) {
        console.error('Error saving template:', error);
        const errorMsg = error.message || 'Failed to save template';
        this.error = errorMsg;
        
        // Show error toast
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: {
            message: errorMsg,
            type: 'error',
            duration: 5000
          }
        }));
      } finally {
        this.saving = false;
      }
    },
    
    /**
     * GETTERS
     */
    get canSave() {
      return this.templateName.trim() && 
             this.selectedWeekdays.length > 0 && 
             this.templateTasks.length > 0 &&
             !this.saving;
    }
  });
}

// CRITICAL: Timing-safe initialization
if (window.Alpine) {
  defineTemplateBuilderStore();
} else {
  document.addEventListener('alpine:init', () => {
    defineTemplateBuilderStore();
  });
}
