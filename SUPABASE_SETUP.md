# Supabase Integration Setup

This guide will help you set up Supabase as the backend for your ChurchApp.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Node.js and npm installed
- Your ChurchApp project

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New project"
3. Fill in your project details:
   - Name: `ChurchApp` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select the closest region to your users
4. Click "Create new project"

Wait for the project to be fully provisioned (this may take a few minutes).

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon/public key**: Your anonymous key

## Step 3: Set Up Environment Variables

1. In your ChurchApp project root, create a `.env` file (or update if it exists)
2. Add your Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the placeholder values with your actual credentials.

## Step 4: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the entire contents of `supabase_schema.sql` from your project root
3. Click **Run** to execute the SQL and create your complete database schema

The comprehensive schema includes:
- **Core Tables**: members, events, attendance, donations, sermons, announcements
- **Supporting Tables**: ministries, member_ministries, event_registrations, user_roles
- **System Tables**: settings, file_attachments, audit_log, reports
- **Security**: Row Level Security (RLS) policies for all tables
- **Performance**: Optimized indexes for common queries
- **Automation**: Triggers for auto-generating receipt numbers and updating timestamps
- **Views**: Pre-built views for common reporting queries

## Step 5: Set Up File Storage

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the entire contents of `supabase_storage_member_photos.sql` from your project root
3. Click **Run** to execute the SQL and create the member photos storage bucket

This creates:
- **Storage Bucket**: `member-photos` for profile images
- **Public Access**: Images are publicly accessible for display
- **Security**: Only authenticated users can upload/update/delete photos
- **File Limits**: 5MB max size, image formats only (JPEG, PNG, GIF, WebP)

## Step 6: Configure Authentication (Optional)

If you want to enable user authentication:

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your authentication providers (Email, Google, etc.)
3. Set up email templates if using email authentication

## Step 7: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try logging in or accessing member data
3. Check the browser console for any errors

## Database Schema Overview

### Members Table
- Basic member information (name, email, phone, address)
- Membership status and join date
- Emergency contact information
- Profile image and notes

### Events Table
- Event details (title, description, date, time, location)
- Event type and capacity
- Recurring event support
- Organizer tracking

### Attendance Table
- Links members to events
- Check-in/check-out times
- Attendance status (present, absent, late)

### Donations Table
- Donation amounts and dates
- Payment methods and fund types
- Recurring donation support
- Receipt tracking

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- The anon key is safe to use in client-side code
- Never expose your service role key in client code
- Adjust RLS policies based on your specific security requirements

## Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables"**
   - Check that your `.env` file exists and contains the correct values
   - Make sure the variable names match exactly

2. **"Table doesn't exist"**
   - Ensure you ran the SQL setup script in the SQL Editor
   - Check that the table names match what's expected in the code

3. **Authentication errors**
   - Verify your Supabase project has authentication enabled
   - Check that your anon key is correct

4. **CORS errors**
   - Supabase handles CORS automatically, but make sure you're using the correct project URL

### Getting Help:

- Check the Supabase documentation: [supabase.com/docs](https://supabase.com/docs)
- View the integration guide: `src/examples/BACKEND_INTEGRATION_GUIDE.ts`
- Check browser console and network tab for detailed error messages

## Next Steps

Once Supabase is set up, you can:
- Start adding real data to your church management system
- Implement real-time features using Supabase subscriptions
- Add file storage for member photos and documents
- Set up automated backups and monitoring

Your ChurchApp is now connected to a production-ready backend!