/**
 * SUPABASE INTEGRATION GUIDE
 *
 * Guide for integrating the ChurchApp with Supabase backend
 * Includes configuration, setup instructions, and implementation patterns
 */

/**
 * SUPABASE SETUP
 *
 * 1. Create a Supabase project at https://supabase.com
 * 2. Get your project URL and anon key from the project settings
 * 3. Create the required database tables using the SQL schema below
 */

/**
 * DATABASE SCHEMA
 *
 * Run the complete SQL schema from `supabase_schema.sql` in your Supabase SQL editor.
 * This includes all tables, indexes, policies, and initial data for the ChurchApp.
 *
 * The schema includes:
 * - Core tables: members, events, attendance, donations, sermons, announcements
 * - Supporting tables: ministries, user roles, file attachments
 * - Audit and logging tables
 * - Row Level Security policies
 * - Performance indexes
 * - Useful views and functions
 */

/**
 * ENVIRONMENT SETUP
 *
 * Create a '.env' file in the project root with the following Supabase variables:
 *
 * ```env
 * # Supabase Configuration
 * VITE_SUPABASE_URL=https://your-project-id.supabase.co
 * VITE_SUPABASE_ANON_KEY=your-anon-key-here
 * ```
 *
 * You can find these values in your Supabase project dashboard under Settings > API.
 */

/**
 * IMPLEMENTATION PATTERNS
 *
 * === Pattern 1: Using Supabase Client Directly ===
 *
 * import { supabase } from '@/services/supabaseClient';
 *
 * async function getMembers() {
 *   try {
 *     const { data, error } = await supabase
 *       .from('members')
 *       .select('*')
 *       .limit(10);
 *
 *     if (error) throw error;
 *     return data;
 *   } catch (error) {
 *     console.error('Failed to fetch members:', error);
 *     throw error;
 *   }
 * }
 *
 * === Pattern 2: Using Supabase API Service Layer (Recommended) ===
 *
 * import { supabaseApi } from '@/services/supabaseApi';
 *
 * // The API service layer abstracts Supabase operations
 * // and provides typed, consistent interfaces
 *
 * const { data, count } = await supabaseApi.members.getMembers({ limit: 10 });
 * const member = await supabaseApi.members.getMember('member-id');
 * await supabaseApi.members.createMember({
 *   first_name: 'John',
 *   last_name: 'Doe',
 *   email: 'john@example.com',
 *   join_date: '2024-01-01'
 * });
 *
 * === Pattern 3: Using Main API Layer (For Existing Code) ===
 *
 * import { api } from '@/services/api';
 *
 * // The main API layer now uses Supabase under the hood
 * // Existing code continues to work without changes
 *
 * const members = await api.members.getMembers();
 * const member = await api.members.getMember(123);
 * 
 * const member = await api.members.getMember(id);
 * const members = await api.members.getMembers({ limit: 10 });
 * await api.members.createMember({ email: 'john@example.com' });
 * 
 * === Pattern 3: Using Data Hooks in Components ===
 * 
 * import { useMembers } from '@/hooks/useData';
 * 
 * function MembersList() {
 *   const { data, isLoading, error } = useMembers();
 *   
 *   if (isLoading) return <LoadingStates.ListSkeleton />;
 *   if (error) return <ErrorBoundary />;
 *   return <List items={data} />;
 * }
 */

/**
 * UPDATING API SERVICE LAYER
 * 
 * The API service in src/services/api.ts contains stub functions.
 * To integrate with a real backend:
 * 
 * 1. Replace stub functions with actual HTTP calls:
 * 
 *    // BEFORE (Stub)
 *    export async function getMembers(params?: GetMembersParams): Promise<PaginatedResponse<Member>> {
 *      // TODO: Replace with actual API call
 *      return {
 *        items: [],
 *        total: 0,
 *        page: 1,
 *        limit: 10,
 *      };
 *    }
 * 
 *    // AFTER (Real Implementation)
 *    export async function getMembers(params?: GetMembersParams): Promise<PaginatedResponse<Member>> {
 *      const response = await httpClient.get<PaginatedResponse<Member>>('/members', params);
 *      return response;
 *    }
 * 
 * 2. All endpoints should use httpClient which handles:
 *    - Request/response interceptors
 *    - Automatic token injection
 *    - Error handling and retries
 *    - Request timeouts
 * 
 * 3. Validation of responses:
 * 
 *    export async function getMember(id: string): Promise<Member> {
 *      const member = await httpClient.get<Member>(`/members/${id}`);
 *      
 *      // Validate required fields
 *      if (!member?.id) throw new Error('Invalid member data');
 *      
 *      return member;
 *    }
 */

/**
 * AUTHENTICATION FLOW
 * 
 * === Setup Authentication Interceptors ===
 * 
 * In src/main.tsx or App.tsx:
 * 
 * import { httpClient } from '@/services/httpClient';
 * import { setupAuthInterceptors } from '@/services/tokenManager';
 * import { authTokens } from '@/services/tokenManager';
 * 
 * // Setup interceptors when app starts
 * setupAuthInterceptors(httpClient);
 * 
 * === Login Flow ===
 * 
 * import { SessionManager, TokenManager } from '@/services/tokenManager';
 * 
 * async function handleLogin(email: string, password: string) {
 *   try {
 *     const response = await httpClient.post('/auth/login', { email, password });
 *     
 *     // Create session with returned tokens
 *     SessionManager.createSession({
 *       token: response.accessToken,
 *       refreshToken: response.refreshToken,
 *       expiresIn: response.expiresIn,
 *     });
 *     
 *     // Now all subsequent requests will include the token
 *     // via the request interceptor
 *     
 *     return true;
 *   } catch (error) {
 *     console.error('Login failed:', error);
 *     return false;
 *   }
 * }
 * 
 * === Logout Flow ===
 * 
 * function handleLogout() {
 *   SessionManager.destroySession();
 *   // User will be redirected to login page
 * }
 * 
 * === Checking Authentication Status ===
 * 
 * import { SessionManager } from '@/services/tokenManager';
 * 
 * function ProtectedRoute() {
 *   const isAuthenticated = SessionManager.isAuthenticated();
 *   
 *   if (!isAuthenticated) {
 *     return <Navigate to="/login" />;
 *   }
 *   
 *   return <YourComponent />;
 * }
 */

