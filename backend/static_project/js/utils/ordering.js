/**
 * Ordering Utility Functions
 * Simple, predictable task ordering for drag-and-drop
 * 
 * Philosophy: Keep it simple!
 * 1. User drags items to reorder (local state only)
 * 2. On save button click, renumber all tasks with gaps of 10
 * 3. Send batch update to backend
 * 
 * No complex gap calculations - just clean, predictable ordering.
 */

const orderUtils = {
    /**
     * Default gap between orders
     */
    DEFAULT_GAP: 10,
    
    /**
     * Renumber tasks based on current array position
     * This is the ONLY function you need for drag-and-drop!
     * 
     * @param {Array} tasks - Array of tasks in desired order
     * @returns {Array} - Tasks with updated order property
     * 
     * @example
     * // After user drags items around
     * this.tasks = orderUtils.assignOrderNumbers(this.tasks);
     * // Result: tasks[0].order = 10, tasks[1].order = 20, etc.
     */
    assignOrderNumbers(tasks) {
        return tasks.map((task, index) => ({
            ...task,
            order: (index + 1) * this.DEFAULT_GAP
        }));
    },
    
    /**
     * Extract just id and order for batch API update
     * Use this to prepare payload for backend
     * 
     * @param {Array} tasks - Tasks with order property
     * @returns {Array} - Array of {id, order} objects
     * 
     * @example
     * const payload = orderUtils.getOrderPayload(this.tasks);
     * await api.batchUpdateOrders(payload);
     */
    getOrderPayload(tasks) {
        return tasks.map(task => ({
            id: task.id,
            order: task.order
        }));
    },
    
    /**
     * Sort tasks by order property
     * 
     * @param {Array} tasks - Array of tasks
     * @param {boolean} ascending - Sort direction (default: true)
     * @returns {Array} - Sorted tasks
     */
    sortByOrder(tasks, ascending = true) {
        return [...tasks].sort((a, b) => {
            return ascending ? a.order - b.order : b.order - a.order;
        });
    },
    
    /**
     * Generate initial orders for new tasks
     * 
     * @param {Array} tasks - Tasks without order property
     * @returns {Array} - Tasks with order assigned
     */
    generateInitialOrders(tasks) {
        return this.assignOrderNumbers(tasks);
    }
};

// Make orderUtils globally available
window.orderUtils = orderUtils;
