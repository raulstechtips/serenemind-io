/**
 * Task List Sortable Component
 * Reusable Alpine.js component for drag-and-drop task lists
 * 
 * Usage in HTML:
 * <div x-data="taskListSortable({ 
 *     items: initialTasks,
 *     onSave: async (tasks) => { ... }
 * })">
 *     <ul x-ref="sortableList">
 *         <template x-for="task in items" :key="task.id">
 *             <li>
 *                 <span class="drag-handle">☰</span>
 *                 <span x-text="task.title"></span>
 *                 <span x-text="task.order"></span>
 *             </li>
 *         </template>
 *     </ul>
 *     <button x-show="hasChanges" @click="save()">Save Order</button>
 * </div>
 */

function taskListSortable(config = {}) {
    return {
        // Configuration
        items: config.items || [],
        onSave: config.onSave || null,
        listId: config.listId || 'sortable-list',
        handleClass: config.handleClass || '.drag-handle',
        
        // State
        hasChanges: false,
        isSaving: false,
        sortableInstance: null,
        originalOrder: [],
        
        /**
         * Initialize the sortable list
         */
        init() {
            // Store original order for change detection
            this.originalOrder = this.items.map(item => item.id);
            
            // Initialize SortableJS
            this.$nextTick(() => {
                this.initSortable();
            });
        },
        
        /**
         * Initialize SortableJS on the list
         */
        initSortable() {
            const listElement = this.$refs.sortableList;
            
            if (!listElement) {
                console.error('Sortable list element not found. Make sure to add x-ref="sortableList" to your list element.');
                return;
            }
            
            this.sortableInstance = Sortable.create(listElement, {
                animation: 150,
                handle: this.handleClass,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                chosenClass: 'sortable-chosen',
                
                onEnd: (evt) => {
                    this.handleDragEnd(evt);
                }
            });
        },
        
        /**
         * Handle drag end event
         */
        handleDragEnd(evt) {
            const { oldIndex, newIndex } = evt;
            
            // No change in position
            if (oldIndex === newIndex) {
                return;
            }
            
            // Move item in array
            const movedItem = this.items.splice(oldIndex, 1)[0];
            this.items.splice(newIndex, 0, movedItem);
            
            // Renumber all items with gaps of 10
            this.items = orderUtils.assignOrderNumbers(this.items);
            
            // Mark as changed
            this.hasChanges = true;
        },
        
        /**
         * Save the new order
         */
        async save() {
            if (!this.hasChanges || this.isSaving) {
                return;
            }
            
            if (!this.onSave) {
                console.error('No onSave callback provided to taskListSortable');
                return;
            }
            
            this.isSaving = true;
            
            try {
                // Call the save callback with updated tasks
                await this.onSave(this.items);
                
                // Update original order
                this.originalOrder = this.items.map(item => item.id);
                this.hasChanges = false;
                
            } catch (error) {
                console.error('Error saving order:', error);
                alert('Failed to save order. Please try again.');
            } finally {
                this.isSaving = false;
            }
        },
        
        /**
         * Cancel changes and restore original order
         */
        cancel() {
            if (!this.hasChanges) {
                return;
            }
            
            // Restore original order
            this.items = this.originalOrder.map(id => 
                this.items.find(item => item.id === id)
            );
            
            // Reassign order numbers
            this.items = orderUtils.assignOrderNumbers(this.items);
            
            this.hasChanges = false;
        },
        
        /**
         * Reset the sortable (useful for reloading data)
         */
        reset(newItems) {
            this.items = orderUtils.assignOrderNumbers(newItems);
            this.originalOrder = this.items.map(item => item.id);
            this.hasChanges = false;
        },
        
        /**
         * Destroy the sortable instance
         */
        destroy() {
            if (this.sortableInstance) {
                this.sortableInstance.destroy();
                this.sortableInstance = null;
            }
        }
    };
}

// Make globally available
window.taskListSortable = taskListSortable;

