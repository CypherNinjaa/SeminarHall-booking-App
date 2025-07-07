/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		domains: ["localhost"],
	},
	env: {
		NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
		NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		NEXT_PUBLIC_APP_SCHEME:
			process.env.NEXT_PUBLIC_APP_SCHEME || "amityseminarhall",
	},
};

module.exports = nextConfig;
