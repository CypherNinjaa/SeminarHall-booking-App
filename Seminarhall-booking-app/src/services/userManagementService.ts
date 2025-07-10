import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { PostgrestError } from "@supabase/supabase-js";

// Initialize Supabase client - these values will be replaced with your actual credentials
let supabaseUrl =
	process.env.EXPO_PUBLIC_SUPABASE_URL ||
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	"";
let supabaseAnonKey =
	process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	"";

// Initialize Supabase client for regular operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for user management
export interface User {
	id: string;
	name: string;
	email: string;
	phone?: string;
	employee_id?: string;
	department?: string;
	role: "super_admin" | "admin" | "faculty";
	is_active: boolean;
	avatar_url?: string;
	last_login?: string;
	created_at: string;
	updated_at: string;
}

export interface UserAnalytics {
	total_users: number;
	active_users: number;
	inactive_users: number;
	super_admins: number;
	admins: number;
	faculty: number;
	new_users_last_month: number;
	recent_activity: Array<{
		id: string;
		user_id: string;
		action: string;
		details: any;
		created_at: string;
		user_name: string;
		user_email: string;
	}>;
}

export interface ServiceResponse<T> {
	data: T | null;
	error: string | null;
	status: number;
}

/**
 * User Management Service
 * Provides functions for super admin user management
 */
