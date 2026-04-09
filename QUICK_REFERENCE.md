# Quick Reference - Church Management App Improvements

## 🔒 Security Improvements

### Rate Limiting (Login)
```typescript
// Automatically applied - 5 attempts, 5-minute lockout
// No code changes needed
```

### File Upload Validation
```typescript
// Automatically validates MIME types
const result = await api.members.uploadAndSetProfilePhoto(memberId, file);
// Only JPEG, PNG, WebP, GIF accepted
```

### Role Fallback
```typescript
// Now fails closed - denies access on error
// No code changes needed
```

## ⚡ Performance Improvements

### Fix Filter Dependencies
```typescript
// OLD - causes infinite re-fetches
useEffect(() => {
  loadData();
}, [filters]); // ❌ New object each render

// NEW - stable dependency
const stableFilters = useStableFilters(filters);
useEffect(() => {
  loadData();
}, [stableFilters]); // ✅ Stable reference
```

### Request Deduplication
```typescript
import { requestCache } from '../utils/requestCache';

// Automatically deduplicates concurrent requests
const data = await requestCache.execute(
  'members-list',
  () => api.members.getMembers(),
  { ttl: 5 * 60 * 1000 } // 5 min cache
);
```

### Clear Cache
```typescript
// Invalidate specific key
requestCache.invalidate('members-list');

// Invalidate pattern
requestCache.invalidatePattern(/members-.*/);

// Clear all
requestCache.clear();
```

## ♿ Accessibility Improvements

### Form Components
```typescript
// All form components now have proper ARIA attributes
<FormInput
  id="email"
  label="Email"
  error={errors.email}
  helperText="We'll never share your email"
  required
  aria-required
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? 'email-error' : 'email-helper'}
/>
```

### Error Messages
```typescript
// Errors are now properly announced
<div role="alert" id="email-error">
  {error}
</div>
```

## 🛠️ Error Handling

### Use Error Handler Hook
```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';

function MyComponent() {
  const { handleError, handleAsyncError } = useErrorHandler();

  // Async error handling
  const fetchData = async () => {
    const result = await handleAsyncError(
      () => api.getData(),
      { context: 'Fetching data' }
    );
    if (result) {
      // Use result
    }
  };

  // Sync error handling
  const handleClick = () => {
    try {
      doSomething();
    } catch (error) {
      handleError(error, { context: 'Button click' });
    }
  };
}
```

### Parse Errors
```typescript
import { parseError, getUserFriendlyMessage } from '../utils/errorHandler';

const appError = parseError(error, 'context');
const message = getUserFriendlyMessage(appError);
```

### Retry with Backoff
```typescript
import { retryWithBackoff } from '../utils/errorHandler';

const data = await retryWithBackoff(
  () => api.getData(),
  { maxAttempts: 3, initialDelayMs: 100 }
);
```

## 🔍 Input Validation & Sanitization

### Validate Member Data
```typescript
import { validateMemberData } from '../utils/sanitization';

const { valid, errors, data } = validateMemberData(formData);
if (!valid) {
  console.log('Validation errors:', errors);
}
```

### Validate Email
```typescript
import { isValidEmail } from '../utils/sanitization';

if (!isValidEmail(email)) {
  showError('Invalid email');
}
```

### Validate Phone
```typescript
import { isValidPhone } from '../utils/sanitization';

if (!isValidPhone(phone)) {
  showError('Invalid phone');
}
```

### Validate Date
```typescript
import { isValidDate } from '../utils/sanitization';

if (!isValidDate(dateStr)) {
  showError('Invalid date (use YYYY-MM-DD)');
}
```

### Sanitize Input
```typescript
import { sanitizeInput } from '../utils/sanitization';

const safe = sanitizeInput(userInput);
```

### Validate CSV Row
```typescript
import { validateCsvRow } from '../utils/sanitization';

const { valid, errors } = validateCsvRow(row, ['email', 'name']);
if (!valid) {
  console.log('CSV errors:', errors);
}
```

## 📊 Performance Monitoring

### Mark & Measure
```typescript
import { performanceMonitor } from '../utils/performance';

performanceMonitor.mark('operation-start');
// ... do work ...
const duration = performanceMonitor.measure('operation-start');
console.log(`Operation took ${duration}ms`);
```

