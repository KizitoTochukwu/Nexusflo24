# NexusFlo24 Academy: audit findings and upgrade

## Confirmed gaps

1. **No actual learning happens.** Every "Start Learning", "Join the Program", "Enroll" and course button goes to the sign-up page. There are no lesson videos, no lesson pages, and no place in the dashboard to take a course. After signing up, the Academy is never mentioned again.
2. **Sign-up ignores the Academy.** The sign-up page does not read the "academy" / course details in the link, so a visitor who clicked "Enroll in WhatsApp Marketing 101" lands in the normal dashboard with no memory of the course.
3. **Numbers on the page don't add up.**
   - Categories claim 8 + 6 + 5 + 7 + 4 + 3 = 33 courses; only 6 courses exist (one per category).
   - Course cards claim lesson counts that don't match their syllabus (e.g. "Funnels" says 18 lessons, syllabus lists 11; "CRM" says 24, lists 10).
   - "5,000+ learners", ratings and student counts are made up, not real.
4. **Category cards look clickable but do nothing.** They have hover effects and a pointer cursor but don't filter courses.
5. **"Browse Courses" jumps to categories**, not to the course list.
6. **Premium has no price or rule.** Cards say "Premium" but nothing says what it costs or which plan unlocks it; nothing gates it.
7. **Testimonials and instructors are invented** (Sarah M., James K., etc.) with no disclosure.
8. **Content is only editable in code** (admin page says so), so the team can't add courses or lessons.

## Proposed upgrade

**Phase 1 — Honest page (quick)**
- Work out category counts, lesson totals and headline stats from the real course list.
- Make lesson counts match each syllabus.
- Make categories filter the Featured Courses grid; point "Browse Courses" to the course list.
- Hide invented ratings/student numbers until real data exists; label testimonials as sample or replace with real ones you provide.
- Show which plan unlocks Premium courses (Free = free courses; Premium = Plus and above).

**Phase 2 — Real learning inside the dashboard**
- New "Academy" section in the dashboard: course list, course player with lesson videos (YouTube/Vimeo links), mark-as-complete, progress bar, and "Continue where you left off".
- Sign-up keeps the chosen course and opens it straight after onboarding.
- Premium lessons locked with the existing upgrade prompt for lower plans.
- Track progress so Academy enrolments appear in the CRM/analytics (course started, lesson completed, course completed).

**Phase 3 — Manage courses without code**
- Platform admin Academy page becomes an editor: add/edit courses, modules, lessons, video links, free/premium, publish/unpublish.

## What I need from you
- Lesson video links (or confirm placeholders for now).
- Real testimonials, or approval to label them as samples.
- Which plan unlocks Premium courses.

## Technical notes
- New tables `academy_courses`, `academy_modules`, `academy_lessons`, `academy_progress` (user-scoped RLS, grants); seed from `src/data/academyCourses.ts`.
- `Register.tsx` stores `plan/intent/course` params and redirects to `/dashboard/:ws/academy/:slug` after onboarding.
- Premium gating via existing `usePlanGating` / `LockedFeature`.
- Events logged to the existing analytics events table.
