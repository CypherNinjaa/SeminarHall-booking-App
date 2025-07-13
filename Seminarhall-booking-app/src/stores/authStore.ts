import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/userManagementService";
import { convertAuthUser } from "../utils/supabaseSetup";

export interface User {
	id: string;
	email: string;
	name: string;
	role: "super_admin" | "admin" | "faculty";
	phone?: string;
	department?: string;
	employeeId?: string;
	avatar?: string;
	createdAt: string;
	lastLoginAt?: string;
}

interface AuthState {
	// State
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
	authListenerSet: boolean;

	// Actions
	setUser: (user: User | null) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	login: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	register: (userData: Partial<User> & { password: string }) => Promise<void>;
	updateProfile: (updates: Partial<User>) => Promise<void>;
	clearError: () => void;
	initializeAuth: () => Promise<void>;
	setupAuthListener: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			// Initial state
			user: null,
			isAuthenticated: false,
			isLoading: false,
			error: null,
			authListenerSet: false,

			// Actions
			setUser: (user) =>
				set({
					user,
					isAuthenticated: !!user,
					error: null,
				}),

			setLoading: (isLoading) => set({ isLoading }),

			setError: (error) => set({ error, isLoading: false }),

			clearError: () => set({ error: null }),

			// Set up auth state listener
			setupAuthListener: () => {
				const { authListenerSet } = get();
				if (authListenerSet) {
					console.log("Auth listener already set up, skipping");
					return;
				}

				console.log("Setting up auth listener");
				set({ authListenerSet: true });

				supabase.auth.onAuthStateChange(async (event, session) => {
					console.log("Auth state changed:", event, session?.user?.id);

					if (event === "SIGNED_OUT" || !session?.user) {
						set({
							user: null,
							isAuthenticated: false,
							isLoading: false,
							error: null,
						});
						return;
					}

					if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
						try {
							set({ isLoading: true });

							// Add a small delay to ensure the user is properly created
							await new Promise((resolve) => setTimeout(resolve, 1000));

							// Get user profile from the profiles table with retries
							let profileData = null;
							let profileError = null;

							for (let i = 0; i < 3; i++) {
								const result = await supabase
									.from("profiles")
									.select("*")
									.eq("id", session.user.id)
									.single();

								profileData = result.data;
								profileError = result.error;

								if (!profileError && profileData) {
									break;
								}

								console.log(
									`Profile fetch attempt ${i + 1} failed:`,
									profileError
								);
								await new Promise((resolve) => setTimeout(resolve, 1000));
							}

							if (profileError || !profileData) {
								console.error(
									"Profile fetch error after retries:",
									profileError
								);

								// If it's a policy error or missing profile, try to create/update it
								if (
									profileError?.code === "42P17" ||
									profileError?.code === "PGRST116" ||
									profileError?.code === "PGRST301"
								) {
									console.log("Attempting to create profile for new user...");

									const { data: newProfile, error: insertError } =
										await supabase
											.from("profiles")
											.insert({
												id: session.user.id,
												email: session.user.email || "",
												name:
													session.user.user_metadata?.name ||
													session.user.email?.split("@")[0] ||
													"User",
												role: "faculty",
												is_active: true,
											})
											.select()
											.single();

									if (insertError) {
										// If duplicate key error, profile was created by trigger, get it instead
										if (insertError.code === "23505") {
											console.log("Profile already exists, fetching it...");
											const { data: existingProfile, error: fetchError } = await supabase
												.from("profiles")
												.select("*")
												.eq("id", session.user.id)
												.single();
											
											if (!fetchError && existingProfile) {
												profileData = existingProfile;
											} else {
												console.error("Failed to fetch existing profile:", fetchError);
												await supabase.auth.signOut();
												set({
													user: null,
													isAuthenticated: false,
													isLoading: false,
													error: "Failed to initialize user profile. Please try again.",
												});
												return;
											}
										} else {
											console.error("Failed to create profile:", insertError);
											await supabase.auth.signOut();
											set({
												user: null,
												isAuthenticated: false,
												isLoading: false,
												error: "Failed to initialize user profile. Please try again.",
											});
											return;
										}
									} else {
										profileData = newProfile;
									}
								} else {
									await supabase.auth.signOut();
									set({
										user: null,
										isAuthenticated: false,
										isLoading: false,
										error: "Failed to load user profile. Please try again.",
									});
									return;
								}
							}

							// Check if user is active
							if (!profileData.is_active) {
								await supabase.auth.signOut();
								set({
									user: null,
									isAuthenticated: false,
									isLoading: false,
									error: "Your account has been deactivated. Please contact your administrator or super admin for assistance.",
								});
								return;
							}

							// Convert to our User format
							const user: User = {
								id: profileData.id,
								email: profileData.email,
								name: profileData.name,
								role: profileData.role,
								phone: profileData.phone,
								department: profileData.department,
								employeeId: profileData.employee_id,
								avatar: profileData.avatar_url,
								createdAt: profileData.created_at,
								lastLoginAt: profileData.last_login_at,
							};

							set({
								user,
								isAuthenticated: true,
								isLoading: false,
								error: null,
							});
						} catch (error) {
							console.error("Auth listener error:", error);
							set({
								user: null,
								isAuthenticated: false,
								isLoading: false,
								error: null,
							});
						}
					}
				});
			},

			initializeAuth: async () => {
				set({ isLoading: true });

				try {
					// Get current session
					const {
						data: { session },
						error: sessionError,
					} = await supabase.auth.getSession();

					if (sessionError) {
						throw new Error(sessionError.message);
					}

					if (!session?.user) {
						// No active session
						set({
							user: null,
							isAuthenticated: false,
							isLoading: false,
							error: null,
						});
						return;
					}

					// Get user profile from the profiles table
					const { data: profileData, error: profileError } = await supabase
						.from("profiles")
						.select("*")
						.eq("id", session.user.id)
						.single();

					if (profileError || !profileData) {
						console.error("Profile fetch error:", profileError);
						// Sign out if profile doesn't exist
						await supabase.auth.signOut();
						set({
							user: null,
							isAuthenticated: false,
							isLoading: false,
							error: null,
						});
						return;
					}

					// Check if user is active
					if (!profileData.is_active) {
						await supabase.auth.signOut();
						set({
							user: null,
							isAuthenticated: false,
							isLoading: false,
							error: "Your account has been deactivated. Please contact your administrator or super admin for assistance.",
						});
						return;
					}

					// Convert to our User format
					const user: User = {
						id: profileData.id,
						email: profileData.email,
						name: profileData.name,
						role: profileData.role,
						phone: profileData.phone,
						department: profileData.department,
						employeeId: profileData.employee_id,
						avatar: profileData.avatar_url,
						createdAt: profileData.created_at,
						lastLoginAt: profileData.last_login_at,
					};

					set({
						user,
						isAuthenticated: true,
						isLoading: false,
						error: null,
					});
				} catch (error) {
					console.error("Auth initialization error:", error);
					set({
						user: null,
						isAuthenticated: false,
						isLoading: false,
						error: null, // Don't show error for initialization failures
					});
				}
			},

			login: async (email: string, password: string) => {
				set({ isLoading: true, error: null });

				try {
					// Authenticate with Supabase
					const { data: authData, error: authError } =
						await supabase.auth.signInWithPassword({
							email,
							password,
						});

					if (authError) {
						throw new Error(authError.message);
					}

					if (!authData.user) {
						throw new Error("Authentication failed");
					}

					// Get user profile from the profiles table with retries
					let profileData = null;
					let profileError = null;

					for (let i = 0; i < 3; i++) {
						const result = await supabase
							.from("profiles")
							.select("*")
							.eq("id", authData.user.id)
							.single();

						profileData = result.data;
						profileError = result.error;

						if (!profileError && profileData) {
							break;
						}

						console.log(`Profile fetch attempt ${i + 1} failed:`, profileError);
						await new Promise((resolve) => setTimeout(resolve, 1000));
					}

					if (profileError || !profileData) {
						console.error("Profile fetch error after retries:", profileError);
						await supabase.auth.signOut();
						throw new Error(
							"Failed to fetch user profile. Please contact support."
						);
					}

					// Check if user is active
					if (!profileData.is_active) {
						await supabase.auth.signOut();
						throw new Error(
							"Your account has been deactivated. Please contact an administrator."
						);
					}

					// Update last login time (ignore errors)
					try {
						await supabase
							.from("profiles")
							.update({ last_login_at: new Date().toISOString() })
							.eq("id", authData.user.id);
					} catch (updateError) {
						console.warn("Failed to update last login time:", updateError);
					}

					// Convert to our User format
					const user: User = {
						id: profileData.id,
						email: profileData.email,
						name: profileData.name,
						role: profileData.role,
						phone: profileData.phone,
						department: profileData.department,
						employeeId: profileData.employee_id,
						avatar: profileData.avatar_url,
						createdAt: profileData.created_at,
						lastLoginAt: new Date().toISOString(),
					};

					set({
						user,
						isAuthenticated: true,
						isLoading: false,
						error: null,
					});
				} catch (error) {
					console.error("Login error:", error);
					set({
						error: error instanceof Error ? error.message : "Login failed",
						isLoading: false,
					});
					throw error;
				}
			},

			logout: async () => {
				set({ isLoading: true });

				try {
					// Sign out from Supabase
					const { error } = await supabase.auth.signOut();

					if (error) {
						throw new Error(error.message);
					}

					set({
						user: null,
						isAuthenticated: false,
						isLoading: false,
						error: null,
					});
				} catch (error) {
					console.error("Logout error:", error);
					set({
						error: error instanceof Error ? error.message : "Logout failed",
						isLoading: false,
					});
					throw error;
				}
			},

			register: async (userData) => {
				set({ isLoading: true, error: null });

				try {
					// Create user in Supabase Auth
					const { data: authData, error: authError } =
						await supabase.auth.signUp({
							email: userData.email!,
							password: userData.password,
						});

					if (authError) {
						throw new Error(authError.message);
					}

					if (!authData.user) {
						throw new Error("Registration failed");
					}

					// Wait a moment for the database trigger to create the profile
					await new Promise((resolve) => setTimeout(resolve, 1000));

					// Try to get existing profile (created by trigger) or update it
					let profileData;
					let profileError;

					// First, try to get the existing profile created by the trigger
					const { data: existingProfile, error: fetchError } = await supabase
						.from("profiles")
						.select("*")
						.eq("id", authData.user.id)
						.single();

					if (existingProfile) {
						// Profile exists (created by trigger), update it with additional details
						const { data: updatedProfile, error: updateError } = await supabase
							.from("profiles")
							.update({
								name: userData.name!,
								role: userData.role || "faculty",
								department: userData.department,
								employee_id: userData.employeeId,
								phone: userData.phone,
								is_active: true,
							})
							.eq("id", authData.user.id)
							.select()
							.single();

						profileData = updatedProfile;
						profileError = updateError;
					} else {
						// Profile doesn't exist, create it manually (fallback)
						const { data: newProfile, error: insertError } = await supabase
							.from("profiles")
							.insert({
								id: authData.user.id,
								email: userData.email!,
								name: userData.name!,
								role: userData.role || "faculty",
								department: userData.department,
								employee_id: userData.employeeId,
								phone: userData.phone,
								is_active: true,
							})
							.select()
							.single();

						profileData = newProfile;
						profileError = insertError;

						// If we get a duplicate key error, it means the trigger created the profile
						// after our fetch attempt, so try to update instead
						if (profileError?.code === "23505") {
							const { data: retryProfile, error: retryError } = await supabase
								.from("profiles")
								.update({
									name: userData.name!,
									role: userData.role || "faculty",
									department: userData.department,
									employee_id: userData.employeeId,
									phone: userData.phone,
									is_active: true,
								})
								.eq("id", authData.user.id)
								.select()
								.single();

							profileData = retryProfile;
							profileError = retryError;
						}
					}

					if (profileError || !profileData) {
						console.error("Profile creation/update error:", profileError);
						throw new Error("Failed to create user profile");
					}

					// Convert to our User format
					const newUser: User = {
						id: profileData.id,
						email: profileData.email,
						name: profileData.name,
						role: profileData.role,
						department: profileData.department,
						employeeId: profileData.employee_id,
						phone: profileData.phone,
						avatar: profileData.avatar_url,
						createdAt: profileData.created_at,
					};

					set({
						user: newUser,
						isAuthenticated: true,
						isLoading: false,
						error: null,
					});
				} catch (error) {
					console.error("Registration error:", error);
					set({
						error:
							error instanceof Error ? error.message : "Registration failed",
						isLoading: false,
					});
					throw error;
				}
			},

			updateProfile: async (updates) => {
				const { user } = get();
				if (!user) throw new Error("No user to update");

				set({ isLoading: true, error: null });

				try {
					// Update profile in Supabase
					const { data: profileData, error: profileError } = await supabase
						.from("profiles")
						.update({
							name: updates.name,
							phone: updates.phone,
							department: updates.department,
							employee_id: updates.employeeId,
							avatar_url: updates.avatar,
						})
						.eq("id", user.id)
						.select()
						.single();

					if (profileError) {
						throw new Error(profileError.message);
					}

					// Convert back to our User format
					const updatedUser: User = {
						id: profileData.id,
						email: profileData.email,
						name: profileData.name,
						role: profileData.role,
						phone: profileData.phone,
						department: profileData.department,
						employeeId: profileData.employee_id,
						avatar: profileData.avatar_url,
						createdAt: profileData.created_at,
						lastLoginAt: profileData.last_login_at,
					};

					set({
						user: updatedUser,
						isLoading: false,
						error: null,
					});
				} catch (error) {
					console.error("Profile update error:", error);
					set({
						error:
							error instanceof Error ? error.message : "Profile update failed",
						isLoading: false,
					});
					throw error;
				}
			},
		}),
		{
			name: "auth-storage",
			storage: createJSONStorage(() => AsyncStorage),
			partialize: (state) => ({
				user: state.user,
				isAuthenticated: state.isAuthenticated,
			}),
		}
	)
);
