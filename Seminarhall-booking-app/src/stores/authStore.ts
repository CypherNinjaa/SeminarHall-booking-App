import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

	// Actions
	setUser: (user: User | null) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	login: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	register: (userData: Partial<User> & { password: string }) => Promise<void>;
	updateProfile: (updates: Partial<User>) => Promise<void>;
	clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			// Initial state
			user: null,
			isAuthenticated: false,
			isLoading: false,
			error: null,

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

			login: async (email: string, password: string) => {
				set({ isLoading: true, error: null });

				try {
					// TODO: Implement Supabase login
					// Mock login for now
					await new Promise((resolve) => setTimeout(resolve, 1000));

					const mockUser: User = {
						id: "1",
						email,
						name: "Dr. Faculty Member",
						role: "faculty",
						department: "Computer Science",
						employeeId: "EMP001",
						createdAt: new Date().toISOString(),
						lastLoginAt: new Date().toISOString(),
					};

					set({
						user: mockUser,
						isAuthenticated: true,
						isLoading: false,
						error: null,
					});
				} catch (error) {
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
					// TODO: Implement Supabase logout
					await new Promise((resolve) => setTimeout(resolve, 500));

					set({
						user: null,
						isAuthenticated: false,
						isLoading: false,
						error: null,
					});
				} catch (error) {
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
					// TODO: Implement Supabase registration
					await new Promise((resolve) => setTimeout(resolve, 1500));

					const newUser: User = {
						id: Date.now().toString(),
						email: userData.email!,
						name: userData.name!,
						role: userData.role || "faculty",
						department: userData.department,
						employeeId: userData.employeeId,
						phone: userData.phone,
						createdAt: new Date().toISOString(),
					};

					set({
						user: newUser,
						isAuthenticated: true,
						isLoading: false,
						error: null,
					});
				} catch (error) {
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
					// TODO: Implement Supabase profile update
					await new Promise((resolve) => setTimeout(resolve, 1000));

					const updatedUser = { ...user, ...updates };
					set({
						user: updatedUser,
						isLoading: false,
						error: null,
					});
				} catch (error) {
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
