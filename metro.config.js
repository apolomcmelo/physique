const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support for SVG and other asset types
config.resolver.assetExts.push('db', 'ttf', 'obj', 'png', 'jpg');

// Supabase uses ESM (.mjs) — tell Metro to resolve it
config.resolver.sourceExts.push('mjs');

module.exports = config;
