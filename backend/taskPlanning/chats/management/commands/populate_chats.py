from django.core.management.base import BaseCommand
from django.db.models import Min
from chats.models import Messages, Chats

class Command(BaseCommand):
    help = 'Populate Chats model from existing Messages'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating it',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Get unique chat_id and user combinations from Messages
        unique_chats = (Messages.objects
                       .values('chat_id', 'user')
                       .annotate(earliest_message=Min('time_sent'))
                       .order_by('earliest_message'))

        created_count = 0
        skipped_count = 0

        for chat_data in unique_chats:
            chat_id = chat_data['chat_id']
            user_id = chat_data['user']
            earliest_time = chat_data['earliest_message']
            
            # Check if chat already exists
            if Chats.objects.filter(chat_id=chat_id, user_id=user_id).exists():
                skipped_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Chat {chat_id} for user {user_id} already exists - skipping')
                )
                continue
            
            if dry_run:
                self.stdout.write(
                    self.style.SUCCESS(f'Would create chat {chat_id} for user {user_id}')
                )
                created_count += 1
            else:
                # Create the chat entry
                chat = Chats.objects.create(
                    chat_id=chat_id,
                    user_id=user_id,
                    chat_name=None,  # Will be set later via the API
                )
                # Set the created_at to match the earliest message time
                chat.created_at = earliest_time
                chat.save(update_fields=['created_at'])
                
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created chat {chat_id} for user {user_id}')
                )

        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary: {"Would create" if dry_run else "Created"} {created_count} chats, '
                f'skipped {skipped_count} existing chats'
            )
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('This was a dry run. Use without --dry-run to actually create the chats.')
            )
