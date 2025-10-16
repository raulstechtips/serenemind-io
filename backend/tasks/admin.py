from django.contrib import admin
from .models import Task, Template, TemplateTask, DailyTaskList, DailyTask


# ============================================
# INLINE ADMINS
# ============================================

class TemplateTaskInline(admin.TabularInline):
    """Inline for managing tasks within a template"""
    model = TemplateTask
    extra = 1
    fields = ['task', 'order']
    ordering = ['order']


class DailyTaskInline(admin.TabularInline):
    """Inline for managing tasks within a daily task list"""
    model = DailyTask
    extra = 0
    fields = ['title', 'order', 'completed', 'completed_at']
    readonly_fields = ['completed_at']
    ordering = ['order']


# ============================================
# MODEL ADMINS
# ============================================

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """Admin for Task model"""
    list_display = ['title', 'user', 'created_at', 'updated_at']
    list_filter = ['user', 'created_at']
    search_fields = ['title', 'user__email']
    ordering = ['user', 'title']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    """Admin for Template model"""
    list_display = ['title', 'user', 'get_weekdays', 'get_task_count', 'created_at']
    search_fields = ['title', 'user__email']
    list_filter = ['user', 'weekdays', 'created_at']
    ordering = ['user', 'title']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [TemplateTaskInline]
    
    def get_weekdays(self, obj):
        """Display weekdays as comma-separated list"""
        return ', '.join(obj.weekdays) if obj.weekdays else 'None'
    get_weekdays.short_description = 'Weekdays'
    
    def get_task_count(self, obj):
        """Display number of tasks in template"""
        return obj.template_tasks.count()
    get_task_count.short_description = 'Task Count'


@admin.register(TemplateTask)
class TemplateTaskAdmin(admin.ModelAdmin):
    """Admin for TemplateTask model"""
    list_display = ['template', 'task', 'order', 'get_user']
    list_filter = ['template__user', 'template']
    search_fields = ['template__title', 'task__title', 'template__user__email']
    ordering = ['template__user', 'template', 'order']
    
    def get_user(self, obj):
        """Display user from template"""
        return obj.template.user.email
    get_user.short_description = 'User'
    get_user.admin_order_field = 'template__user'


@admin.register(DailyTaskList)
class DailyTaskListAdmin(admin.ModelAdmin):
    """Admin for DailyTaskList model"""
    list_display = ['date', 'user', 'template', 'get_task_count', 'get_completed_count', 'created_at']
    list_filter = ['user', 'template', 'date']
    search_fields = ['template__title', 'user__email']
    ordering = ['-date', 'user']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [DailyTaskInline]
    
    def get_task_count(self, obj):
        """Display total number of tasks"""
        return obj.tasks.count()
    get_task_count.short_description = 'Total Tasks'
    
    def get_completed_count(self, obj):
        """Display number of completed tasks"""
        return obj.tasks.filter(completed=True).count()
    get_completed_count.short_description = 'Completed'


@admin.register(DailyTask)
class DailyTaskAdmin(admin.ModelAdmin):
    """Admin for DailyTask model"""
    list_display = ['title', 'user', 'due_date', 'is_adhoc', 'completed', 'order', 'get_list_date']
    list_filter = ['user', 'is_adhoc', 'completed', 'due_date']
    search_fields = ['title', 'user__email']
    ordering = ['user', 'due_date', 'order']
    readonly_fields = ['completed_at', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Task Information', {
            'fields': ('title', 'due_date', 'order')
        }),
        ('Task Type', {
            'fields': ('is_adhoc', 'daily_task_list', 'template_task')
        }),
        ('Completion', {
            'fields': ('completed', 'completed_at')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_list_date(self, obj):
        """Display the date of the associated daily task list"""
        if obj.daily_task_list:
            return obj.daily_task_list.date
        return 'N/A (Adhoc)'
    get_list_date.short_description = 'List Date'
    
    actions = ['mark_completed', 'mark_incomplete']
    
    def mark_completed(self, request, queryset):
        """Action to mark selected tasks as completed"""
        for task in queryset:
            task.mark_complete()
        self.message_user(request, f'{queryset.count()} task(s) marked as completed.')
    mark_completed.short_description = 'Mark selected tasks as completed'
    
    def mark_incomplete(self, request, queryset):
        """Action to mark selected tasks as incomplete"""
        for task in queryset:
            task.mark_incomplete()
        self.message_user(request, f'{queryset.count()} task(s) marked as incomplete.')
    mark_incomplete.short_description = 'Mark selected tasks as incomplete'
