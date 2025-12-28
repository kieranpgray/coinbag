# Supabase Database Setup

This document outlines the Supabase database configuration for the Moneybags application, including authentication integration with Clerk.

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Data Source Toggle
VITE_DATA_SOURCE=mock  # Change to 'supabase' when ready
```

## Supabase Project Setup

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Choose your database password and region

2. **Get Project Credentials**:
   - Copy the Project URL and anon/public key from your project settings
   - Add them to your `.env` file

## Clerk JWT Integration

### Configure Supabase Authentication

1. **Go to Authentication Settings**:
   - In your Supabase dashboard, navigate to Authentication → Settings

2. **Configure External OAuth Provider**:
   - This setup requires configuring Supabase to accept Clerk JWTs
   - **Note**: This configuration must be done in the Supabase dashboard and cannot be fully automated

3. **JWT Configuration**:
   - **JWT Secret**: Copy from your Clerk dashboard (API Keys → JWT Public Key)
   - **Issuer**: `https://your-app.clerk.accounts.dev` (from Clerk dashboard)
   - **Audience**: Your Clerk Application ID (from Clerk dashboard)

### Manual Setup Steps (Required)

Since Clerk JWT integration requires dashboard configuration, follow these steps:

1. **Get Clerk JWT Configuration**:
   - Go to your Clerk dashboard
   - Navigate to API Keys → JWT Public Key
   - Copy the JWKS endpoint URL

2. **Configure Supabase Auth**:
   - In Supabase Dashboard → Authentication → Settings
   - Enable "Enable JWT" or configure custom JWT provider
   - Set the JWKS URL from Clerk
   - Configure issuer and audience matching your Clerk app

3. **Test Integration**:
   - Use the Clerk JWT debugger to verify token format
   - Ensure Supabase accepts the `Authorization: Bearer <clerk-jwt>` header

## Database Schema

### Subscriptions Table

The following SQL will be generated for the subscriptions table with RLS policies:

```sql
-- Create subscriptions table
CREATE TABLE subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'fortnightly', 'monthly', 'yearly')),
  charge_date date NOT NULL,
  next_due_date date NOT NULL,
  category text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user data isolation
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Client Configuration

### Supabase Client (`src/lib/supabaseClient.ts`)

The Supabase client is configured to automatically include Clerk JWTs:

```typescript
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';

// In your React components:
const { getToken, userId } = useAuth();

const supabase = await createAuthenticatedSupabaseClient(getToken);
// Now all requests include the Clerk JWT in Authorization header
```

### Request Flow

1. **Client makes request** to Supabase
2. **Clerk hook** (`getToken()`) fetches fresh JWT
3. **JWT is added** to `Authorization: Bearer <token>` header
4. **Supabase validates** JWT against configured JWKS
5. **RLS policies** filter data by `auth.uid()`

## Security Considerations

### Row Level Security (RLS)
- All tables use RLS to ensure users only access their own data
- Policies are scoped to `auth.uid()` which maps to Clerk's user ID
- No direct user_id parameters in client requests (handled by RLS)

### Authentication
- Clerk handles all user authentication
- Supabase only validates JWTs, doesn't manage user sessions
- Token refresh is handled automatically by Clerk

### Data Validation
- Zod schemas validate data on both client and server
- Database constraints enforce data integrity
- Business logic validation happens in service layer

## Development vs Production

### Development
- Use Supabase's local development environment
- Mock data source for faster iteration
- Test with Clerk development keys

### Production
- Use Supabase production project
- Enable production Clerk keys
- Monitor RLS policy performance

## Migration Strategy

### Incremental Migration
1. **Start with mock data**: `VITE_DATA_SOURCE=mock`
2. **Add Supabase schema**: Run migrations
3. **Configure auth integration**: Set up JWT validation
4. **Switch data source**: `VITE_DATA_SOURCE=supabase`
5. **Remove mock code**: Clean up after verification

### Rollback Plan
- Switch `VITE_DATA_SOURCE` back to `mock`
- Mock implementation remains intact
- No data loss during rollback

## Troubleshooting

### Common Issues

1. **"JWT invalid" errors**:
   - Verify JWKS URL in Supabase dashboard
   - Check issuer and audience match Clerk configuration
   - Ensure JWT hasn't expired

2. **RLS policy violations**:
   - Confirm `auth.uid()` matches user_id in database
   - Check that JWT contains correct user identity

3. **Connection errors**:
   - Verify Supabase URL and anon key
   - Check network connectivity
   - Ensure CORS is configured for your domain

### Debug Mode

Enable Supabase debug logging:

```typescript
// In development
const supabase = createClient(url, key, {
  auth: { debug: true }
});
```

## Performance Optimization

### Connection Pooling
- Supabase handles connection pooling automatically
- No client-side connection management needed

### Query Optimization
- Use Supabase's built-in query optimization
- Leverage database indexes on frequently queried columns
- Consider view tables for complex aggregations

### Caching Strategy
- React Query handles client-side caching
- Supabase real-time subscriptions for live updates (future feature)

## Next Steps

After completing subscriptions migration:

1. **Migrate Assets table** (similar RLS pattern)
2. **Migrate Liabilities table** (similar RLS pattern)
3. **Add dashboard aggregations** (database views/functions)
4. **Implement real-time updates** (Supabase subscriptions)
5. **Add audit logging** (optional enhancement)
