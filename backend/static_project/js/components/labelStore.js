/**
 * Label Store - Alpine.js Store
 * Manages user labels: CRUD operations, color palette
 * Follows Alpine.store() pattern for Django template compatibility
 */

function defineLabelStore() {
    Alpine.store('labels', {
        // STATE
        labels: [],
        loading: false,
        error: null,
        _initialized: false,

        // Predefined color palette
        colorPalette: [
            '#FDE68A', '#BFDBFE', '#FBCFE8', '#DCFCE7', '#E9D5FF', '#FEE2E2',
            '#FFE4E6', '#D1FAE5', '#FFF7ED', '#E0E7FF', '#FEF3C7', '#DBEAFE'
        ],

        // INITIALIZATION
        async init() {
            if (this._initialized) return;
            this._initialized = true;
            await this.loadLabels();
        },

        // ACTIONS
        async loadLabels() {
            this.loading = true;
            this.error = null;
            try {
                const response = await api.getLabels();
                this.labels = response.labels || [];
            } catch (error) {
                this.error = error.message;
                console.error('Failed to load labels:', error);
            } finally {
                this.loading = false;
            }
        },

        async createLabel(name, color) {
            this.loading = true;
            this.error = null;
            try {
                const response = await api.createLabel({ name, color });
                this.labels.push(response);
                await this.loadLabels(); // Reload to ensure sync
                return response;
            } catch (error) {
                this.error = error.message;
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async updateLabel(labelId, updates) {
            try {
                const response = await api.updateLabel(labelId, updates);
                const index = this.labels.findIndex(l => l.id === labelId);
                if (index > -1) {
                    this.labels[index] = response;
                }
                return response;
            } catch (error) {
                this.error = error.message;
                throw error;
            }
        },

        async deleteLabel(labelId) {
            try {
                await api.deleteLabel(labelId);
                this.labels = this.labels.filter(l => l.id !== labelId);
            } catch (error) {
                this.error = error.message;
                throw error;
            }
        },

        // GETTERS
        getLabelById(id) {
            return this.labels.find(l => l.id === id);
        },

        get sortedLabels() {
            return [...this.labels].sort((a, b) => a.name.localeCompare(b.name));
        }
    });
}

// Timing-safe initialization
if (window.Alpine) {
    defineLabelStore();
} else {
    document.addEventListener('alpine:init', defineLabelStore);
}
