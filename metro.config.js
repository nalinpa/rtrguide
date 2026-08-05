const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@tanstack/query-core" || moduleName.startsWith("@tanstack/query-core/")) {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false, mainFields: ["main"] },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
