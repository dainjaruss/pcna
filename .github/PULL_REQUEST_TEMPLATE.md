<!-- Describe the purpose of this PR in one sentence -->

### Summary

<!-- Provide a short summary of changes -->

### Checklist
- [ ] PR includes tests (if applicable)
- [ ] PR updates documentation (if applicable)

### CI / Smoke Test Guidance

- This repository includes a smoke-test workflow that can run against a live URL. The workflow uses two repository secrets:
  - `SMOKE_BASE_URL` — the base URL to hit for smoke tests (required to run workflow).
  - `SMOKE_ALLOW_DELETE` — when set to `true`, the smoke-test will request deletion of the test user. **Do not set this in production or against persistent databases.**

- If you intend to run smoke tests in CI, ensure `SMOKE_BASE_URL` points to a disposable staging environment and **do not** set `SMOKE_ALLOW_DELETE` unless the environment can be safely modified or destroyed.

### Security Notes
- The smoke-test uses httpOnly cookies and avoids persisting tokens to the repository. However, avoid enabling destructive cleanup in shared CI environments.
