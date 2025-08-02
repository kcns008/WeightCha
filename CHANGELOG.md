# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2024-08-02

### Fixed
- Fixed module compatibility issues between CommonJS and ES modules
- Updated build configuration to output proper `.cjs` and `.esm.js` files
- Added proper `exports` field in package.json for better module resolution

### Changed
- Improved TypeScript configuration for better type checking
- Updated build dependencies to latest versions
- Enhanced rollup configuration with proper plugin usage

## [1.0.0] - 2024-08-02

### Added
- Initial release of WeightCha Web SDK
- TypeScript support with full type definitions
- Multiple build formats (CommonJS, ES Modules, UMD, minified UMD)
- Comprehensive API for human verification using trackpad pressure
- Support for customizable themes and UI
- Framework-agnostic integration
- Comprehensive documentation and examples

### Features
- Human verification using trackpad pressure detection
- Privacy-first approach with no biometric data storage
- Easy integration with any JavaScript framework
- Customizable UI components
- Real-time verification feedback
- Error handling and fallback mechanisms
- Cross-platform compatibility
