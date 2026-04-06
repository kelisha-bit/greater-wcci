/**
 * Loading States Integration Guide
 * Examples of how to use LoadingStates components with data hooks
 * 
 * INTEGRATION PATTERNS:
 * 
 * 1. BASIC PATTERN - Show loading, error, or data:
 * 
 *    export default function MyComponent() {
 *      const { data: items, isLoading, error } = useMyData();
 *      
 *      if (isLoading) return <LoadingStates.ListSkeleton />;
 *      if (error) return <EmptyState error={error} />;
 *      if (!items?.length) return <EmptyStatePlaceholder />;
 *      
 *      return <>{items.map(item => <ItemCard key={item.id} item={item} />)}</>;
 *    }
 * 
 * 2. PROGRESSIVE LOADING - Show partial data while loading more:
 * 
 *    export default function Dashboard() {
 *      const { data: stats, isLoading: statsLoading } = useMemberStats();
 *      const { data: members, isLoading: membersLoading } = useMembers();
 *      
 *      return (
 *        <>
 *          {statsLoading ? <StatsSkeleton /> : <StatsCards stats={stats} />}
 *          {membersLoading ? <ListSkeleton /> : <MembersList members={members} />}
 *        </>
 *      );
 *    }
 * 
 * 3. TRANSITION PATTERN - Smooth transitions between loading and content:
 * 
 *    import { AnimatePresence } from 'framer-motion';
 *    
 *    export default function List() {
 *      const { data, isLoading } = useData();
 *      
 *      return (
 *        <AnimatePresence mode="wait">
 *          {isLoading ? (
 *            <motion.div key="loading">
 *              <ListSkeleton />
 *            </motion.div>
 *          ) : (
 *            <motion.div key="content">
 *              {data?.map(...)}
 *            </motion.div>
 *          )}
 *        </AnimatePresence>
 *      );
 *    }
 * 
 * 4. SPECIFIC SECTION LOADING - Loading state for parts of the page:
 * 
 *    export default function Profile() {
 *      const { data: member, isLoading } = useMember(id);
 *      const { data: events, isLoading: eventsLoading } = useEvents();
 *      
 *      return (
 *        <>
 *          {isLoading ? <HeaderSkeleton /> : <ProfileHeader member={member} />}
 *          <div className="grid grid-cols-3 gap-6">
 *            {eventsLoading ? <ChartSkeleton /> : <EventChart events={events} />}
 *          </div>
 *        </>
 *      );
 *    }
 * 
 * 5. TABLE WITH PAGINATION - Showing loading state during page changes:
 * 
 *    export default function MembersTable() {
 *      const [page, setPage] = useState(1);
 *      const { data: members, isLoading } = useMembers(page);
 *      
 *      return (
 *        <>
 *          {isLoading ? (
 *            <TableSkeleton rows={10} columns={5} />
 *          ) : (
 *            <DataTable data={members} />
 *          )}
 *          <Pagination page={page} onPageChange={setPage} />
 *        </>
 *      );
 *    }
 * 
 * LOADING STATE COMPONENTS AVAILABLE:
 * 
 * - SkeletonPulse: Base pulse effect wrapper
 * - TextSkeleton: Multi-line text loading
 * - CardSkeleton: Single card placeholder
 * - CardGridSkeleton: Grid of cards (default 4)
 * - TableRowSkeleton: Single table row
 * - TableSkeleton: Full table with headers and rows
 * - ChartSkeleton: Chart container
 * - MemberCardSkeleton: Person/member card specific format
 * - ListSkeleton: List of items (default 5)
 * - StatsSkeleton: Stats card grid (default 4)
 * - HeaderSkeleton: Page header (title + description)
 * - LoadingOverlay: Full screen loading spinner with message
 * - EmptyStatePlaceholder: No data state
 * 
 * BEST PRACTICES:
 * 
 * 1. Always check isLoading before rendering to prevent flash of wrong content
 * 2. Use contextually appropriate skeletons (e.g., StatsSkeleton for stats)
 * 3. Combine with error states for complete UX
 * 4. Use AnimatePresence for smooth transitions
 * 5. Consider showing partial data while loading more (progressive loading)
 * 6. Add loading states to all async operations
 * 7. Use LoadingOverlay only for page-blocking operations
 * 8. Always provide fallback UI for empty states
*/

