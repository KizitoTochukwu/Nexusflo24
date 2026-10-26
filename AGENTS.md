# Architecture rules

- Scheduled cold-lead scans use ordered keyset pagination for candidates and enrolment history, so excluded records cannot hide later eligible leads.