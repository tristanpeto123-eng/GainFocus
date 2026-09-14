# Gain Focus v4.0.45 Final — Push deployment

1. Host this folder over HTTPS. iPhone/iPad Web Push requires the site to be installed to the Home Screen and notification permission granted by the user.
2. Run `npm install`.
3. Generate VAPID keys with `npm run generate-vapid`.
4. Copy `.env.example` values into your host's environment variables. Never put the VAPID private key or `ADMIN_PUSH_SECRET` into the HTML.
5. Start with `npm start`.
6. Open the hosted PWA, Profile → Settings → Notifications → **Enable notifications**. The app registers the service worker, subscribes to Web Push and syncs training/meal/inactivity state to `/api/push/state`.
7. The included scheduler checks once per minute and sends due workout, breakfast, lunch, dinner and inactivity reminders while the PWA is closed.
8. When real authenticated accounts are added, the server-side social service can call `POST /api/push/send` with `x-gain-focus-secret` to deliver friend/group/challenge events to a recipient user ID.

`push-state.json` is deliberately a simple reference store for V1. Replace it with your production database before public launch or multiple server instances.

## v4.0.46 profile switching
The push server now also exposes `POST /api/push/unsubscribe` with `{ "userId": "..." }`.
The app calls this when the active local profile logs out, is deleted, or switches to another profile so scheduled reminders do not leak across local users.
