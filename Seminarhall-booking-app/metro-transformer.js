const upstreamTransformer = require("metro-react-native-babel-transformer");

module.exports.transform = function ({ src, filename, options }) {
	// Handle import.meta for web platform
	if (options.platform === "web" && src.includes("import.meta")) {
		// Replace import.meta with a polyfill
		src = src.replace(
			/import\.meta/g,
			'(typeof globalThis !== "undefined" && globalThis.importMeta) || { env: process.env, hot: false }'
		);
	}

	return upstreamTransformer.transform({ src, filename, options });
};
