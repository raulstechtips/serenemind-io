from django.urls import path
from . import views

app_name = 'tasks'

urlpatterns = [
    # ============================================
    # TASK URLS (Master Task Library)
    # ============================================
    path('tasks/', views.TaskListView.as_view(), name='task-list'),
    path('tasks/create/', views.TaskCreateView.as_view(), name='task-create'),
    path('tasks/<uuid:pk>/', views.TaskDetailView.as_view(), name='task-detail'),
    
    # ============================================
    # TEMPLATE URLS
    # ============================================
    path('templates/', views.TemplateListView.as_view(), name='template-list'),
    path('templates/create/', views.TemplateCreateView.as_view(), name='template-create'),
    path('templates/<uuid:pk>/', views.TemplateDetailView.as_view(), name='template-detail'),
    
    # ============================================
    # DAILY TASK LIST URLS
    # ============================================
    path('daily-task-lists/', views.DailyTaskListListView.as_view(), name='daily-task-list-list'),
    path('daily-task-lists/create/', views.DailyTaskListCreateView.as_view(), name='daily-task-list-create'),
    path('daily-task-lists/<uuid:pk>/', views.DailyTaskListDetailView.as_view(), name='daily-task-list-detail'),
    path('daily-task-lists/date/<str:date>/', views.DailyTaskListByDateView.as_view(), name='daily-task-list-by-date'),
    path('daily-task-lists/today/', views.TodayScheduleView.as_view(), name='today-schedule'),
    
    # ============================================
    # DAILY TASK URLS
    # ============================================
    path('daily-tasks/<uuid:pk>/', views.DailyTaskDetailView.as_view(), name='daily-task-detail'),
    path('daily-tasks/<uuid:pk>/complete/', views.DailyTaskCompleteView.as_view(), name='daily-task-complete'),
    path('daily-tasks/<uuid:pk>/incomplete/', views.DailyTaskIncompleteView.as_view(), name='daily-task-incomplete'),
    
    # ============================================
    # ADHOC TASK URLS
    # ============================================
    path('adhoc-tasks/', views.AdhocTaskListView.as_view(), name='adhoc-task-list'),
    path('adhoc-tasks/create/', views.AdhocTaskCreateView.as_view(), name='adhoc-task-create'),
    
    # ============================================
    # ANALYTICS URLS
    # ============================================
    path('analytics/completion-stats/', views.TaskCompletionStatsView.as_view(), name='completion-stats'),
]

