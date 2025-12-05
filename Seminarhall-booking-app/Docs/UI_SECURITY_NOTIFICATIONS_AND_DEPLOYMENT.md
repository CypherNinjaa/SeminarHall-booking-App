**UI, Security, Notifications & Deployment (Questions 38–60)**

**UI/UX & Navigation (38–43)**

- **Navigation Structure:**: App uses a Stack navigator with a Bottom Tab navigator for primary screens (`Home`, `Halls`, `Bookings`, `Profile`). Admin screens are conditionally added when `user.role` is `admin` or `super_admin`.
  - Evidence: `src/navigation/AppNavigator.tsx` — `createStackNavigator`, `createBottomTabNavigator`, `MainTabNavigator`, conditional `AdminTabs` rendering.
- **Form validation & required fields:**: Booking forms perform client-side validation and explicit required-field checks (hall, date(s), start/end times, purpose). Past-dates/times are rejected and capacity checks are enforced before submit.
  - Evidence: `src/screens/BookingFormScreen.tsx` — `isPastTime()`, required-field guards, `checkAvailability()` and `checkMultiDateAvailability()` calls to `smartBookingService`.
- **Responsive & accessibility notes:**: Layouts use `Dimensions`, `useSafeAreaInsets`, animated transitions and `react-native-paper` is available for consistent UI. Accessibility labels should be added to interactive elements.
  - Evidence: `BookingFormScreen.tsx` uses `Dimensions.get("window")`, `useSafeAreaInsets`, `Animated`, `LinearGradient`. `package.json` includes `react-native-paper`.
- **Deep linking & web flow:**: Deep link prefix `seminarhallbooking://` maps to auth and main routes (e.g., email-verified → main). Useful for email callbacks.
  - Evidence: `AppNavigator.tsx` — `linking` config with `prefixes: ['seminarhallbooking://']`.

**Security & Authentication (44–50)**

- **Auth flow & session handling:**: App uses Supabase Auth via `@supabase/supabase-js`. Client holds public `EXPO_PUBLIC_*` values; authentication state is observed and sessions handled by Supabase. Sensitive operations run via server-side/Edge functions.
  - Evidence: `src/utils/supabaseSetup.ts` and `src/stores/authStore.ts` (onAuthStateChange, session initialization, profile fetch/create).
- **Role model & enforcement:**: Client gates UI by `user.role` (UX). Real enforcement is implemented at DB level via RLS and server-side functions — do not rely on client checks alone.
  - Evidence: `AppNavigator.tsx` conditionally renders `AdminTabs`; RLS policies are present in `database/*.sql`.
- **Secrets & service-role key handling:**: Privileged keys (e.g., `SUPABASE_SERVICE_ROLE_KEY`, email provider keys) are only read in server/Edge functions (`Deno.env.get(...)`) and must never be embedded in the app bundle. Use Supabase secrets, EAS secrets, or CI secret stores.
  - Evidence: `supabase/functions/send-email/index.ts` reads `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` and `RESEND_API_KEY`.
- **Token validation & server checks:**: Edge functions validate incoming Authorization headers via the Supabase server client (`supabaseClient.auth.getUser`) before performing privileged actions.
  - Evidence: `supabase/functions/send-email/index.ts` verifies the `Authorization` bearer token before sending emails.
- **Recommendations (hardening):**: enforce RLS for all sensitive tables, audit logs for admin actions, rate limit auth endpoints, rotate service keys, and use server-side functions for admin-only operations.

**Notifications & Email System (51–55)**

- **Push notifications (client):**: App uses `expo-notifications` and `expo-device`. Tokens are requested and saved to `push_tokens` via Supabase; push messages are sent through Expo Push API (`exp.host`) by server or backend functions.
  - Evidence: `src/services/notificationService.ts` — `registerForPushNotifications`, `savePushToken`, `sendPushNotification` posts to `https://exp.host/--/api/v2/push/send`.
- **Notification features:**: Android channels, categories, action buttons (`view-booking`, `cancel-booking`, `snooze-reminder`) and local scheduling for reminders are implemented. The service honors user notification settings stored in `user_notification_settings`.
  - Evidence: `notificationService.ts` — `setupAndroidChannels`, `setNotificationCategoryAsync`, `getNotificationSettings`, `updateNotificationSettings`.
- **Email service & providers:**: Server-side Supabase Edge function supports multiple providers (`resend`, `sendgrid`, placeholder `nodemailer`). Provider selection comes from `EMAIL_SERVICE` env var; emails are logged to `email_logs`.
  - Evidence: `supabase/functions/send-email/index.ts` — provider switch, `Deno.env.get('RESEND_API_KEY')`, insertion into `email_logs`.
- **Failure handling & retries:**: Email responses are recorded; push responses are logged. Recommendation: add a retry queue or background worker for transient failures and track delivery/retries in `email_logs`.

**Deployment & Build (56–60)**

- **Build and push-notification requirement:**: Project is Expo-managed (`expo` SDK 53). Push notifications require a development/production build (not Expo Go for SDK 53+). Use `eas build` or `expo run:android|ios` for development builds.
  - Evidence: `package.json` scripts and `src/services/notificationService.ts` warnings about Expo Go.
- **Where to store secrets:**: Use `EXPO_PUBLIC_*` for client-safe values. Use Supabase secrets, EAS secrets, or CI secret stores for provider keys and `SUPABASE_SERVICE_ROLE_KEY`. Never commit `.env`.
  - Evidence: code reads `process.env.EXPO_PUBLIC_SUPABASE_URL` on client and `Deno.env.get(...)` in Edge functions.
- **CI/CD & migrations:**: Keep SQL migrations under version control (`database/*.sql`). Use CI (GitHub Actions) to run tests, apply DB migrations (via `supabase` CLI), deploy Edge functions (`supabase functions deploy`), and trigger `eas` builds for mobile artifacts.
  - Recommendation: separate pipelines for backend infra (migrations, functions) and mobile builds; use staging before production.
- **Signing, release channels & rollbacks:**: Use EAS-managed credentials for signing, Play Store/TestFlight staged rollouts, and EAS channels for staged app updates. Backup DB and test migrations in staging before production.

**References / Quick commands**

- **Start dev server:**: `npm run start` (uses `expo start`).
- **Run on device (dev build):**: `npm run android` or `npm run ios` (requires development build / credentials).
- **Build with EAS (example):**:

```
npx eas build --platform android --profile production
```

- **Deploy Supabase Edge function (example):**

```
supabase functions deploy send-email --project-ref <your-ref>
```

**Next steps**

- I can commit this file to the branch and/or run a quick lint/build check locally if you want. Tell me to `commit` or `skip`.