// ============================================================================
// EXAMPLE 1: Members Page with Loading States
// ============================================================================

/*
export default function Members() {
  const { data: members, isLoading, error, total, page, pageSize } = useMembers();
  
  if (error) {
    return (
      <div className="p-6">
        <ErrorBoundary>
          <div className="text-red-600">Error loading members: {error}</div>
        </ErrorBoundary>
      </div>
    );
  }
  
  return (
    <div>
      {isLoading && <ListSkeleton items={10} />}
      {!isLoading && members && members.length > 0 && (
        <MembersList members={members} />
      )}
      {!isLoading && (!members || members.length === 0) && (
        <EmptyStatePlaceholder 
          title="No members found" 
          description="Start by adding your first member"
        />
      )}
    </div>
  );
}
*/

// ============================================================================
// EXAMPLE 2: Dashboard with Multiple Loading States
// ============================================================================

/*
export default function Dashboard() {
  const memberStats = useMemberStats();
  const attendanceStats = useAttendanceStats();
  const donationStats = useDonationStats();
  const events = useEvents();
  
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      
      {/* Stats Section */}
      {memberStats.isLoading ? (
        <StatsSkeleton count={4} />
      ) : (
        <StatsRow stats={[memberStats.data, attendanceStats.data, donationStats.data, ...]} />
      )}
      
      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">
        {attendanceStats.isLoading ? (
          <ChartSkeleton />
        ) : (
          <AttendanceChart data={attendanceStats.data} />
        )}
        
        {donationStats.isLoading ? (
          <ChartSkeleton />
        ) : (
          <DonationChart data={donationStats.data} />
        )}
      </div>
      
      {/* Events Section */}
      {events.isLoading ? (
        <ListSkeleton items={5} />
      ) : (
        <EventsList events={events.data} />
      )}
    </div>
  );
}
*/

// ============================================================================
// EXAMPLE 3: Form with Mutation Loading
// ============================================================================

/*
export default function AddMember() {
  const { create, isLoading, error } = useCreateMember();
  const [formData, setFormData] = useState<Omit<Member, 'id'>>({...});
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await create(formData);
    if (result) {
      // Success - redirect or show toast
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        disabled={isLoading}
      />
      <button disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Member'}
      </button>
      {error && <div className="text-red-600">{error}</div>}
    </form>
  );
}
*/

// ============================================================================
// BEST PRACTICES SUMMARY
// ============================================================================

/*
KEY TAKEAWAYS:

1. Use appropriate skeleton component for context
   - StatsSkeleton for KPI cards
   - ListSkeleton for vertically stacked items
   - TableSkeleton for data tables
   - ChartSkeleton for charts/visualizations
   - CardGridSkeleton for grid layouts

2. Handle three states consistently
   Loading → Data → Empty/Error

3. Use conditional rendering patterns:
   if (isLoading) return <Skeleton />;
   if (error) return <ErrorState />;
   if (!data?.length) return <EmptyState />;
   return <DataDisplay />;

4. Progressive loading for fast UX:
   - Show page header first (usually cached/fast)
   - Then show stats (usually fast queries)
   - Then show longer-loading content in parallel

5. Animations for smooth transitions:
   - Use AnimatePresence for loading → content transitions
   - Pulse animations keep user engaged
   - Brief animations (2-3s) prevent seizure triggers

6. Always provide context clues:
   - Show what's loading (specific section, not generic)
   - Use semantic skeletons (shape matches content)
   - Keep loading consistent with actual content dimensions
*/

export {};
