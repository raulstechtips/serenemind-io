from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
import uuid


class UserManager(BaseUserManager):
    """
    Custom user manager for email-based authentication.
    Required when USERNAME_FIELD is not 'username'.
    """
    
    def create_user(self, email, password=None, **extra_fields):
        """
        Create and return a regular user with email and password.
        This is called by Allauth during signup.
        """
        if not email:
            raise ValueError('The Email field must be set')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        
        # CRITICAL: set_password hashes the password and stores it properly
        if password:
            user.set_password(password)
        
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and return a superuser with email and password.
        Used by Django's createsuperuser command.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User model using email for authentication.
    Username is auto-generated for AbstractUser compatibility but not used for login.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Override username - auto-generated but not used for login
    username = models.CharField(
        max_length=150,
        unique=True,
        blank=True,
        help_text=_('Auto-generated from email'),
    )
    
    # Email is the primary identifier
    email = models.EmailField(
        _('email address'),
        unique=True,
        blank=False,
        null=False,
    )
    
    # Required profile information
    first_name = models.CharField(_('first name'), max_length=150, blank=False)
    last_name = models.CharField(_('last name'), max_length=150, blank=False)
    
    # Flags (from AbstractUser - no need to redefine, but keeping explicit for clarity)
    # is_staff - inherited from AbstractUser
    # is_superuser - inherited from AbstractUser
    # is_active - inherited from AbstractUser
    
    # Timestamps (from AbstractUser)
    # date_joined - inherited from AbstractUser
    # last_login - inherited from AbstractUser
    
    # Use email as username field for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    # Custom manager for email-based user creation
    objects = UserManager()
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.email
    
    def save(self, *args, **kwargs):
        # Auto-generate username from email if not set
        if not self.username:
            # Use email prefix + first 8 chars of UUID
            self.username = self.email.split('@')[0] + '_' + str(self.id)[:8]
        super().save(*args, **kwargs)
    
    def get_full_name(self):
        """Return first_name + last_name or email"""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.email
    
    def get_short_name(self):
        """Return first_name or email"""
        return self.first_name or self.email.split('@')[0]


class Profile(models.Model):
    """
    User profile with minimal fields.
    Automatically created for each user via signals.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        primary_key=True,
    )
    
    # Profile picture URL (stored in S3/MinIO)
    avatar = models.URLField(
        _('avatar URL'),
        max_length=500,
        blank=True,
        help_text=_('URL to profile picture in S3/MinIO'),
    )
    
    # Activity tracking
    last_activity = models.DateTimeField(
        _('last activity'),
        auto_now=True,
    )
    
    # Metadata
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('profile')
        verbose_name_plural = _('profiles')
    
    def __str__(self):
        return f"Profile for {self.user.email}"
    
    def get_avatar_display(self):
        """Return avatar URL or default FontAwesome icon class"""
        return self.avatar if self.avatar else 'fa-user'