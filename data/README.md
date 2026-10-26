# Data Directory

## Structure
- aw/: Original immutable source files
- processed/: Transformed/cleaned data
- ixtures/: Synthetic demo data for dev/tests

## Rules
- Never commit secrets, API keys, tokens
- Never commit real user PII
- Use synthetic demo data only
- Keep raw inputs unchanged
- Add to .gitignore if large/sensitive
- Operational data goes in database, not here
