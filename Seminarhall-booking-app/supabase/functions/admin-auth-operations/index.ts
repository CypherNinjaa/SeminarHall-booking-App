/// <reference path="./types.d.ts" />

// admin-auth-operations.ts
// Note: TypeScript errors in this file are expected since this is a Deno Edge Function
// The imports and Deno globals work correctly when deployed to Supabase
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
// @ts-ignore
import { corsHeaders } from "../_shared/cors.ts";

// This Edge Function handles admin operations that require service role access
// It should be protected by checking for admin permissions

Deno.serve(async (req: Request) => {
	// Handle CORS
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		// Get the request body
		const { operation, userId, email, password, userData } = await req.json();

		// Create a service role client
		const supabaseAdmin = createClient(
			Deno.env.get("SUPABASE_URL")!,
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false,
				},
			}
		);

		// Create a client using the user's auth token to verify permissions
		const authHeader = req.headers.get("Authorization");
		if (!authHeader) {
			return new Response(
				JSON.stringify({ error: "Missing Authorization header" }),
				{
					status: 401,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		const supabaseClient = createClient(
			Deno.env.get("SUPABASE_URL")!,
			Deno.env.get("SUPABASE_ANON_KEY")!,
			{
				global: {
					headers: { Authorization: authHeader },
				},
			}
		);

		// Verify the user is a super_admin
		const { data: userAuth, error: authError } =
			await supabaseClient.auth.getUser();
		if (authError || !userAuth.user) {
			return new Response(JSON.stringify({ error: "Invalid authentication" }), {
				status: 401,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		const { data: user, error: userError } = await supabaseClient
			.from("profiles")
			.select("role, is_active")
			.eq("id", userAuth.user.id)
			.single();

		if (userError || !user || user.role !== "super_admin" || !user.is_active) {
			return new Response(
				JSON.stringify({
					error: "Access denied. Super admin privileges required.",
				}),
				{
					status: 403,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				}
			);
		}

		// Perform the requested operation
		let result;
		switch (operation) {
			case "createUser":
				// Create the actual auth user
				result = await supabaseAdmin.auth.admin.createUser({
					email,
					password,
					email_confirm: true,
					user_metadata: userData,
				});
				break;

			case "inviteUser":
				// Create auth user and send invitation email
				result = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
					data: userData,
					redirectTo: `${Deno.env.get("SITE_URL")}/auth/callback`,
				});
				break;

			case "deleteUser":
				// Delete the auth user (profile deletion is handled separately)
				result = await supabaseAdmin.auth.admin.deleteUser(userId);
				break;

			case "updateUserEmail":
				result = await supabaseAdmin.auth.admin.updateUserById(userId, {
					email,
				});
				break;

			default:
				return new Response(JSON.stringify({ error: "Invalid operation" }), {
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
		}

		return new Response(JSON.stringify({ success: true, data: result }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Edge function error:", error);
		return new Response(
			JSON.stringify({ 
				success: false, 
				error: error instanceof Error ? error.message : String(error)
			}),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			}
		);
	}
});
