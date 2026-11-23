# Architecture rules

- Scheduled cold-lead scans use ordered keyset pagination for candidates and enrolment history, so excluded records cannot hide later eligible leads.
- AI Video Studio normalises uploaded photos in the browser (src/lib/video/prepareVideoImage.ts) to the video model's size/shape limits, and generate-promo-video re-checks dimensions server-side, so undersized images never reach the model.
