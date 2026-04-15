

# Update LinkedIn Secrets for Company Page Posting

## What will happen
I'll use the secret management tool to prompt you to enter new values for:

1. **LINKEDIN_PERSON_URN** — Enter your organization URN: `urn:li:organization:109866249`
2. **LINKEDIN_ACCESS_TOKEN** — Enter your new access token (the one with `w_organization_social` scope)

## No code changes needed
The existing `share-to-linkedin` edge function already uses the `LINKEDIN_PERSON_URN` secret as the `author` field in the API payload, so it will automatically post to the Company Page once the URN is updated.

## Steps
1. Update `LINKEDIN_PERSON_URN` secret with `urn:li:organization:109866249`
2. Update `LINKEDIN_ACCESS_TOKEN` secret with the new token
3. Test by publishing a blog post or manually invoking the edge function

