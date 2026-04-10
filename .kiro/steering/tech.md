# Technology Stack

## Build System

**Vite 7.3.1** - Fast build tool with HMR (Hot Module Replacement)

## Core Technologies

- **React 19.2.0** - UI framework with modern hooks and concurrent features
- **TypeScript 5.9** - Strict type checking enabled
- **Tailwind CSS 4.2.1** - Utility-first CSS framework with Vite plugin
- **React Router DOM 7.14.0** - Client-side routing

## Backend & Database

- **Supabase** - PostgreSQL database with real-time subscriptions, authentication, and storage
- **@supabase/supabase-js 2.101.1** - Official Supabase client library

## Key Libraries

- **Framer Motion 12.35.0** - Animation library for smooth transitions
- **Recharts 3.8.1** - Charting library for data visualization
- **Lucide React 0.577.0** - Icon library
- **date-fns 4.1.0** - Date manipulation and formatting
- **Zod 4.3.6** - Schema validation for forms and API responses

## Development Tools

- **ESLint 9.39.1** - Code linting with TypeScript support
- **Vitest 4.1.2** - Unit testing framework
- **@testing-library/react 16.3.2** - Component testing utilities
- **vite-plugin-pwa 1.2.0** - Progressive Web App support

## Project Configuration

- **Module System**: ES Modules (type: "module")
- **TypeScript Config**: Strict mode, bundler resolution, path aliases (@/*)
- **Path Aliases**: `@/*` maps to `src/*`

## Common Commands

```bash
# Development
npm run dev              # Start dev server with HMR (http://localhost:5173)

# Building
npm run build            # TypeScript check + production build
npm run preview          # Preview production build locally

# Code Quality
npm run lint             # Run ESLint
npx tsc --noEmit        # Type check without emitting files

# Testing
npm run test             # Run Vitest tests
```

## Environment Variables

Required environment variables (see `.env.example`):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- Additional API and feature flag configurations

## PWA Configuration

- Service worker with Workbox for offline caching
- Manifest for installable app experience
- Font caching strategy for Google Fonts
- Auto-update registration type

## Browser Support

Modern browsers with ES2022 support. No IE11 support.
