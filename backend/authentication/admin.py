from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, Profile


class ProfileInline(admin.StackedInline):
    """Inline admin for Profile"""
    model = Profile
    can_delete = False
    fields = ('avatar', 'last_activity', 'created_at', 'updated_at')
    readonly_fields = ('last_activity', 'created_at', 'updated_at')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for User model"""
    inlines = (ProfileInline,)
    
    list_display = ('email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'date_joined')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ('date_joined', 'last_login')


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    """Admin for Profile model"""
    list_display = ('user', 'avatar_preview', 'last_activity', 'created_at')
    list_filter = ('last_activity', 'created_at')
    search_fields = ('user__email',)
    readonly_fields = ('last_activity', 'created_at', 'updated_at')
    
    def avatar_preview(self, obj):
        """Show avatar icon or 'No avatar'"""
        return 'Has avatar' if obj.avatar else 'Default icon'
    avatar_preview.short_description = 'Avatar'
