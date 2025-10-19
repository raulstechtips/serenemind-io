from django import forms

class CustomSignupForm(forms.Form):
    """
    Custom signup form for additional user fields.
    This form extends the base allauth signup form to capture first_name and last_name.
    
    Per Allauth documentation, this should extend forms.Form and implement signup(request, user).
    The headless SignupInput will automatically inherit these fields.
    """
    first_name = forms.CharField(
        max_length=30, 
        label='First Name',
        required=True,
        widget=forms.TextInput(attrs={'placeholder': 'First Name'})
    )
    last_name = forms.CharField(
        max_length=30, 
        label='Last Name',
        required=True,
        widget=forms.TextInput(attrs={'placeholder': 'Last Name'})
    )

    def signup(self, request, user):
        """
        Called during signup to save additional user data.
        The user object is passed in and should be modified and saved.
        """
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        user.save()
