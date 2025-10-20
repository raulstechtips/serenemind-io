from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views import View
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Q, Max
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
import json

from .models import Task, Template, TemplateTask, DailyTaskList, DailyTask, Weekday, Label


# ============================================
# TASK VIEWS (Master Task Library)
# ============================================

@method_decorator(login_required, name='dispatch')
class TaskListView(ListView):
    """List all tasks in the master library"""
    model = Task
    context_object_name = 'tasks'
    
    def get_queryset(self):
        # Filter by current user
        return Task.objects.filter(user=self.request.user).order_by('title')
    
    def render_to_response(self, context, **response_kwargs):
        tasks_data = []
        
        for task in context['tasks']:
            # Get templates that use this task
            template_tasks = TemplateTask.objects.filter(task=task).select_related('template')
            template_names = [tt.template.title for tt in template_tasks]
            
            tasks_data.append({
                'id': task.id,
                'title': task.title,
                'template_count': len(template_names),
                'template_names': template_names,
                'created_at': task.created_at,
                'updated_at': task.updated_at
            })
        
        return JsonResponse(tasks_data, safe=False)


@method_decorator(login_required, name='dispatch')
class TaskCreateView(View):
    """Create a new task in the master library"""
    
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            title = data.get('title', '').strip()
            
            if not title:
                return JsonResponse({'error': 'Title is required'}, status=400)
            
            # Associate with current user
            task = Task.objects.create(
                user=request.user,
                title=title
            )
            
            return JsonResponse({
                'id': task.id,
                'title': task.title,
                'template_count': 0,
                'template_names': [],
                'created_at': task.created_at,
                'updated_at': task.updated_at
            }, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


@method_decorator(login_required, name='dispatch')
class TaskDetailView(View):
    """Get, update, or delete a specific task"""
    
    def get(self, request, pk):
        # Ensure task belongs to current user
        task = get_object_or_404(Task, pk=pk, user=request.user)
        return JsonResponse({
            'id': task.id,
            'title': task.title,
            'created_at': task.created_at,
            'updated_at': task.updated_at
        })
    
    def put(self, request, pk):
        # Ensure task belongs to current user
        task = get_object_or_404(Task, pk=pk, user=request.user)
        try:
            data = json.loads(request.body)
            title = data.get('title', '').strip()
            
            if not title:
                return JsonResponse({'error': 'Title is required'}, status=400)
            
            task.title = title
            task.save()
            
            # Get template usage info
            template_tasks = TemplateTask.objects.filter(task=task).select_related('template')
            template_names = [tt.template.title for tt in template_tasks]
            
            return JsonResponse({
                'id': task.id,
                'title': task.title,
                'template_count': len(template_names),
                'template_names': template_names,
                'updated_at': task.updated_at
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    def delete(self, request, pk):
        """
        Delete task from master library.
        Warning: This will cascade delete TemplateTask instances.
        DailyTask.template_task will be set to null (SET_NULL).
        """
        # Ensure task belongs to current user
        task = get_object_or_404(Task, pk=pk, user=request.user)
        
        # Count how many templates use this task
        template_count = task.templatetask_set.count()
        
        task.delete()
        
        return JsonResponse({
            'message': f'Task deleted. Removed from {template_count} template(s).',
            'template_count': template_count
        }, status=200)


# ============================================
# LABEL VIEWS
# ============================================

@method_decorator(login_required, name='dispatch')
class LabelListView(ListView):
    """List all user's labels"""
    model = Label
    context_object_name = 'labels'
    
    def get_queryset(self):
        return Label.objects.filter(user=self.request.user).order_by('name')
    
    def render_to_response(self, context, **response_kwargs):
        labels_data = [
            {
                'id': str(label.id),
                'name': label.name,
                'color': label.color,
                'created_at': label.created_at,
                'updated_at': label.updated_at
            }
            for label in context['labels']
        ]
        return JsonResponse({'labels': labels_data}, safe=False)


@method_decorator(login_required, name='dispatch')
class LabelCreateView(View):
    """Create a new label"""
    
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            name = data.get('name', '').strip()[:50]
            color = data.get('color', '#E5E7EB').strip()
            
            if not name:
                return JsonResponse({'error': 'Label name is required'}, status=400)
            
            # Validate color format
            if color:
                import re
                if not re.match(r'^#[0-9A-Fa-f]{6}$', color):
                    return JsonResponse({
                        'error': 'Invalid color format. Use #RRGGBB'
                    }, status=400)
            
            # Check if label already exists for this user
            if Label.objects.filter(user=request.user, name=name).exists():
                return JsonResponse({
                    'error': f'Label "{name}" already exists'
                }, status=400)
            
            label = Label.objects.create(
                user=request.user,
                name=name,
                color=color
            )
            
            return JsonResponse({
                'id': str(label.id),
                'name': label.name,
                'color': label.color,
                'created_at': label.created_at,
                'updated_at': label.updated_at
            }, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


@method_decorator(login_required, name='dispatch')
class LabelDetailView(View):
    """Get, update, or delete a specific label"""
    
    def get(self, request, pk):
        label = get_object_or_404(Label, pk=pk, user=request.user)
        return JsonResponse({
            'id': str(label.id),
            'name': label.name,
            'color': label.color,
            'created_at': label.created_at,
            'updated_at': label.updated_at
        })
    
    def put(self, request, pk):
        label = get_object_or_404(Label, pk=pk, user=request.user)
        try:
            data = json.loads(request.body)
            
            if 'name' in data:
                new_name = data['name'].strip()[:50]
                if not new_name:
                    return JsonResponse({'error': 'Name cannot be empty'}, status=400)
                # Check uniqueness (excluding current label)
                if Label.objects.filter(user=request.user, name=new_name).exclude(pk=pk).exists():
                    return JsonResponse({'error': f'Label "{new_name}" already exists'}, status=400)
                label.name = new_name
            
            if 'color' in data:
                color = data['color'].strip()
                if color:
                    import re
                    if not re.match(r'^#[0-9A-Fa-f]{6}$', color):
                        return JsonResponse({'error': 'Invalid color format'}, status=400)
                label.color = color
            
            label.save()
            
            return JsonResponse({
                'id': str(label.id),
                'name': label.name,
                'color': label.color,
                'updated_at': label.updated_at
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    def delete(self, request, pk):
        label = get_object_or_404(Label, pk=pk, user=request.user)
        label.delete()
        return JsonResponse({'message': 'Label deleted successfully'})


# ============================================
# TEMPLATE VIEWS
# ============================================

@method_decorator(login_required, name='dispatch')
class TemplateListView(ListView):
    """List all templates"""
    model = Template
    context_object_name = 'templates'
    
    def get_queryset(self):
        # Filter by current user
        return Template.objects.filter(user=self.request.user).prefetch_related('template_tasks__task')
    
    def render_to_response(self, context, **response_kwargs):
        templates = []
        for template in context['templates']:
            tasks = [
                {
                    'id': tt.task.id,
                    'title': tt.task.title,
                    'order': tt.order
                }
                for tt in template.template_tasks.all().order_by('order')
            ]
            templates.append({
                'id': template.id,
                'title': template.title,
                'weekdays': template.weekdays,
                'tasks': tasks,
                'created_at': template.created_at,
                'updated_at': template.updated_at
            })
        
        return JsonResponse({'templates': templates}, safe=False)


@method_decorator(login_required, name='dispatch')
class TemplateCreateView(View):
    """Create a new template with tasks"""
    
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            title = data.get('title', '').strip()
            weekdays = data.get('weekdays', [])
            tasks = data.get('tasks', [])  # List of {'task_id': X, 'order': Y}
            
            if not title:
                return JsonResponse({'error': 'Title is required'}, status=400)
            
            for day in weekdays:
                if day not in Weekday.values:
                    return JsonResponse({'error': f'Invalid weekday: {day}'}, status=400)
            
            # Create template (validation happens in clean() method)
            # Associate with current user
            template = Template(
                user=request.user,
                title=title,
                weekdays=weekdays
            )
            template.save()  # This calls full_clean() which validates weekday uniqueness per user
            
            # Create TemplateTask instances
            for task_data in tasks:
                task_id = task_data.get('task_id')
                order = task_data.get('order')
                
                if not task_id or order is None:
                    template.delete()
                    return JsonResponse({'error': 'Each task must have task_id and order'}, status=400)
                
                # Ensure task belongs to current user
                task = get_object_or_404(Task, pk=task_id, user=request.user)
                TemplateTask.objects.create(
                    template=template,
                    task=task,
                    order=order
                )
            
            # Return created template
            template_tasks = [
                {
                    'id': tt.task.id,
                    'title': tt.task.title,
                    'order': tt.order
                }
                for tt in template.template_tasks.all().order_by('order')
            ]
            
            return JsonResponse({
                'id': template.id,
                'title': template.title,
                'weekdays': template.weekdays,
                'tasks': template_tasks,
                'created_at': template.created_at
            }, status=201)
            
        except ValidationError as e:
            return JsonResponse({'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


@method_decorator(login_required, name='dispatch')
class TemplateDetailView(View):
    """Get, update, or delete a specific template"""
    
    def get(self, request, pk):
        # Ensure template belongs to current user
        template = get_object_or_404(Template.objects.filter(user=request.user).prefetch_related('template_tasks__task'), pk=pk)
        
        tasks = [
            {
                'id': tt.task.id,
                'title': tt.task.title,
                'order': tt.order,
                'template_task_id': tt.id
            }
            for tt in template.template_tasks.all().order_by('order')
        ]
        
        return JsonResponse({
            'id': template.id,
            'title': template.title,
            'weekdays': template.weekdays,
            'tasks': tasks,
            'created_at': template.created_at,
            'updated_at': template.updated_at
        })
    
    def put(self, request, pk):
        """Update template (title, weekdays, tasks)"""
        # Ensure template belongs to current user
        template = get_object_or_404(Template, pk=pk, user=request.user)
        
        try:
            data = json.loads(request.body)
            title = data.get('title')
            weekdays = data.get('weekdays')
            tasks = data.get('tasks')  # List of {'task_id': X, 'order': Y}
            
            # Update title if provided
            if title:
                template.title = title.strip()
            
            # Update weekdays if provided
            if weekdays is not None:
                for day in weekdays:
                    if day not in Weekday.values:
                        return JsonResponse({'error': f'Invalid weekday: {day}'}, status=400)
                template.weekdays = weekdays
            
            # Save template (validates weekday uniqueness)
            template.save()
            
            # Update tasks if provided
            if tasks is not None:
                # Delete existing TemplateTask instances
                template.template_tasks.all().delete()
                
                # Create new ones
                for task_data in tasks:
                    task_id = task_data.get('task_id')
                    order = task_data.get('order')
                    
                    if not task_id or order is None:
                        return JsonResponse({'error': 'Each task must have task_id and order'}, status=400)
                    
                    # Ensure task belongs to current user
                    task = get_object_or_404(Task, pk=task_id, user=request.user)
                    TemplateTask.objects.create(
                        template=template,
                        task=task,
                        order=order
                    )
            
            # Return updated template
            template_tasks = [
                {
                    'id': tt.task.id,
                    'title': tt.task.title,
                    'order': tt.order
                }
                for tt in template.template_tasks.all().order_by('order')
            ]
            
            return JsonResponse({
                'id': template.id,
                'title': template.title,
                'weekdays': template.weekdays,
                'tasks': template_tasks,
                'updated_at': template.updated_at
            })
            
        except ValidationError as e:
            return JsonResponse({'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    def delete(self, request, pk):
        """
        Delete template.
        Note: Cannot delete if DailyTaskLists exist (PROTECT constraint).
        """
        # Ensure template belongs to current user
        template = get_object_or_404(Template, pk=pk, user=request.user)
        
        try:
            template.delete()
            return JsonResponse({'message': 'Template deleted successfully'}, status=200)
        except Exception as e:
            return JsonResponse({
                'error': 'Cannot delete template with existing daily task lists',
                'detail': str(e)
            }, status=400)


# ============================================
# DAILY TASK LIST VIEWS
# ============================================

@method_decorator(login_required, name='dispatch')
class DailyTaskListListView(ListView):
    """List all daily task lists"""
    model = DailyTaskList
    context_object_name = 'daily_task_lists'
    
    def get_queryset(self):
        # Optional filtering by date range
        start_date = self.request.GET.get('start_date')
        end_date = self.request.GET.get('end_date')
        
        # Filter by current user
        qs = DailyTaskList.objects.filter(user=self.request.user).select_related('template')
        
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        
        return qs.order_by('-date')
    
    def render_to_response(self, context, **response_kwargs):
        daily_lists = []
        for dtl in context['daily_task_lists']:
            daily_lists.append({
                'id': dtl.id,
                'date': dtl.date,
                'template': {
                    'id': dtl.template.id,
                    'title': dtl.template.title
                },
                'created_at': dtl.created_at
            })
        
        return JsonResponse({'daily_task_lists': daily_lists}, safe=False)


@method_decorator(login_required, name='dispatch')
class DailyTaskListCreateView(View):
    """Create a daily task list for a specific date"""
    
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            date = data.get('date')
            template_id = data.get('template_id')
            
            if not date:
                return JsonResponse({'error': 'Date is required'}, status=400)
            
            if not template_id:
                return JsonResponse({'error': 'Template ID is required'}, status=400)
            
            # Check if already exists FOR THIS USER
            if DailyTaskList.objects.filter(user=request.user, date=date).exists():
                return JsonResponse({'error': f'Daily task list already exists for {date}'}, status=400)
            
            # Verify template exists and belongs to current user
            try:
                template = Template.objects.prefetch_related('template_tasks__task').get(id=template_id, user=request.user)
            except Template.DoesNotExist:
                return JsonResponse({'error': f'Template with ID {template_id} not found'}, status=404)
            
            # Create with explicit template and user (creates tasks in save() method)
            daily_list = DailyTaskList.objects.create(
                user=request.user,
                date=date,
                template=template
            )
            
            # Refresh to get the latest data
            daily_list.refresh_from_db()
            
            # Get created tasks
            tasks = [
                {
                    'id': task.id,
                    'title': task.title,
                    'order': task.order,
                    'completed': task.completed,
                    'due_date': task.due_date
                }
                for task in daily_list.tasks.all().order_by('order')
            ]
            
            return JsonResponse({
                'id': daily_list.id,
                'date': daily_list.date,
                'template': {
                    'id': daily_list.template.id,
                    'title': daily_list.template.title
                },
                'tasks': tasks,
                'created_at': daily_list.created_at
            }, status=201)
            
        except ValidationError as e:
            return JsonResponse({'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


@method_decorator(login_required, name='dispatch')
class DailyTaskListDetailView(View):
    """Get or delete a specific daily task list"""
    
    def get(self, request, pk):
        # Ensure daily task list belongs to current user
        daily_list = get_object_or_404(
            DailyTaskList.objects.filter(user=request.user).select_related('template').prefetch_related('tasks'),
            pk=pk
        )
        
        tasks = [
            {
                'id': task.id,
                'title': task.title,
                'order': task.order,
                'completed': task.completed,
                'completed_at': task.completed_at,
                'due_date': task.due_date,
                'is_adhoc': task.is_adhoc
            }
            for task in daily_list.tasks.all().order_by('order')
        ]
        
        return JsonResponse({
            'id': daily_list.id,
            'date': daily_list.date,
            'template': {
                'id': daily_list.template.id,
                'title': daily_list.template.title,
                'weekdays': daily_list.template.weekdays
            },
            'tasks': tasks,
            'created_at': daily_list.created_at,
            'updated_at': daily_list.updated_at
        })
    
    def delete(self, request, pk):
        """Delete daily task list (cascades to tasks)"""
        # Ensure daily task list belongs to current user
        daily_list = get_object_or_404(DailyTaskList, pk=pk, user=request.user)
        date = daily_list.date
        daily_list.delete()
        
        return JsonResponse({
            'message': f'Daily task list for {date} deleted successfully'
        }, status=200)


@method_decorator(login_required, name='dispatch')
class DailyTaskListByDateView(View):
    """Get daily task list for a specific date"""
    
    def get(self, request, date):
        try:
            # Filter by current user
            daily_list = DailyTaskList.objects.filter(user=request.user).select_related('template').prefetch_related('tasks').get(date=date)
            
            tasks = [
                {
                    'id': task.id,
                    'title': task.title,
                    'order': task.order,
                    'completed': task.completed,
                    'completed_at': task.completed_at,
                    'due_date': task.due_date,
                    'is_adhoc': task.is_adhoc
                }
                for task in daily_list.tasks.all().order_by('order')
            ]
            
            return JsonResponse({
                'id': daily_list.id,
                'date': daily_list.date,
                'template': {
                    'id': daily_list.template.id,
                    'title': daily_list.template.title
                },
                'tasks': tasks
            })
            
        except DailyTaskList.DoesNotExist:
            return JsonResponse({
                'error': f'No daily task list found for {date}',
                'exists': False
            }, status=404)


# ============================================
# DAILY TASK VIEWS
# ============================================

@method_decorator(login_required, name='dispatch')
class DailyTaskDetailView(View):
    """Get, update, or delete a specific daily task"""
    
    def get(self, request, pk):
        # Ensure task belongs to current user
        task = get_object_or_404(DailyTask, pk=pk, user=request.user)
        
        response_data = {
            'id': task.id,
            'title': task.title,
            'order': task.order,
            'completed': task.completed,
            'completed_at': task.completed_at,
            'due_date': task.due_date,
            'is_adhoc': task.is_adhoc,
            'created_at': task.created_at,
            'updated_at': task.updated_at,
            'labels': [                                # NEW
                {
                    'id': str(label.id),
                    'name': label.name,
                    'color': label.color
                }
                for label in task.labels.all()
            ]
        }
        
        if task.daily_task_list:
            response_data['daily_task_list'] = {
                'id': task.daily_task_list.id,
                'date': task.daily_task_list.date
            }
        
        if task.template_task:
            response_data['template_task'] = {
                'id': task.template_task.id,
                'task_title': task.template_task.task.title,
                'template_title': task.template_task.template.title
            }
        
        return JsonResponse(response_data)
    
    def put(self, request, pk):
        """Update daily task (title, order, completed, etc.)"""
        # Ensure task belongs to current user
        task = get_object_or_404(DailyTask, pk=pk, user=request.user)
        
        try:
            data = json.loads(request.body)
            
            # Update fields if provided
            if 'title' in data:
                task.title = data['title'].strip()
            
            if 'order' in data:
                task.order = int(data['order'])
            
            # NEW: Update label assignment
            if 'label_id' in data:
                # Clear existing labels
                task.labels.clear()
                # Add new label if provided
                label_id = data['label_id']
                if label_id:
                    label = get_object_or_404(Label, id=label_id, user=request.user)
                    task.labels.add(label)
            
            if 'completed' in data:
                if data['completed'] and not task.completed:
                    # Mark as complete
                    task.mark_complete()
                elif not data['completed'] and task.completed:
                    # Mark as incomplete
                    task.mark_incomplete()
            
            if 'due_date' in data:
                task.due_date = data['due_date']
            
            task.save()
            
            return JsonResponse({
                'id': task.id,
                'title': task.title,
                'order': task.order,
                'completed': task.completed,
                'completed_at': task.completed_at,
                'due_date': task.due_date,
                'updated_at': task.updated_at,
                'labels': [
                    {'id': str(l.id), 'name': l.name, 'color': l.color}
                    for l in task.labels.all()
                ]
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    def delete(self, request, pk):
        """Delete daily task"""
        # Ensure task belongs to current user
        task = get_object_or_404(DailyTask, pk=pk, user=request.user)
        title = task.title
        task.delete()
        
        return JsonResponse({
            'message': f'Task "{title}" deleted successfully'
        }, status=200)


@method_decorator(login_required, name='dispatch')
class DailyTaskCompleteView(View):
    """Mark a daily task as complete"""
    
    def post(self, request, pk):
        # Ensure task belongs to current user
        task = get_object_or_404(DailyTask, pk=pk, user=request.user)
        
        if task.is_adhoc:
            # Set order to 0 when completing task
            task.order = 0
        task.mark_complete()
        
        return JsonResponse({
            'id': task.id,
            'title': task.title,
            'completed': task.completed,
            'completed_at': task.completed_at
        })


@method_decorator(login_required, name='dispatch')
class DailyTaskIncompleteView(View):
    """Mark a daily task as incomplete"""
    
    def post(self, request, pk):
        # Ensure task belongs to current user
        task = get_object_or_404(DailyTask, pk=pk, user=request.user)
        task.mark_incomplete()
        
        if task.is_adhoc:
            # Reassign order to bottom of incomplete adhoc tasks
            max_order = DailyTask.objects.filter(
                user=request.user,
                is_adhoc=True,
                completed=False
            ).aggregate(
                max_order=Max('order')
            )['max_order']
            
            task.order = (max_order or 0) + 10
        task.save()
        
        return JsonResponse({
            'id': task.id,
            'title': task.title,
            'completed': task.completed,
            'completed_at': task.completed_at
        })


# ============================================
# ADHOC TASK VIEWS
# ============================================

@method_decorator(login_required, name='dispatch')
class AdhocTaskListView(ListView):
    """List all adhoc tasks (not completed)"""
    model = DailyTask
    context_object_name = 'adhoc_tasks'
    
    def get_queryset(self):
        # Get parameters for filtering
        date_param = self.request.GET.get('date')
        completed = self.request.GET.get('completed', 'false').lower() == 'true'
        
        # Filter by current user
        qs = DailyTask.objects.filter(user=self.request.user, is_adhoc=True)
        
        if date_param:
            # When date is provided, filter completed tasks by completion date
            if completed:
                qs = qs.filter(completed=True, completed_at__date=date_param).order_by('-completed_at')
            else:
                # For incomplete tasks, don't filter by date (show all incomplete)
                qs = qs.filter(completed=False).order_by('order')
        else:
            # When no date provided, use completed parameter
            if completed:
                qs = qs.filter(completed=True).order_by('-completed_at')
            else:
                qs = qs.filter(completed=False).order_by('order')
        
        return qs
    
    def render_to_response(self, context, **response_kwargs):
        tasks = [
            {
                'id': task.id,
                'title': task.title,
                'due_date': task.due_date,
                'completed': task.completed,
                'completed_at': task.completed_at,
                'created_at': task.created_at,
                'order': task.order,  # Include order for drag-drop sorting
                'is_adhoc': task.is_adhoc,
                'labels': [                              # NEW: Return array of labels
                    {
                        'id': str(label.id),
                        'name': label.name,
                        'color': label.color
                    }
                    for label in task.labels.all()
                ]
            }
            for task in context['adhoc_tasks']
        ]
        
        return JsonResponse({'adhoc_tasks': tasks}, safe=False)


@method_decorator(login_required, name='dispatch')
class AdhocTaskCreateView(View):
    """Create a new adhoc task"""
    
    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            title = data.get('title', '').strip()
            due_date = data.get('due_date')
            label_id = data.get('label_id')  # NEW: Single label ID from frontend
            
            if not title:
                return JsonResponse({'error': 'Title is required'}, status=400)
            
            if not due_date:
                return JsonResponse({'error': 'Due date is required'}, status=400)
            
            # Validate label belongs to user (if provided)
            if label_id:
                if not Label.objects.filter(id=label_id, user=request.user).exists():
                    return JsonResponse({'error': 'Invalid label'}, status=400)
            
            # Get the highest order number for existing adhoc tasks FOR THIS USER
            max_order = DailyTask.objects.filter(
                user=request.user,
                is_adhoc=True,
                completed=False
            ).aggregate(
                max_order=Max('order')
            )['max_order']
            
            # Set order to next available (or start at 10 if no tasks exist)
            next_order = (max_order or 0) + 10
            
            # Create adhoc task for current user
            task = DailyTask.objects.create(
                user=request.user,
                title=title,
                due_date=due_date,
                is_adhoc=True,
                daily_task_list=None,
                template_task=None,
                order=next_order,
                completed=False
            )
            
            # Assign label (many-to-many)
            if label_id:
                task.labels.add(label_id)
            
            return JsonResponse({
                'id': task.id,
                'title': task.title,
                'due_date': task.due_date,
                'is_adhoc': task.is_adhoc,
                'completed': task.completed,
                'completed_at': task.completed_at,
                'created_at': task.created_at,
                'order': task.order,
                'labels': [
                    {'id': str(l.id), 'name': l.name, 'color': l.color}
                    for l in task.labels.all()
                ]
            }, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


# ============================================
# ANALYTICS / QUERY VIEWS
# ============================================

@method_decorator(login_required, name='dispatch')
class TaskCompletionStatsView(View):
    """Get completion statistics for template tasks"""
    
    def get(self, request):
        # Get all template tasks and their completion rates FOR THIS USER
        stats = []
        
        for template in Template.objects.filter(user=request.user).prefetch_related('template_tasks__task'):
            for tt in template.template_tasks.all():
                # Find all DailyTask instances from this template task
                daily_tasks = DailyTask.objects.filter(template_task=tt)
                total = daily_tasks.count()
                completed = daily_tasks.filter(completed=True).count()
                
                completion_rate = (completed / total * 100) if total > 0 else 0
                
                stats.append({
                    'template': template.title,
                    'task': tt.task.title,
                    'total_instances': total,
                    'completed_instances': completed,
                    'completion_rate': round(completion_rate, 2)
                })
        
        return JsonResponse({'stats': stats}, safe=False)


@method_decorator(login_required, name='dispatch')
class TodayScheduleView(View):
    """Get today's schedule (convenience view)"""
    
    def get(self, request):
        today = timezone.now().date()
        
        try:
            # Filter by current user
            daily_list = DailyTaskList.objects.filter(user=request.user).select_related('template').prefetch_related('tasks').get(date=today)
            
            tasks = [
                {
                    'id': task.id,
                    'title': task.title,
                    'order': task.order,
                    'completed': task.completed,
                    'completed_at': task.completed_at
                }
                for task in daily_list.tasks.all().order_by('order')
            ]
            
            return JsonResponse({
                'id': daily_list.id,
                'date': daily_list.date,
                'template': {
                    'id': daily_list.template.id,
                    'title': daily_list.template.title
                },
                'tasks': tasks
            })
            
        except DailyTaskList.DoesNotExist:
            return JsonResponse({
                'error': f'No task list created for today ({today})',
                'today': str(today),
                'exists': False
            }, status=404)
