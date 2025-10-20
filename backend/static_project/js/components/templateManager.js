/**
 * Template Manager Store
 * 
 * Global state management for templates page with:
 * - Weekly overview calendar
 * - Template list
 * - Template details view
 * - Drag-drop task reordering within templates
 * - CRUD operations
 * 
 * Usage:
 * <div x-data="{ init() { $store.templateManager.init() } }">
 */

function defineTemplateManagerStore() {
  Alpine.store('templateManager', {
    // STATE
    templates: [], // Always initialize as empty array
    selectedTemplate: null,
    
    // Loading states
    loading: true,
    savingOrder: false,
    
    // Weekly overview mapping (now arrays of templates)
    weeklyOverview: {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    },
    
    // Template details
    templateTasks: [],
    hasOrderChanges: false,
    
    // Modals
    showBuilderModal: false,
    
    // SortableJS instance
    sortableInstance: null,
    
    // Error handling
    error: null,
    successMessage: null,
    
    // Initialization guard
    _initialized: false,
    
    /**
     * Initialize store (idempotent)
     */
    async init() {
      if (this._initialized) return;
      this._initialized = true;
      await this.loadTemplates();
    },
    
    /**
     * Load all templates
     */
    async loadTemplates() {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await api.getTemplates();
        
        // Backend returns {templates: [...]} not just [...]
        const templateData = response.templates || response;
        
        // Ensure templates is always an array
        this.templates = Array.isArray(templateData) ? templateData : [];
        
        // Build weekly overview
        this.buildWeeklyOverview();
        
        // Select first template if none selected
        if (!this.selectedTemplate && this.templates.length > 0) {
          await this.selectTemplate(this.templates[0]);
        }
        
      } catch (error) {
        console.error('Error loading templates:', error);
        this.error = 'Failed to load templates';
        this.templates = []; // Ensure templates is still an array
      } finally {
        this.loading = false;
        
        // Hide global page loading overlay once initial data is loaded
        if (window.hidePageLoading) {
          window.hidePageLoading();
        }
      }
    },
    
    /**
     * Build weekly overview mapping
     */
    buildWeeklyOverview() {
      // Reset to empty arrays
      Object.keys(this.weeklyOverview).forEach(day => {
        this.weeklyOverview[day] = [];
      });
      
      // Safety check
      if (!Array.isArray(this.templates)) {
        console.error('templates is not an array:', this.templates);
        this.templates = [];
        return;
      }
      
      // Build array of templates per weekday
      this.templates.forEach(template => {
        if (template && Array.isArray(template.weekdays)) {
          template.weekdays.forEach(day => {
            this.weeklyOverview[day].push({
              id: template.id,
              title: template.title,
              taskCount: template.tasks ? template.tasks.length : 0
            });
          });
        }
      });
    },
    
    /**
     * Select template to view details
     */
    async selectTemplate(template) {
      try {
        // Load full template details
        const fullTemplate = await api.getTemplate(template.id);
        this.selectedTemplate = fullTemplate;
        
        // Load template tasks
        this.templateTasks = fullTemplate.tasks.map(t => ({
          id: t.task_id,
          title: t.title,
          order: t.order,
          template_task_id: t.id
        }));
        
        this.hasOrderChanges = false;
        
        // Initialize sortable on next tick
        setTimeout(() => {
          this.initSortable();
        }, 100);
        
      } catch (error) {
        console.error('Error loading template details:', error);
        this.error = 'Failed to load template details';
      }
    },
    
    /**
     * Handle weekday click in weekly overview
     * Opens create modal with pre-selected weekday when clicking empty weekday
     */
    selectTemplateByWeekday(weekday) {
      // Open create modal with this weekday pre-selected
      this.openCreateModal([weekday]);
    },
    
    /**
     * Open edit modal for specific template (used by mini-cards)
     * @param {object} templateInfo - {id, title, taskCount}
     */
    openEditModalById(templateInfo) {
      const template = this.templates.find(t => t.id === templateInfo.id);
      if (template) {
        this.openEditModal(template);
      }
    },
    
    /**
     * Initialize SortableJS for task reordering
     */
    initSortable() {
      const el = document.getElementById('template-details-tasks');
      if (el && !this.sortableInstance) {
        this.sortableInstance = Sortable.create(el, {
          animation: 150,
          handle: '.drag-handle',
          ghostClass: 'sortable-ghost',
          onEnd: (evt) => {
            this.handleTaskReordered(evt);
          }
        });
      }
    },
    
    /**
     * Handle task reordered
     */
    handleTaskReordered(evt) {
      // Move task in array
      const task = this.templateTasks.splice(evt.oldIndex, 1)[0];
      this.templateTasks.splice(evt.newIndex, 0, task);
      
      // Renumber orders
      this.renumberTasks();
      
      // Show save button
      this.hasOrderChanges = true;
    },
    
    /**
     * Renumber tasks (1, 2, 3...)
     */
    renumberTasks() {
      this.templateTasks = this.templateTasks.map((task, index) => ({
        ...task,
        order: index + 1
      }));
    },
    
    /**
     * Save task order changes
     */
    async saveTaskOrder() {
      if (!this.selectedTemplate) return;
      
      try {
        this.savingOrder = true;
        this.error = null;
        
        // Update template with new task order
        await api.updateTemplate(this.selectedTemplate.id, {
          title: this.selectedTemplate.title,
          weekdays: this.selectedTemplate.weekdays,
          tasks: this.templateTasks.map((t, idx) => ({
            task_id: t.id,
            order: idx + 1
          }))
        });
        
        this.hasOrderChanges = false;
        this.showSuccess('Task order updated successfully');
        
        // Reload to sync
        await this.loadTemplates();
        
      } catch (error) {
        console.error('Error saving task order:', error);
        this.error = 'Failed to save task order';
      } finally {
        this.savingOrder = false;
      }
    },
    
    /**
     * Open create template modal
     * @param {Array} preSelectedWeekdays - Optional array of weekdays to pre-select
     */
    openCreateModal(preSelectedWeekdays = []) {
      // Reset builder store for new template
      Alpine.store('templateBuilder').reset();
      Alpine.store('templateBuilder').isEditMode = false;
      Alpine.store('templateBuilder').templateId = null;
      
      // Pre-select weekdays if provided
      if (preSelectedWeekdays.length > 0) {
        Alpine.store('templateBuilder').selectedWeekdays = [...preSelectedWeekdays];
      }
      
      this.showBuilderModal = true;
      
      // Initialize builder on next tick
      setTimeout(() => {
        Alpine.store('templateBuilder').init();
      }, 100);
    },
    
    /**
     * Open edit template modal
     */
    openEditModal(template) {
      if (!template) return;
      
      // Set builder store for editing
      Alpine.store('templateBuilder').reset();
      Alpine.store('templateBuilder').isEditMode = true;
      Alpine.store('templateBuilder').templateId = template.id;
      this.showBuilderModal = true;
      
      // Initialize builder on next tick
      setTimeout(() => {
        Alpine.store('templateBuilder').init();
      }, 100);
    },
    
    /**
     * Close template builder modal
     */
    closeBuilderModal() {
      this.showBuilderModal = false;
      
      // Set builder to loading state so next open doesn't show stale data
      setTimeout(() => {
        Alpine.store('templateBuilder').loading = true;
      }, 300); // After modal close animation
    },
    
    /**
     * Handle template saved
     */
    async handleTemplateSaved(isNew) {
      if (isNew) {
        this.showSuccess('Template created successfully');
      } else {
        this.showSuccess('Template updated successfully');
      }
      
      // Reload templates
      await this.loadTemplates();
      
      // Close modal
      this.closeBuilderModal();
    },
    
    /**
     * Open delete confirmation modal
     */
    openDeleteModal(template) {
      window.showConfirmModal({
        title: 'Delete Template',
        message: `Are you sure you want to delete <strong>${template.title}</strong>?<br><br>This action cannot be undone.<br><br><span class="text-xs">Note: Templates in use by existing schedules cannot be deleted.</span>`,
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: async () => {
          await this.deleteTemplate(template.id);
        }
      });
    },
    
    /**
     * Open duplicate template modal
     */
    openDuplicateModal(template) {
      window.showDuplicateTemplateModal({
        templateId: template.id,
        originalName: template.title,
        onSuccess: async () => {
          // Success is already handled in duplicateTemplate method
        }
      });
    },

    /**
     * Duplicate template with new name
     * @param {string} templateId - Template ID to duplicate
     * @param {string} newName - New name for the duplicated template
     */
    async duplicateTemplate(templateId, newName) {
      if (!templateId || !newName) return;
      
      try {
        // Fetch the full template data
        const originalTemplate = await api.getTemplate(templateId);
        
        // Prepare payload with new name but same structure
        const payload = {
          title: newName,
          weekdays: originalTemplate.weekdays || [],
          tasks: (originalTemplate.tasks || []).map(t => ({
            task_id: t.id,  // The actual task ID
            order: t.order  // Preserve the exact same order from original
          }))
        };
        
        // Create the duplicate template
        await api.createTemplate(payload);
        
        // Show success message
        this.showSuccess(`Template "${newName}" created successfully`);
        
        // Reload templates to show the new duplicate
        await this.loadTemplates();
        
      } catch (error) {
        console.error('Error duplicating template:', error);
        const errorMsg = error.message || 'Failed to duplicate template';
        this.showError(errorMsg);
        throw error; // Re-throw so modal can handle it
      }
    },
    
    /**
     * Delete template
     */
    async deleteTemplate(templateId) {
      if (!templateId) return;
      
      try {
        await api.deleteTemplate(templateId);
        
        this.showSuccess('Template deleted successfully');
        
        // Clear selection if deleted template was selected
        if (this.selectedTemplate && this.selectedTemplate.id === templateId) {
          this.selectedTemplate = null;
          this.templateTasks = [];
        }
        
        // Reload templates
        await this.loadTemplates();
        
      } catch (error) {
        console.error('Error deleting template:', error);
        this.showError(error.message || 'Failed to delete template. It may be in use by existing schedules.');
      }
    },
    
    /**
     * Show success message
     */
    showSuccess(message) {
      // Show toast notification
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          message: message,
          type: 'success',
          duration: 3000
        }
      }));
      
      // Also set successMessage for inline display (if used)
      this.successMessage = message;
      setTimeout(() => {
        this.successMessage = null;
      }, 3000);
    },
    
    /**
     * Show error message
     */
    showError(message) {
      // Show toast notification
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          message: message,
          type: 'error',
          duration: 5000
        }
      }));
      
      // Also set error for inline display
      this.error = message;
    },
    
    /**
     * Get weekday short name
     */
    getWeekdayShort(weekday) {
      const shorts = {
        Monday: 'Mon',
        Tuesday: 'Tue',
        Wednesday: 'Wed',
        Thursday: 'Thu',
        Friday: 'Fri',
        Saturday: 'Sat',
        Sunday: 'Sun'
      };
      return shorts[weekday] || weekday;
    },
    
    /**
     * Format weekday list for display
     */
    formatWeekdays(weekdays) {
      if (!weekdays || weekdays.length === 0) return 'No days assigned';
      return weekdays.map(d => this.getWeekdayShort(d)).join(', ');
    },
    
    /**
     * GETTERS
     */
    get hasTemplates() {
      return this.templates.length > 0;
    },
    
    get weekdays() {
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    }
  });
}

// CRITICAL: Timing-safe initialization
if (window.Alpine) {
  defineTemplateManagerStore();
} else {
  document.addEventListener('alpine:init', () => {
    defineTemplateManagerStore();
  });
}
