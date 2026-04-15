

# Update LinkedIn Secrets

## What we'll do
Update the two existing secrets with your new credentials:

1. **LINKEDIN_ACCESS_TOKEN** — Your new OAuth access token generated from the LinkedIn Developer Portal with the `w_member_social` scope
2. **LINKEDIN_PERSON_URN** — Your Person URN in the format `urn:li:person:YOUR_SUB_VALUE` (retrieved from the LinkedIn userinfo API)

## Steps
1. Use the `add_secret` tool to prompt you to enter the new **LINKEDIN_ACCESS_TOKEN**
2. Use the `add_secret` tool to prompt you to enter the new **LINKEDIN_PERSON_URN**

No code changes needed — just updating the secret values.

