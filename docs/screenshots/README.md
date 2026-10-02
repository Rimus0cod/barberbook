# Screenshots

These are real UI captures generated in GitHub Actions from the isolated, seeded full-stack demo environment. The confirmation and admin views show the completed demo booking; its client name and phone are synthetic.

| File | View | Dimensions |
| --- | --- | --- |
| `home-desktop.webp` | Home page | 1440x900 |
| `booking.webp` | Selected barber and available slots | 1440x900 |
| `confirmation.webp` | Confirmed booking | 1440x900 |
| `account.webp` | Client portal with recent booking | 1440x900 |
| `admin-dashboard.webp` | Admin dashboard with confirmed demo booking | 1440x900 |
| `mobile.webp` | Home page at mobile width | 390x844 |
| `dark-mode.webp` | Home page in the application dark theme | 1440x900 |

## Capture requirements

1. Start the dedicated demo environment only after following [../demo-deployment.md](../demo-deployment.md). Do not use production customer data.
2. Confirm frontend and backend readiness and verify the demo seed is present.
3. Use a clean browser profile, 100% zoom, and the listed viewport dimensions.
4. Complete a real UI booking using the approved demo payment mode before capturing the confirmation page; never fabricate a confirmation through direct API calls.
5. Keep admin credentials, access tokens, phone numbers, and other private data out of screenshots. Use synthetic values only.
6. Review every image for API errors, empty states, overlays, and accidental secrets before committing it.
7. Keep the README gallery concise: show only the strongest home, booking, admin, and mobile views.
