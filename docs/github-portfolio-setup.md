# GitHub repository presentation

## Current repository metadata

- Repository: `Rimus0cod/site` (the suggested rename to `barberbook` or `barberbook-platform` has not been applied)
- Visibility: Public
- Description: `Production-oriented full-stack booking platform built with React, NestJS, PostgreSQL, Redis and Docker.`
- Topics: `react`, `typescript`, `nestjs`, `postgresql`, `redis`, `docker`, `stripe`, `booking-system`, `fullstack`, `prometheus`, `playwright`
- Homepage: not set; there is no deployed live demo URL yet
- CI: latest successful run is linked from the README; the badge currently tracks `portfolio-improvements`

Repository description and topics were updated through GitHub CLI without changing the repository name, visibility, or default branch.

## After deploying the demo

Set the repository homepage to the actual HTTPS demo URL; do not use a placeholder URL:

```bash
gh repo edit Rimus0cod/site --homepage https://<deployed-demo-domain>
```

Then update the README live-demo link and replace the CI badge branch query with `branch=main` after the portfolio work is merged to the default branch.

## Safety notes

- Do not publish admin credentials, payment secrets, JWT secrets, or database credentials.
- Keep admin access private or behind an external access restriction.
- Do not announce a live URL until the payment mode and public-demo safety checklist in [demo-deployment.md](./demo-deployment.md) are complete.
- Do not rename the repository without explicit owner approval; GitHub rename affects clone URLs, links, and integrations.