### Measure Async
```typescript
const result = await performanceMonitor.measureAsync(
  'api-call',
  () => api.getData(),
  { endpoint: '/members' }
);
```

### Get Report
```typescript
const report = performanceMonitor.getReport();
console.log(report);
// {
//   'api-call': { count: 5, avg: 234, min: 100, max: 500 },
//   'render': { count: 10, avg: 45, min: 20, max: 120 }
// }
```

## 📋 Common Patterns

### Complete Data Fetch with Error Handling
```typescript
import { useErrorHandler } from '../hooks/useErrorHandler';
import { requestCache } from '../utils/requestCache';

function MyComponent() {
  const { handleAsyncError } = useErrorHandler();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await handleAsyncError(
        () => requestCache.execute(
          'my-data',
          () => api.getData(),
          { ttl: 5 * 60 * 1000 }
        ),
        { context: 'Fetching data' }
      );
      if (result) {
        setData(result);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;
  return <div>{/* render data */}</div>;
}
```

### Form with Validation
```typescript
import { validateMemberData } from '../utils/sanitization';
import { useErrorHandler } from '../hooks/useErrorHandler';

function MemberForm() {
  const { handleError } = useErrorHandler();
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { valid, errors: validationErrors, data } = validateMemberData(formData);
    if (!valid) {
      setErrors(validationErrors);
      return;
    }

    const result = await handleAsyncError(
      () => api.members.createMember(data),
      { context: 'Creating member' }
    );

    if (result) {
      // Success
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

## 🧪 Testing

### Test Error Handler
```typescript
import { parseError, getUserFriendlyMessage } from '../utils/errorHandler';

describe('errorHandler', () => {
  it('should parse errors', () => {
    const error = new Error('Test');
    const parsed = parseError(error);
    expect(parsed.message).toBe('Test');
  });

  it('should get user-friendly messages', () => {
    const error = { message: 'fetch failed' };
    const message = getUserFriendlyMessage(error);
    expect(message).toContain('Network error');
  });
});
```

### Test Request Cache
```typescript
import { requestCache } from '../utils/requestCache';

describe('requestCache', () => {
  it('should deduplicate requests', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return 'result';
    };

    const [r1, r2] = await Promise.all([
      requestCache.execute('test', fn),
      requestCache.execute('test', fn),
    ]);

    expect(callCount).toBe(1);
    expect(r1).toBe(r2);
  });
});
```

## 📚 Documentation

- **IMPROVEMENTS.md** - Detailed improvement list
- **TESTING_GUIDE.md** - Comprehensive testing procedures
- **IMPLEMENTATION_SUMMARY.md** - Implementation overview
- **QUICK_REFERENCE.md** - This file

## 🚀 Deployment Checklist

- [ ] All tests pass
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Code review approved
- [ ] Documentation updated

## 💡 Tips & Tricks

### Disable Error Notifications
```typescript
const result = await handleAsyncError(
  () => api.getData(),
  { showNotification: false } // Silent error handling
);
```

### Rethrow Errors
```typescript
try {
  handleError(error, { rethrow: true });
} catch (appError) {
  // Handle app error
}
```

### Cache Invalidation
```typescript
// After creating a member
requestCache.invalidatePattern(/members-.*/);
```

### Performance Debugging
```typescript
// Get all metrics
const metrics = performanceMonitor.getMetrics();

// Get average for specific operation
const avg = performanceMonitor.getAverageDuration('api-call');

// Get full report
const report = performanceMonitor.getReport();
```

## ❓ FAQ

**Q: Do I need to update existing code?**
A: No, all improvements are backward compatible. Use new utilities as needed.

**Q: How do I migrate to new error handling?**
A: Gradually replace try-catch blocks with `useErrorHandler` hook.

**Q: Will request cache cause stale data?**
A: No, set appropriate TTL. Default is no cache (TTL=0).

**Q: How do I test accessibility?**
A: See TESTING_GUIDE.md for detailed procedures.

**Q: Where do I report issues?**
A: Check console for errors, use error handler for debugging.

## 📞 Support

For questions or issues:
1. Check relevant documentation file
2. Review code comments
3. Check git history
4. Ask team lead
