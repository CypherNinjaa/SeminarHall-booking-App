const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Configure resolver for web compatibility
config.resolver.platforms = ["web", "native", "ios", "android"];

// Add transformer to handle import.meta for web
config.transformer = {
	...config.transformer,
	babelTransformerPath: require.resolve("./metro-transformer.js"),
};

module.exports = config;
