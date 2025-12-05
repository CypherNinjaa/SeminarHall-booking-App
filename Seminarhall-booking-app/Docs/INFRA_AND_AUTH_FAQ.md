## Supabase / Expo / App infra FAQ (questions 21–29)

This document answers questions about how authentication, RLS, environment variables, Hermes, state management, offline support, API calls and AsyncStorage are used in this project. All answers reference implementation details found in the repository.

21. How does Supabase authentication work in your app?

- Initialization: a Supabase client is created using `createClient` with the public URL and anon key. See `src/utils/supabaseSetup.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
	process.env.EXPO_PUBLIC_SUPABASE_URL ||
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	"";
const supabaseAnonKey =
	process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	"";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- Auth flows: the app uses Supabase Auth APIs directly (examples in `src/stores/authStore.ts`):

  - Sign up: `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })` (register creates a user and the DB trigger creates a `profiles` row).
  - Sign in: `supabase.auth.signInWithPassword({ email, password })`.
  - Sign out: `supabase.auth.signOut()`.
  - Session retrieval / initialization: `supabase.auth.getSession()` is used during app start to restore session.
  - Auth listener: `supabase.auth.onAuthStateChange(...)` is registered to react to SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED events (see `setupAuthListener` in `authStore.ts`).

- Post-login initialization: after sign-in the app fetches the user's profile from the `profiles` table, retries a few times if needed, enforces email verification and checks `is_active` / admin-approval flags. If checks fail the user is signed out and given an appropriate message (see `initializeAuth` / `login` in `src/stores/authStore.ts`).

22. What is Row Level Security (RLS) in Supabase and how have you used it?

- RLS is a Postgres feature that lets you define policies so each row read/update/delete is allowed only when a policy condition is met (it is enforced by Postgres, not client-side).

- In this project the DB scripts enable RLS and create policies for tables like `profiles`, `user_activity_log`, `notifications` (see `database/super_admin_setup.sql`). Examples:

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles" ON public.profiles FOR SELECT
USING (public.is_super_admin());
```

- Usage notes from the repo:
  - The app relies on RLS to ensure regular users can only read/update their own profile while admins/super_admins have expanded access.
  - Triggers and functions are used to prevent unauthorized role changes (e.g., `prevent_role_change()`), and special policies allow only super admins to change roles.

23. Why did you choose Hermes as the JavaScript engine?

- Rationale (typical for React Native / Expo projects):

  - Hermes reduces Android app startup time and memory usage, and it often improves JS performance for mobile apps.
  - Hermes produces smaller JS bundles and can improve GC behavior on lower-end devices.

- Repo note: Hermes-related tooling (parsers) appear in the package lock, but the project files don't force-enable or disable Hermes in this repo snapshot. If you want Hermes enabled for Android in a bare workflow, enable it in native Android config (or for Expo, set `expo.android.jsEngine` / use a dev build). See React Native / Expo docs for exact toggles.

24. What state management library are you using and why?

- The app uses Zustand for state management. Evidence: `src/stores/authStore.ts` imports `create` from `zustand` and uses the `persist` middleware.

- Why Zustand:
  - Very small and simple API with minimal boilerplate compared to Redux.
  - Works well in React Native and supports middleware like `persist` to store state in `AsyncStorage`.
  - Easy to compose typed stores (the repo stores typed `User` objects and auth state in a single store).

25. How do you handle offline functionality in your app?

- Current approach in repository:

  - Persistent local state: auth and some app settings are persisted locally using `AsyncStorage` via Zustand's `persist` (see `src/stores/authStore.ts`). Theme and settings are also saved with `AsyncStorage` (see `src/contexts/ThemeContext.tsx` and `src/screens/SettingsScreen.tsx`).
  - Simple retry / fallback behavior: services include retry attempts and fallback flows (for example profile fetch retry loops in `authStore.ts` and defensive `try/catch` code in services like `smartBookingService.ts`).
  - Graceful degradation: when an API call fails the services catch errors and either retry, fallback to cached/safer state, or return an informative error to the UI.

- What is NOT implemented here (so you may want to add if you need full offline-first support):
  - Full offline queuing of write operations and background sync (no global write queue / sync engine found in the repo).
  - Dedicated network status listeners (NetInfo) or conflict resolution strategies beyond retry/backoff.

26. Explain the difference between EXPO*PUBLIC*\* and regular environment variables.

- `EXPO_PUBLIC_*` (and similarly `NEXT_PUBLIC_*` in Next.js) are environment variables intended to be embedded into the client bundle and are therefore readable in the client JS at runtime. The code uses `process.env.EXPO_PUBLIC_SUPABASE_URL` and `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY` in `src/utils/supabaseSetup.ts`.

- Regular (non-prefixed) environment variables are typically server-only secrets and should not be exposed to client bundles. For example, the service role key should never be exposed in a `EXPO_PUBLIC_*` variable — instead store it on the server or in Supabase Edge/Functions.

27. What is the purpose of `expo-constants` in your project?

- The project uses `expo-constants` to detect the runtime environment (for example detect Expo Go vs a development/production build). See `src/services/notificationService.ts` which checks `Constants.default?.executionEnvironment === 'storeClient'` to detect Expo Go and adjust notification behavior accordingly.

28. How do you handle API calls to Supabase? Show me an example.

- Pattern used across the repo:

  - A Supabase client is created once (see `src/utils/supabaseSetup.ts` and `src/services/userManagementService.ts`).
  - Services call Supabase using the typed JS client: `.from('table').select(...).eq(...).insert(...).update(...).delete()` or Auth APIs like `supabase.auth.signInWithPassword(...)`.

- Example (login flow from `src/stores/authStore.ts`):

```ts
const { data: authData, error: authError } =
	await supabase.auth.signInWithPassword({
		email,
		password,
	});

if (authError) throw new Error(authError.message);

// Then fetch profile from 'profiles' table
const { data: profileData, error: profileError } = await supabase
	.from("profiles")
	.select("*")
	.eq("id", authData.user.id)
	.single();

if (profileError) {
	/* handle error */
}
```

29. What is AsyncStorage and where have you used it?

- `AsyncStorage` (from `@react-native-async-storage/async-storage`) is a simple, persistent, key-value storage system for React Native apps. It's used to store small pieces of data on the device, like persisted state and settings.

- In this project `AsyncStorage` is used in several places:
  - `src/stores/authStore.ts` — used as the storage backend for the Zustand `persist` middleware (store name: `auth-storage`). This keeps the authenticated user between app launches.
  - `src/utils/debugUtils.ts` — helper functions `clearAuthStorage` and `debugAuthState` read and remove the `auth-storage` key.
  - `src/contexts/ThemeContext.tsx` and `src/screens/SettingsScreen.tsx` — app settings and theme preferences are saved/read from `AsyncStorage`.

---

If you want, I can:

- Add more examples (e.g., a dedicated snippet showing how to safely use the service role key on server-only code).
- Add notes on how to enable Hermes in an Expo dev build or where to store service-role secrets securely.

Files referenced:

- `src/utils/supabaseSetup.ts`
- `src/stores/authStore.ts`
- `database/super_admin_setup.sql`
- `src/utils/debugUtils.ts`
- `src/services/*` (e.g., `userManagementService.ts`, `smartBookingService.ts`, `notificationService.ts`)

---

Last updated: 2025-12-05
