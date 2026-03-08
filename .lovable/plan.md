

## Plan: Reorder Sidebar — Move Funnels Between Leads and Campaigns

Single edit in `src/components/dashboard/DashboardLayout.tsx` lines 32-42. Move the Funnels entry (line 37) to sit between Leads (line 34) and Campaigns (line 35).

New order:
1. Overview
2. Leads
3. **Funnels** (moved up)
4. Campaigns
5. Automations
6. Bookings
7. Analytics
8. Settings
9. Admin (conditional)

