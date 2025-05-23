from rest_framework import serializers
from django.contrib.auth.models import User
from users.models import Profile

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    name = serializers.CharField(write_only=True)  # Combined name input from frontend
    # userid = serializers.CharField(write_only=True)  # Custom field for user ID

    class Meta:
        model = User
        fields = ['username', 'password', 'name']

    def create(self, validated_data):
        # Extract the name and split it into first and last names
        full_name = validated_data.pop('name').strip()
        name_parts = full_name.split(" ", 1)  # Split into at most 2 parts
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # Extract role with default as SAHELI
        # role = validated_data.pop('role', 'ADMIN')

        # Create the user object
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
        )

        if User.objects.count() == 0:
            user.is_superuser = True
            user.is_staff = True
            user.save()
            Profile.objects.create(
                user=user,
                role='SAHELI'  # Default role for the first user
            )
        else:
            Profile.objects.create(
                user=user,
                role='PEASANT'  # Default role for new users
            )

        return user
    
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)
        role = validated_data.pop('role', None)

        if validated_data.get('name'):
            instance.first_name = validated_data.get('name').split(" ")[0]
            instance.last_name = validated_data.get('name').split(" ")[1] if len(validated_data.get('name').split(" ")) > 1 else ""

            instance.first_name = validated_data.get('first_name', instance.first_name)
            instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.username = validated_data.get('username', instance.username)
        if password:
            instance.set_password(password)

        profile = instance.profile

        profile.userid = validated_data.get('userid', profile.userid)
        if role:
            profile.role = role

        profile.save()
        instance.save()

        return instance