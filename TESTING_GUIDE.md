# Testing Guide - Church Management App

This guide provides comprehensive testing procedures for the improvements made to the application.

## Security Testing

### 1. Login Rate Limiting

**Test Case: Verify rate limiting blocks brute force attempts**

1. Navigate to the login page
2. Enter incorrect credentials 5 times
3. Verify error message shows: "Too many failed attempts. Please try again in 5 minutes."
4. Attempt to login again immediately
5. Verify login is blocked with countdown message
6. Wait 5 minutes and verify login works again

**Expected Result**: After 5 failed attempts, login is blocked for 5 minutes.

### 2. Role Fallback Security

**Test Case: Verify role check fails closed**

1. Sign in as a regular member
2. Open browser DevTools → Network tab
3. Find the role check API call
4. Simulate failure by blocking the request (DevTools → Network conditions → Offline)
5. Refresh the page
6. Verify user is treated as a regular member (no admin features visible)
7. Verify no elevated access is granted

**Expected Result**: When role API fails, user gets member-level access, not admin access.

### 3. File Upload Validation

**Test Case: Verify only image files are accepted**

1. Navigate to Members page
2. Click "Add Member" button
3. Try to upload a non-image file (e.g., .txt, .pdf, .exe)
4. Verify error message: "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed."
5. Upload a valid image (JPEG, PNG, WebP, or GIF)
6. Verify upload succeeds

**Expected Result**: Only image files are accepted; other file types are rejected.

### 4. Error Message Sanitization

**Test Case: Verify error messages don't expose internals**

1. Trigger various errors (network error, permission error, validation error)
2. Check error messages in UI
3. Verify messages are user-friendly and don't mention:
   - Database table names
   - RLS policy details
   - Internal API structure
   - SQL errors

**Expected Result**: All error messages are user-friendly and don't expose system internals.

## Performance Testing

### 1. Filter Dependency Fix

**Test Case: Verify no duplicate requests on filter changes**

1. Navigate to Members page
2. Open browser DevTools → Network tab
3. Change the status filter
4. Observe network requests
5. Verify only ONE request is made (not multiple)
6. Change ministry filter
7. Verify only ONE request is made
8. Change search query
9. Verify only ONE request is made

**Expected Result**: Each filter change triggers exactly one API request.

### 2. Request Deduplication

**Test Case: Verify concurrent identical requests are deduplicated**

1. Open browser DevTools → Network tab
2. Rapidly click "Refresh" button multiple times
3. Observe network requests
4. Verify only ONE request is made (not multiple)
5. Wait for response
6. Verify data loads correctly

**Expected Result**: Concurrent identical requests are merged into one.

### 3. Dashboard Polling

**Test Case: Verify polling interval is cleaned up**

1. Navigate to Dashboard
2. Open browser DevTools → Console
3. Wait 5 minutes
4. Navigate away from Dashboard
5. Navigate back to Dashboard
6. Verify no duplicate polling intervals are running
7. Check memory usage (should not increase over time)

**Expected Result**: Polling intervals are properly cleaned up when component unmounts.

### 4. Memory Leak Detection

**Test Case: Verify no memory leaks over extended use**

1. Open browser DevTools → Memory tab
2. Take heap snapshot (baseline)
3. Navigate through multiple pages
4. Perform various actions (add, edit, delete members)
5. Navigate back to same pages
6. Take another heap snapshot
7. Compare snapshots
8. Verify memory usage is similar (no significant increase)

**Expected Result**: Memory usage remains stable over time.

## Accessibility Testing

### 1. Screen Reader Testing

**Test Case: Verify form fields are properly announced**

Using NVDA (Windows) or VoiceOver (Mac):

1. Navigate to a form (e.g., Add Member modal)
2. Tab through form fields
3. Verify screen reader announces:
   - Field label
   - Field type (text input, select, etc.)
   - Required status (if applicable)
   - Error message (if present)
4. Fill in invalid data
5. Verify error message is announced
6. Correct the data
7. Verify error is cleared and announced

**Expected Result**: All form elements are properly announced with correct context.

### 2. Keyboard Navigation

**Test Case: Verify all functionality is keyboard accessible**

1. Disable mouse (or use keyboard only)
2. Navigate through the app using Tab, Shift+Tab, Enter, Space, Arrow keys
3. Verify all buttons are reachable
4. Verify all form fields are reachable
5. Verify all interactive elements work with keyboard
6. Verify focus is visible at all times
7. Verify focus order is logical

**Expected Result**: All functionality is accessible via keyboard.

### 3. Color Contrast

**Test Case: Verify sufficient color contrast**

Using a tool like WebAIM Contrast Checker:

1. Check all text colors against backgrounds
2. Verify WCAG AA compliance (4.5:1 for normal text, 3:1 for large text)
3. Check status indicators (not color-only)
4. Check error messages
5. Check disabled states

**Expected Result**: All text meets WCAG AA contrast requirements.

### 4. Focus Management

**Test Case: Verify focus is properly managed in modals**

1. Open a modal (e.g., Add Member)
2. Verify focus moves to modal
3. Tab through modal fields
4. Verify focus doesn't escape modal
5. Close modal (Escape key)
6. Verify focus returns to trigger button

**Expected Result**: Focus is properly trapped in modals and restored on close.

## Error Handling Testing

### 1. Network Error Recovery

**Test Case: Verify app handles network errors gracefully**

1. Open DevTools → Network tab
2. Set network to "Offline"
3. Try to perform an action (e.g., add member)
4. Verify error message is shown
5. Verify user can retry
6. Set network back to "Online"
7. Click retry
8. Verify action succeeds

**Expected Result**: Network errors are handled gracefully with retry option.

### 2. API Error Handling

