# Screenshots

## Capture status

The screenshot files are not present yet. The current environment has no Docker Engine and no live demo, so there is no populated application available to capture. Do not substitute mockups, generated UI, error pages, or empty-data screens.

## Target gallery

Capture real application screens from the seeded demo and save WebP images at these paths:

- `home-desktop.webp` — home, 1440x900
- `booking.webp` — booking wizard with demo services/barbers, 1440x900
- `confirmation.webp` — successful booking confirmation, 1440x900
- `account.webp` — client account view with synthetic demo data, 1440x900
- `admin-dashboard.webp` — admin dashboard with demo data, 1440x900
- `mobile.webp` — home or booking flow, 390x844
- `dark-mode.webp` — home or booking in dark mode, 1440x900

## Capture requirements

1. Start the dedicated demo environment only after following [../demo-deployment.md](../demo-deployment.md). Do not use production customer data.
2. Confirm the frontend and backend readiness endpoints pass and the demo seed is present.
3. Use a clean browser profile, 100% zoom, and the listed viewport dimensions.
4. Complete an actual booking with the approved demo payment mode before capturing the confirmation page. Do not invoke APIs directly to fabricate a confirmation screen.
5. Keep admin credentials, access tokens, phone numbers, and other private data out of screenshots. Use synthetic values only.
6. Review every image for API errors, empty states, overlays, and accidental secrets before committing it.
7. Save optimized `.webp` files using the exact names above. Add only the strongest home, booking, admin, and mobile views to the README gallery.
