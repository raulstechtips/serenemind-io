import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class PasswordComplexityValidator:
    """
    Validates that password contains:
    - At least one uppercase letter
    - At least one number
    - At least one special character
    """
    
    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _("Password must contain at least one uppercase letter."),
                code='password_no_upper',
            )
        
        if not re.search(r'\d', password):
            raise ValidationError(
                _("Password must contain at least one number."),
                code='password_no_number',
            )
        
        # Special characters: all non-alphanumeric characters on US keyboard
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:\'",.<>?/\\`~]', password):
            raise ValidationError(
                _("Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:'\",.<>?/\\`~)."),
                code='password_no_special',
            )
    
    def get_help_text(self):
        return _(
            "Your password must contain at least one uppercase letter, "
            "one number, and one special character (!@#$%^&*()_+-=[]{}|;:'\",.<>?/\\`~)."
        )