**Test Case: Verify various API errors are handled**

1. Trigger 400 error (invalid input)
   - Verify user-friendly message
2. Trigger 401 error (unauthorized)
   - Verify user is prompted to sign in
3. Trigger 403 error (forbidden)
   - Verify permission denied message
4. Trigger 404 error (not found)
   - Verify item not found message
5. Trigger 500 error (server error)
   - Verify server error message with retry option

**Expected Result**: Each error type shows appropriate user-friendly message.

### 3. Validation Error Display

**Test Case: Verify validation errors are clearly displayed**

1. Open Add Member form
2. Leave required fields empty
3. Click Submit
4. Verify all validation errors are shown
5. Verify errors are linked to fields (aria-describedby)
6. Verify error icons are visible
7. Fix one error
8. Verify that error is cleared
9. Submit again
10. Verify remaining errors are shown

**Expected Result**: Validation errors are clearly displayed and linked to fields.

## Data Validation Testing

### 1. Email Validation

**Test Case: Verify email validation**

Valid emails:
- user@example.com ✓
- user.name@example.co.uk ✓
- user+tag@example.com ✓

Invalid emails:
- user@example ✗
- @example.com ✗
- user@.com ✗
- user name@example.com ✗

**Expected Result**: Only valid emails are accepted.

### 2. Phone Validation

**Test Case: Verify phone validation**

Valid phones:
- 1234567890 ✓
- (123) 456-7890 ✓
- +1-123-456-7890 ✓
- 123-456-7890 ✓

Invalid phones:
- 123 ✗
- abc-def-ghij ✗
- 12345 ✗

**Expected Result**: Only valid phone numbers are accepted.

### 3. Date Validation

**Test Case: Verify date validation**

Valid dates:
- 2024-01-15 ✓
- 2024-12-31 ✓

Invalid dates:
- 2024-13-01 ✗
- 2024-02-30 ✗
- 01/15/2024 ✗
- 2024-1-15 ✗

**Expected Result**: Only valid dates in YYYY-MM-DD format are accepted.

## Integration Testing

### 1. Member Workflow

**Test Case: Complete member management workflow**

1. Add a new member with all fields
2. Verify member appears in list
3. Edit member details
4. Verify changes are saved
5. View member profile
6. Verify all details are correct
7. Delete member
8. Verify member is removed from list

**Expected Result**: Complete workflow works without errors.

### 2. Bulk Operations

**Test Case: Verify bulk operations work correctly**

1. Select multiple members
2. Change status to "Inactive"
3. Verify all selected members are updated
4. Select multiple members
5. Assign to ministry
6. Verify all selected members are assigned
7. Select multiple members
8. Delete
9. Verify all selected members are deleted

**Expected Result**: Bulk operations work correctly on all selected items.

### 3. Import/Export

**Test Case: Verify CSV import/export**

1. Export members to CSV
2. Verify CSV file is downloaded
3. Verify CSV contains all member data
4. Modify CSV (add new member)
5. Import CSV
6. Verify new member is added
7. Verify existing members are not duplicated

**Expected Result**: Import/export works correctly.

## Performance Benchmarks

### Target Metrics

- Page load time: < 3 seconds
- Filter change response: < 500ms
- Member list render: < 1 second
- Modal open: < 300ms
- Form submission: < 2 seconds

### Measurement

1. Open DevTools → Performance tab
2. Record page load
3. Verify metrics meet targets
4. Record filter change
5. Verify response time < 500ms
6. Record form submission
7. Verify submission time < 2 seconds

## Regression Testing Checklist

- [ ] Login works with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Rate limiting blocks after 5 attempts
- [ ] Members can be added
- [ ] Members can be edited
- [ ] Members can be deleted
- [ ] Filters work correctly
- [ ] Search works correctly
- [ ] Bulk operations work
- [ ] CSV import works
- [ ] CSV export works
- [ ] Dashboard loads
- [ ] Charts display correctly
- [ ] Upcoming birthdays display
- [ ] Events section displays
- [ ] All pages load without errors
- [ ] No console errors
- [ ] No network errors
- [ ] Responsive design works on mobile
- [ ] Responsive design works on tablet
- [ ] Responsive design works on desktop

## Automated Testing

### Unit Tests to Add

```typescript
// Test error handler
describe('errorHandler', () => {
  it('should parse Error objects', () => {
    const error = new Error('Test error');
    const parsed = parseError(error);
    expect(parsed.message).toBe('Test error');
  });

  it('should get user-friendly message for network errors', () => {
    const error = { message: 'fetch failed' };
    const message = getUserFriendlyMessage(error);
    expect(message).toContain('Network error');
  });
});

// Test sanitization
describe('sanitization', () => {
  it('should sanitize XSS attempts', () => {
    const input = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(input);
    expect(sanitized).not.toContain('<script>');
  });

  it('should validate email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
  });
});

// Test request cache
describe('requestCache', () => {
  it('should deduplicate concurrent requests', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return 'result';
    };

    const [result1, result2] = await Promise.all([
      requestCache.execute('test', fn),
      requestCache.execute('test', fn),
    ]);

    expect(callCount).toBe(1);
    expect(result1).toBe(result2);
  });
});
```

## Continuous Testing

### Pre-commit Checks
- [ ] Run linter: `npm run lint`
- [ ] Run type check: `npm run type-check`
- [ ] Run unit tests: `npm run test`

### Pre-deployment Checks
- [ ] Run all tests
- [ ] Manual smoke testing
- [ ] Performance testing
- [ ] Accessibility audit
- [ ] Security audit

## Reporting Issues

When reporting issues, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser and OS
5. Console errors (if any)
6. Network errors (if any)
7. Screenshots or video
