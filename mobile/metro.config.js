const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const { assetExts } = config.resolver;
config.resolver.assetExts = [...new Set([...assetExts, 'txt'])];

module.exports = config;