/**
 * ERROR HANDLING
 * 
 * === HTTP Client Errors ===
 * 
 * The httpClient throws ApiError for all failures:
 * 
 * import { ApiError } from '@/services/httpClient';
 * 
 * try {
 *   const data = await httpClient.get('/members');
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.log(error.message);  // Human-readable message
 *     console.log(error.code);     // Machine-readable code (HTTP_404, NETWORK_ERROR, etc)
 *     console.log(error.status);   // HTTP status code
 *     console.log(error.details);  // Additional error details
 *   }
 * }
 * 
 * === Common Error Codes ===
 * 
 * - NETWORK_ERROR: Network connectivity issue
 * - TIMEOUT_ERROR: Request exceeded timeout period
 * - HTTP_401: Unauthorized (invalid/expired token)
 * - HTTP_403: Forbidden (user lacks permissions)
 * - HTTP_404: Not found
 * - HTTP_409: Conflict (duplicate data)
 * - HTTP_422: Validation error
 * - HTTP_500: Server error
 * 
 * === Retry Logic ===
 * 
 * The httpClient automatically retries on:
 * - Network errors (status 0)
 * - Server errors (5xx)
 * - Rate limiting (429)
 * 
 * Retries use exponential backoff with configurable delay.
 * Non-retryable errors (4xx except 429) fail immediately.
 */

/**
 * INTERCEPTOR EXAMPLES
 * 
 * === Request Interceptor - Add Custom Headers ===
 * 
 * httpClient.useRequestInterceptor(async (config) => {
 *   config.headers = config.headers || {};
 *   config.headers['X-Client-Version'] = '1.0.0';
 *   return config;
 * });
 * 
 * === Response Interceptor - Transform Data ===
 * 
 * httpClient.useResponseInterceptor(async (response) => {
 *   // Transform snake_case response to camelCase
 *   if (response.data) {
 *     response.data = transformKeys(response.data);
 *   }
 *   return response;
 * });
 * 
 * === Error Interceptor - Log & Report Errors ===
 * 
 * httpClient.useErrorInterceptor(async (error) => {
 *   console.error('API Error:', error.code, error.message);
 *   
 *   // Could send to error tracking service here
 *   if (import.meta.env.VITE_ENABLE_ERROR_TRACKING) {
 *     await reportError(error);
 *   }
 *   
 *   throw error;
 * });
 */

/**
 * TESTING WITH MOCK ENDPOINT
 * 
 * For development without a backend:
 * 
 * 1. Use a mock API service:
 * 
 *    import { setUseMockApi } from '@/services/api';
 *    setUseMockApi(true);
 * 
 * 2. Or use json-server:
 * 
 *    npm install -g json-server
 *    json-server --watch db.json --port 3000
 * 
 * 3. Or use a service like Mirage.js for intercepting requests
 */

/**
 * DEPLOYMENT CHECKLIST
 * 
 * Before deploying to production:
 * 
 * ✓ Update VITE_API_BASE_URL to production endpoint
 * ✓ Set VITE_API_TIMEOUT appropriately (usually 30-60 seconds)
 * ✓ Configure VITE_API_MAX_RETRIES (usually 2-3)
 * ✓ Enable error tracking (VITE_ENABLE_ERROR_TRACKING)
 * ✓ Set log level to 'warn' (VITE_LOG_LEVEL)
 * ✓ Test authentication flow with real backend
 * ✓ Verify token refresh mechanism works
 * ✓ Test all CORS headers with backend
 * ✓ Verify SSL/TLS if using HTTPS
 * ✓ Load test with realistic concurrent requests
 * ✓ Monitor error rates and performance
 */

/**
 * TROUBLESHOOTING
 * 
 * === CORS Errors ===
 * Backend must include CORS headers:
 * - Access-Control-Allow-Origin: http://localhost:5173 (dev)
 * - Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
 * - Access-Control-Allow-Headers: Content-Type, Authorization
 * 
 * === "Request timeout" Errors ===
 * - Check if backend is running
 * - Increase VITE_API_TIMEOUT if operations are slow
 * - Check backend logs for long-running queries
 * 
 * === "401 Unauthorized" Errors ===
 * - Token may be expired or invalid
 * - Check localStorage for stored token
 * - Verify token format (should be "Bearer <token>")
 * - Check backend token validation logic
 * 
 * === "Network error" ===
 * - Check browser console Network tab
 * - Verify API_BASE_URL is correct
 * - Check CORS configuration
 * - Try simple ping endpoint first
 */

/**
 * MIGRATION CHECKLIST
 * 
 * To migrate from stubs to real API:
 * 
 * 1. ✓ Create httpClient (src/services/httpClient.ts)
 * 2. ✓ Create tokenManager (src/services/tokenManager.ts)
 * 3. □ Update api.ts to use httpClient
 * 4. □ Setup auth interceptors in App.tsx
 * 5. □ Test all endpoints with real backend
 * 6. □ Verify error handling works
 * 7. □ Load test with concurrent requests
 * 8. □ Deploy to staging
 * 9. □ Verify on staging with real API
 * 10. □ Deploy to production
 */

export {};
