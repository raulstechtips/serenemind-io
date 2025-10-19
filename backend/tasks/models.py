from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
import uuid

from allauth.account.models import EmailAddress
# Create your models here.
class Weekday(models.TextChoices):
    MONDAY = "Monday", "Monday"
    TUESDAY = "Tuesday", "Tuesday"
    WEDNESDAY = "Wednesday", "Wednesday"
    THURSDAY = "Thursday", "Thursday"
    FRIDAY = "Friday", "Friday"
    SATURDAY = "Saturday", "Saturday"
    SUNDAY = "Sunday", "Sunday"

class Task(models.Model):
    """Master task library - tasks owned by specific users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tasks',
        help_text=_('User who owns this task')
    )
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['title']


class Template(models.Model):
    """Daily task templates - owned by specific users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='templates',
        help_text=_('User who owns this template')
    )
    title = models.CharField(max_length=255)
    tasks = models.ManyToManyField(Task, through='TemplateTask', related_name='templates')
    weekdays = ArrayField(
        models.CharField(max_length=20, choices=Weekday.choices),
        default=list,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['title']

class TemplateTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(Template, on_delete=models.CASCADE, related_name='template_tasks')
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    order = models.PositiveIntegerField()
    
    class Meta:
        ordering = ['order']
        unique_together = ['template', 'task']
    
    def __str__(self):
        return f"{self.template.title} - {self.task.title} (order: {self.order})"

class DailyTaskList(models.Model):
    """Daily task schedules - owned by specific users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_task_lists',
        help_text=_('User who owns this daily task list')
    )
    date = models.DateField()  # Removed unique=True - now unique per user
    template = models.ForeignKey(Template, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date']
        verbose_name = "Daily Task List"
        verbose_name_plural = "Daily Task Lists"
        unique_together = ['user', 'date']  # One schedule per day PER USER
    
    def __str__(self):
        return f"{self.template.title} - {self.date}"
    
    def save(self, *args, **kwargs):
        # Check if this is a new object by seeing if it exists in the database
        is_new = not self.pk or not DailyTaskList.objects.filter(pk=self.pk).exists()
        
        # Template is required
        if not self.template_id:
            raise ValidationError("Template is required to create a Daily Task List.")
        
        # Ensure template belongs to same user
        if self.template.user_id != self.user_id:
            raise ValidationError("Cannot use a template from another user.")
        
        super().save(*args, **kwargs)
        
        # Create DailyTask instances if this is a new schedule
        if is_new:
            self._create_daily_tasks()
    
    def _create_daily_tasks(self):
        """
        Creates DailyTask instances from the template.
        Tasks are COPIES - fully editable and independent.
        User is inherited from DailyTaskList.
        Uses gap-based ordering (order * 10) to allow insertions.
        """
        for template_task in self.template.template_tasks.all().order_by('order'):
            DailyTask.objects.create(
                user=self.user,  # Inherit user
                daily_task_list=self,
                template_task=template_task,
                title=template_task.task.title,
                due_date=self.date,
                order=template_task.order * 10,  # Gap-based: 10, 20, 30...
                is_adhoc=False,
                completed=False
            )

class DailyTask(models.Model):
    """Daily tasks - individual task instances owned by specific users"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_tasks',
        help_text=_('User who owns this task')
    )
    
    # Link to schedule (null for adhoc tasks)
    daily_task_list = models.ForeignKey(
        DailyTaskList,
        on_delete=models.CASCADE,
        related_name='tasks',
        null=True,
        blank=True,
        help_text="Null for adhoc tasks"
    )
    
    # Optional reference to original template task (for analytics)
    template_task = models.ForeignKey(
        TemplateTask,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Original template task (null for adhoc tasks)"
    )
    
    # Core fields - ALWAYS editable
    title = models.CharField(max_length=255)
    due_date = models.DateField()
    
    # Completion tracking
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Ordering (gap-based: 10, 20, 30 allows insertions)
    order = models.PositiveIntegerField(default=0)
    
    # Task type
    is_adhoc = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return f"{self.title} - {self.due_date}"
    
    def mark_complete(self):
        """Mark task as completed with timestamp"""
        self.completed = True
        self.completed_at = timezone.now()
        self.save()
    
    def mark_incomplete(self):
        """Mark task as incomplete"""
        self.completed = False
        self.completed_at = None
        self.save()
