# Project Structure

## Root Directory

```
├── public/              # Static assets (icons, manifest, favicon)
├── src/                 # Source code
├── supabase/           # Supabase functions and migrations
├── .kiro/              # Kiro configuration and steering rules
├── dist/               # Production build output
├── node_modules/       # Dependencies
└── *.sql               # Database migration scripts
```

## Source Directory (`src/`)

### Core Application Files
- `main.tsx` - Application entry point with error boundary
- `App.tsx` - Root component with routing configuration
- `App.css` - Global application styles
- `index.css` - Tailwind CSS imports and base styles

### Components (`src/components/`)
Reusable UI components organized by function:
- **Layout**: `Header.tsx`, `Sidebar.tsx`, `BottomNav.tsx`
- **Data Display**: `StatsCard.tsx`, `ActivityFeed.tsx`, `EmptyState.tsx`
- **Charts**: `AttendanceChart.tsx`, `DemographicsChart.tsx`, `DonationsChart.tsx`
- **Forms**: `FormInput.tsx`, `FormError.tsx`
- **Feedback**: `Notifications.tsx`, `LoadingStates.tsx`, `Skeleton.tsx`, `ErrorBoundary.tsx`
- **Domain-specific**: `EventsSection.tsx`, `MinistryGroups.tsx`, `UpcomingBirthdays.tsx`
- **Subfolders**: `members/` for member-specific components

### Pages (`src/pages/`)
Top-level route components:
- `Dashboard.tsx` - Main dashboard with stats and charts
- `Members.tsx` - Member directory and management
- `Attendance.tsx` - Attendance tracking
- `Donations.tsx` - Financial contributions
- `Events.tsx` - Event calendar and management
- `Sermons.tsx` - Sermon library
- `Announcements.tsx` - Church announcements
- `Reports.tsx` - Analytics and reporting
- `Settings.tsx` - Application settings
- `Profile.tsx` - Member profile view
- `Login.tsx` - Authentication
- `Visitors.tsx` - Visitor tracking
- `Expenses.tsx` - Expense management

### Services (`src/services/`)
API and backend integration:
- `supabaseClient.ts` - Supabase client initialization
- `supabaseApi.ts` - Supabase data access layer
- `api.ts` - Generic API client
- `httpClient.ts` - HTTP request wrapper
- `auth.roles.test.ts` - Authentication role tests
- `tokenManager.ts` - JWT token management

### Contexts (`src/contexts/`)
React Context providers for global state:
- `UIContext.tsx` - UI state (sidebar, loading, errors)
- `AuthContext.tsx` - Authentication state
- `APIContext.tsx` - API configuration and state

### Hooks (`src/hooks/`)
Custom React hooks:
- `useData.ts` - Data fetching hook
- `useAPI.ts` - API interaction hook
- `useForm.ts` - Form state management
- `useErrorHandler.ts` - Error handling utilities
- `useNotification.ts` - Notification system

### Utils (`src/utils/`)
Utility functions and helpers:
- `helpers.ts` - General utilities (formatDate, formatCurrency, validation, etc.)
- `validation.ts` - Form and data validation
- `sanitization.ts` - Input sanitization
- `errorHandler.ts` - Error handling utilities
- `performance.ts` - Performance monitoring
- `requestCache.ts` - Request caching
- `memberWorkflow.ts` - Member-specific workflows

### Constants (`src/constants/`)
Centralized configuration:
- `colors.ts` - Color definitions and gradients
- `options.ts` - Dropdown options and enums
- `statusConfig.ts` - Status configurations with helpers

### Types (`src/types/`)
TypeScript type definitions:
- `supabase.ts` - Supabase database types

### Examples (`src/examples/`)
Implementation guides (excluded from build):
- `BACKEND_INTEGRATION_GUIDE.ts`
- `FORM_VALIDATION_GUIDE.ts`
- `LOADING_STATES_GUIDE.ts`

## Database (`supabase/`)

SQL migration scripts for database schema and RLS policies.

## Key Conventions

### Import Paths
Use path alias `@/` for imports from `src/`:
```typescript
import { formatCurrency } from '@/utils/helpers';
import { useUI } from '@/contexts/UIContext';
```

### Component Organization
- One component per file
- Co-locate related components in subfolders
- Export default for main component
- Named exports for helper components

### File Naming
- Components: PascalCase (e.g., `StatsCard.tsx`)
- Utilities: camelCase (e.g., `helpers.ts`)
- Types: camelCase (e.g., `supabase.ts`)
- Tests: `*.test.ts` or `*.test.tsx`

### State Management
- Local state: `useState` for component-specific state
- Global state: Context API (UIContext, AuthContext, APIContext)
- Server state: Custom hooks (`useData`, `useAPI`)

### Styling
- Tailwind CSS utility classes
- No CSS modules or styled-components
- Global styles in `index.css` and `App.css`
- Responsive design with mobile-first approach