export const userManagementService = {
	/**
	 * Test Supabase connection
	 */
	testConnection: async () => {
		try {
			const { data, error } = await supabase
				.from("profiles")
				.select("count", { count: "exact", head: true });

			if (error) throw error;

			return {
				success: true,
				message: "Supabase connection successful",
				url: supabaseUrl,
				profileCount: data,
			};
		} catch (error) {
			console.error("Supabase connection test failed:", error);
			return {
				success: false,
				message: "Supabase connection failed",
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	},

	/**
	 * Get all users with pagination and filtering
	 */
	getAllUsers: async (
		page = 1,
		pageSize = 10,
		role?: "super_admin" | "admin" | "faculty",
		isActive?: boolean,
		searchQuery?: string
	) => {
		try {
			// Calculate pagination range
			const start = (page - 1) * pageSize;
			const end = start + pageSize - 1;

			// Build query
			let query = supabase.from("profiles").select("*", { count: "exact" });

			// Apply role filter if provided
			if (role) {
				query = query.eq("role", role);
			}

			// Apply active status filter if provided
			if (isActive !== undefined) {
				query = query.eq("is_active", isActive);
			}

			// Apply search if provided
			if (searchQuery) {
				query = query.or(
					`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,department.ilike.%${searchQuery}%,employee_id.ilike.%${searchQuery}%`
				);
			}

			// Apply sorting
			query = query.order("created_at", { ascending: false });

			// Apply pagination
			query = query.range(start, end);

			const { data, error, count } = await query;

			if (error) throw error;

			return {
				users: data,
				totalCount: count || 0,
				currentPage: page,
				pageSize,
				totalPages: Math.ceil((count || 0) / pageSize),
			};
		} catch (error) {
			console.error("Error fetching users:", error);
			throw error;
		}
	},

	/**
	 * Get user analytics
	 */
	getUserAnalytics: async () => {
		try {
			const { data, error } = await supabase.rpc("get_user_analytics");

			if (error) throw error;

			return data;
		} catch (error) {
			console.error("Error getting user analytics:", error);
			throw error;
		}
	},

	/**
	 * Get user activity log
	 */
	getUserActivityLog: async (page = 1, pageSize = 20) => {
		try {
			// Calculate pagination range
			const start = (page - 1) * pageSize;
			const end = start + pageSize - 1;

			const { data, error, count } = await supabase
				.from("user_activity_log")
				.select(
					`
          *,
          user:user_id (name, email),
          target:target_user_id (name, email)
        `,
					{ count: "exact" }
				)
				.order("created_at", { ascending: false })
				.range(start, end);

			if (error) throw error;

			return {
				activities: data,
				totalCount: count || 0,
				currentPage: page,
				pageSize,
				totalPages: Math.ceil((count || 0) / pageSize),
			};
		} catch (error) {
			console.error("Error fetching activity log:", error);
			throw error;
		}
	},

	/**
	 * Change user role
	 */
	changeUserRole: async (
		userId: string,
		newRole: "super_admin" | "admin" | "faculty"
	) => {
		try {
			const { data, error } = await supabase.rpc("change_user_role", {
				user_id: userId,
				new_role: newRole,
			});

			if (error) throw error;

			return data;
		} catch (error) {
			console.error("Error changing user role:", error);
			throw error;
		}
	},

	/**
	 * Toggle user active status
	 */
	toggleUserActiveStatus: async (userId: string, isActive: boolean) => {
		try {
			const { data, error } = await supabase.rpc("toggle_user_active_status", {
				user_id: userId,
				is_active: isActive,
			});

			if (error) throw error;

			return data;
		} catch (error) {
			console.error("Error toggling user status:", error);
			throw error;
		}
	},

	/**
	 * Delete user - Complete deletion flow (profile + auth user)
	 */
	deleteUser: async (userId: string) => {
		try {
			// Step 1: Delete the profile and related data via database function
			const { data: profileData, error: profileError } = await supabase.rpc(
				"admin_delete_user",
				{ user_id: userId }
			);

			if (profileError) throw profileError;

			// Step 2: Delete the auth user via Edge Function
			const { data: authData, error: authError } = await supabase.functions.invoke(
				"admin-auth-operations",
				{
					body: {
						operation: "deleteUser",
						userId: userId,
					},
				}
			);

			if (authError) throw authError;

			if (!authData?.success) {
				throw new Error(authData?.error || "Failed to delete auth user");
			}

			return { success: true, message: "User completely deleted" };
		} catch (error) {
			console.error("Error deleting user:", error);
			throw error;
		}
	},

	/**
	 * Request password reset for user
	 */
	requestPasswordReset: async (userEmail: string) => {
		try {
			// Send the actual reset email
			const { error: resetError } = await supabase.auth.resetPasswordForEmail(
				userEmail
				// Note: For React Native, you might want to configure a custom redirect URL
				// { redirectTo: 'your-app://reset-password' }
			);

			if (resetError) throw resetError;

			// Log the request via RPC (optional - for admin tracking)
			try {
				await supabase.rpc("request_password_reset", {
					user_email: userEmail,
				});
			} catch (logError) {
				// If logging fails, it's not critical - password reset email was still sent
				console.warn("Failed to log password reset request:", logError);
			}

			return true;
		} catch (error) {
			console.error("Error requesting password reset:", error);
			throw error;
		}
	},

	/**
	 * Get user notifications with pagination
	 */
	getUserNotifications: async (page = 1, pageSize = 10, unreadOnly = false) => {
		try {
			// Calculate pagination range
			const start = (page - 1) * pageSize;
			const end = start + pageSize - 1;

			// Build query
			let query = supabase
				.from("notifications")
				.select("*", { count: "exact" });

			// Filter for unread if specified
			if (unreadOnly) {
				query = query.eq("is_read", false);
			}

			// Apply sorting and pagination
			query = query.order("created_at", { ascending: false }).range(start, end);

			const { data, error, count } = await query;

			if (error) throw error;

			return {
				notifications: data,
				totalCount: count || 0,
				currentPage: page,
				pageSize,
				totalPages: Math.ceil((count || 0) / pageSize),
			};
		} catch (error) {
			console.error("Error fetching notifications:", error);
			throw error;
		}
	},

	/**
	 * Mark notification as read
	 */
	markNotificationAsRead: async (notificationId: string) => {
		try {
			const { data, error } = await supabase
				.from("notifications")
				.update({ is_read: true })
				.eq("id", notificationId);

			if (error) throw error;

			return data;
		} catch (error) {
			console.error("Error marking notification as read:", error);
			throw error;
		}
	},

	/**
	 * Update user profile
	 */
	updateUser: async (
		userId: string,
		updates: {
			name?: string;
			department?: string;
			employee_id?: string;
			phone?: string;
			role?: "super_admin" | "admin" | "faculty";
		}
	) => {
		try {
			const { data, error } = await supabase.rpc("admin_update_user", {
				user_id: userId,
				user_name: updates.name,
				user_department: updates.department,
				user_employee_id: updates.employee_id,
				user_phone: updates.phone,
				user_role: updates.role,
			});

			if (error) throw error;

			return data;
		} catch (error) {
			console.error("Error updating user:", error);
			throw error;
		}
	},

	/**
	 * Invite a new user - Creates user and sends invitation email
	 */
	inviteUser: async ({
		email,
		name,
		role,
		department,
		employeeId,
		phone,
	}: {
		email: string;
		name: string;
		role?: "super_admin" | "admin" | "faculty";
		department?: string;
		employeeId?: string;
		phone?: string;
	}) => {
		try {
			// Step 1: Create auth user and generate reset link via Edge Function
			const { data: authData, error: authError } = await supabase.functions.invoke(
				"admin-auth-operations",
				{
					body: {
						operation: "inviteUser",
						email,
						userData: {
							name,
							role: role || "faculty",
							department,
							employee_id: employeeId,
							phone,
						},
					},
				}
			);

			if (authError) throw authError;

			if (!authData?.success) {
				throw new Error(authData?.error || "Failed to invite user");
			}

			// Step 2: Create the profile via database function
			const { data: profileData, error: profileError } = await supabase.rpc(
				"admin_create_user",
				{
					user_email: email,
					user_password: "temporary", // Will be changed by user via reset link
					user_name: name,
					user_role: role || "faculty",
					user_department: department,
					user_employee_id: employeeId,
					user_phone: phone,
				}
			);

			if (profileError) throw profileError;

			return {
				success: true,
				user: authData.data?.user,
				profile: profileData,
				resetLink: authData.data?.resetLink,
				message: "User invited successfully. Invitation email sent.",
			};
		} catch (error) {
			console.error("Error inviting user:", error);
			throw error;
		}
	},

	/**
	 * Create a new user - Complete creation flow (auth user + profile)
	 */
	createUser: async ({
		email,
		password,
		name,
		role,
		department,
		employeeId,
		phone,
	}: {
		email: string;
		password: string;
		name: string;
		role?: "super_admin" | "admin" | "faculty";
		department?: string;
		employeeId?: string;
		phone?: string;
	}) => {
		try {
			// Step 1: Create the auth user via Edge Function
			const { data: authData, error: authError } = await supabase.functions.invoke(
				"admin-auth-operations",
				{
					body: {
						operation: "createUser",
						email,
						password,
						userData: {
							name,
							role: role || "faculty",
							department,
							employee_id: employeeId,
							phone,
						},
					},
				}
			);

			if (authError) throw authError;

			if (!authData?.success) {
				throw new Error(authData?.error || "Failed to create auth user");
			}

			// Step 2: Create the profile via database function
			// Use the actual user ID from the auth operation if available
			const actualUserId = authData?.data?.user?.id;
			
			const { data: profileData, error: profileError } = await supabase.rpc(
				"admin_create_user",
				{
					user_email: email,
					user_password: password,
					user_name: name,
					user_role: role || "faculty",
					user_department: department,
					user_employee_id: employeeId,
					user_phone: phone,
				}
			);

			if (profileError) throw profileError;

			// Update the profile with the real auth user ID if we have it
			if (actualUserId && profileData?.user_id !== actualUserId) {
				await supabase
					.from("profiles")
					.update({ id: actualUserId })
					.eq("email", email);
			}

			return { 
				success: true, 
				user: authData.data?.user, 
				profile: profileData 
			};
		} catch (error) {
			console.error("Error creating user:", error);
			throw error;
		}
	},
};
