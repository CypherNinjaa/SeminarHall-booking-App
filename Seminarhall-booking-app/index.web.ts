// Web-specific entry point
import { registerRootComponent } from "expo";
import App from "./App";

// Set up import.meta polyfill for web
(globalThis as any).importMeta = {
	env: process.env,
	hot: false,
	url: typeof window !== "undefined" ? window.location.href : "",
};

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
