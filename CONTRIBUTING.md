# Contributing to WeightCha

Welcome! We're thrilled that you're interested in contributing to WeightCha. This guide will help you get started with contributing to our open source human verification system.

## 🌟 How You Can Contribute

We welcome all types of contributions:

- 🐛 **Bug Reports** - Help us identify and fix issues
- 💡 **Feature Requests** - Suggest new capabilities
- 🔧 **Code Contributions** - Submit pull requests
- 📝 **Documentation** - Improve guides and examples
- 🧪 **Testing** - Help test on different devices and platforms
- 🎨 **Design** - Improve UI/UX and visual design
- 🌍 **Internationalization** - Add language support
- 📦 **Integrations** - Create framework-specific packages

## 🚀 Quick Start for Contributors

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/weightcha.git
cd weightcha

# Add upstream remote
git remote add upstream https://github.com/weightcha/weightcha.git
```

### 2. Set Up Development Environment

```bash
# Install dependencies for all packages
npm install

# Start development environment
./start-local.sh

# Run tests
npm test
```

### 3. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/amazing-new-feature

# Keep your branch updated
git fetch upstream
git rebase upstream/main
```

## 📋 Development Guidelines

### Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Lint code
npm run lint

# Format code
npm run format

# Check types (TypeScript)
npm run type-check
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new pressure detection algorithm
fix: resolve iOS touch pressure issue
docs: update integration examples
test: add unit tests for pattern analyzer
refactor: simplify API key validation
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `style`: Code style changes
- `ci`: CI/CD changes

### Pull Request Process

1. **Update Documentation** - Ensure docs reflect your changes
2. **Add Tests** - Include tests for new functionality
3. **Update Changelog** - Add entry to CHANGELOG.md
4. **Check CI** - Ensure all checks pass
5. **Request Review** - Tag relevant maintainers

### Testing Requirements

All contributions must include appropriate tests:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:api        # Backend API tests
npm run test:sdk        # Web SDK tests
npm run test:e2e        # End-to-end tests

# Test coverage
npm run test:coverage
```

Minimum coverage requirements:
- New features: 90% coverage
- Bug fixes: Must include regression test
- Critical paths: 100% coverage

## 🏗️ Project Architecture

### Repository Structure
```
weightcha/
├── backend-api/           # Node.js API server
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── utils/         # Utilities
│   └── tests/             # API tests
├── web-sdk/               # JavaScript/TypeScript SDK
│   ├── src/               # SDK source code
│   └── tests/             # SDK tests
├── macos-client/          # Swift WebSocket server
├── demo/                  # Demo website
├── docs/                  # Documentation
└── tests/                 # E2E tests
```

### Key Components

#### Backend API (`backend-api/`)
- **Routes** (`routes/`) - Express route handlers
- **Services** (`services/`) - Core business logic
- **Middleware** (`middleware/`) - Authentication, validation, logging
- **Database** (`database/`) - Database connection and queries
- **Utils** (`utils/`) - Pattern analysis algorithms

#### Web SDK (`web-sdk/`)
- **Core SDK** (`src/index.ts`) - Main SDK implementation
- **UI Components** - Verification interface
- **Communication** - API and WebSocket handling
- **Types** - TypeScript definitions

#### Pattern Analysis Engine
- **Human Detection** - Pressure variance analysis
- **Timing Analysis** - Natural rhythm detection
- **Statistical Models** - Confidence scoring
- **Challenge Types** - Multiple verification methods

## 🐛 Reporting Bugs

### Before Reporting
1. **Search existing issues** - Check if already reported
2. **Try latest version** - Ensure bug exists in current release
3. **Minimal reproduction** - Create smallest possible example

### Bug Report Template
```markdown
**Bug Description**
A clear description of the bug.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. macOS 12.0]
- Browser: [e.g. Safari 15.0]
- Device: [e.g. MacBook Pro 2021]
- WeightCha Version: [e.g. 1.2.3]

**Additional Context**
Any other context about the problem.
```

## 💡 Feature Requests

### Before Requesting
1. **Check existing requests** - Avoid duplicates
2. **Consider scope** - Is it aligned with project goals?
3. **Think about implementation** - How would it work?

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Use Cases**
Who would use this feature and how?

**Implementation Ideas**
Any ideas on how this could be implemented.
```

## 🔧 Code Contribution Areas

### 🚨 High Priority
- **Browser Compatibility** - Support more browsers
- **Touch Devices** - Improve mobile experience
- **Performance** - Optimize API response times
- **Security** - Enhance pattern detection
- **Accessibility** - Improve screen reader support

### 🎯 Good First Issues
- **Documentation** - Fix typos, add examples
- **Tests** - Add unit or integration tests
- **Examples** - Create framework integrations
- **Translations** - Add language support
- **UI Polish** - Improve visual design

### 🚀 Advanced Features
- **Machine Learning** - Advanced pattern recognition
- **Analytics** - Usage statistics and insights
- **Admin Dashboard** - Management interface
- **Monitoring** - Performance metrics
- **Clustering** - Horizontal scaling support

## 🧪 Testing Strategy

### Unit Tests
```bash
# Backend API tests
cd backend-api
npm test

# Web SDK tests
cd web-sdk
npm test
```

### Integration Tests
```bash
# Full integration test suite
npm run test:integration
```

### End-to-End Tests
```bash
# Start test environment
./start-test.sh

# Run E2E tests
npm run test:e2e
```

### Manual Testing
1. **Device Testing** - Test on various devices
2. **Browser Testing** - Cross-browser compatibility
3. **Performance Testing** - Load and stress testing
4. **Security Testing** - Penetration testing

## 📝 Documentation

### Types of Documentation
- **API Reference** - Endpoint documentation
- **SDK Documentation** - Usage examples
- **Integration Guides** - Framework-specific guides
- **Architecture Docs** - Technical deep-dives
- **Troubleshooting** - Common issues and solutions

### Documentation Standards
- **Clear Examples** - Working code snippets
- **Complete Coverage** - Document all features
- **Up-to-Date** - Keep in sync with code
- **Accessible** - Easy to understand
- **Searchable** - Good organization

### Building Docs Locally
```bash
# Install docs dependencies
cd docs
npm install

# Start docs server
npm run serve

# Build for production
npm run build
```

## 🔒 Security

### Reporting Security Issues
**DO NOT** create public issues for security vulnerabilities.

Instead:
1. Email security@weightcha.com
2. Include detailed description
3. Provide reproduction steps
4. Suggest potential fixes

We'll respond within 48 hours and work with you to resolve the issue.

### Security Guidelines
- **Input Validation** - Validate all inputs
- **Authentication** - Secure API key handling
- **Encryption** - Use TLS for all communications
- **Secrets** - Never commit secrets to git
- **Dependencies** - Keep dependencies updated

## 🌍 Internationalization

We welcome translations! Currently supported languages:
- English (en)
- Spanish (es) - *needs contributors*
- French (fr) - *needs contributors*
- German (de) - *needs contributors*

### Adding a New Language
1. Create language file: `web-sdk/src/i18n/[lang].json`
2. Add translations for all UI strings
3. Update language detection logic
4. Add tests for new language
5. Update documentation

## 📦 Release Process

### Version Numbering
We use [Semantic Versioning](https://semver.org/):
- **Major** (1.0.0) - Breaking changes
- **Minor** (1.1.0) - New features, backward compatible
- **Patch** (1.1.1) - Bug fixes

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Tags created
- [ ] NPM packages published
- [ ] Docker images built
- [ ] Release notes written

## 🏆 Recognition

### Contributors
All contributors are recognized in:
- **README.md** - Contributor list
- **CONTRIBUTORS.md** - Detailed contributions
- **Release Notes** - Feature acknowledgments
- **Hall of Fame** - Top contributors

### Contribution Types
We recognize various contribution types:
- 💻 Code
- 📖 Documentation
- 🐛 Bug reports
- 💡 Ideas
- 🚇 Infrastructure
- 🎨 Design
- 🌍 Translation
- 👀 Reviews

## 📞 Getting Help

### Community Support
- 💬 **Discord** - [Join our community](https://discord.gg/weightcha)
- 📋 **Discussions** - [GitHub Discussions](https://github.com/weightcha/weightcha/discussions)
- 📧 **Email** - contributors@weightcha.com

### Development Questions
- **Architecture** - Ask about design decisions
- **Implementation** - Get help with technical issues
- **Best Practices** - Learn project conventions
- **Code Review** - Request feedback on approach

### Getting Started Help
- **Setup Issues** - Environment configuration
- **First Contribution** - Guidance for newcomers
- **Good First Issues** - Beginner-friendly tasks
- **Mentorship** - One-on-one guidance

## 📜 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive experience for everyone, regardless of:
- Age, body size, disability, ethnicity
- Gender identity and expression
- Level of experience, nationality
- Personal appearance, race, religion
- Sexual identity and orientation

### Expected Behavior
- **Be respectful** - Treat everyone with respect
- **Be collaborative** - Work together effectively
- **Be inclusive** - Welcome newcomers
- **Be constructive** - Provide helpful feedback
- **Be patient** - Help others learn

### Unacceptable Behavior
- Harassment, discrimination, or threats
- Trolling, insulting, or derogatory comments
- Public or private harassment
- Publishing private information
- Other conduct inappropriate in a professional setting

### Enforcement
Project maintainers will:
- Remove, edit, or reject contributions that violate the code of conduct
- Temporarily or permanently ban contributors for inappropriate behavior
- Report serious violations to appropriate authorities

Contact: conduct@weightcha.com

## 🎉 Thank You!

Thank you for considering contributing to WeightCha! Every contribution, no matter how small, helps make the web more secure and user-friendly.

**Ready to contribute?**
1. 🍴 [Fork the repository](https://github.com/weightcha/weightcha/fork)
2. 📖 [Read the getting started guide](./getting-started.md)
3. 💬 [Join our Discord](https://discord.gg/weightcha)
4. 🚀 [Pick a good first issue](https://github.com/weightcha/weightcha/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

---

**Questions?** Reach out to us at contributors@weightcha.com or join our Discord community!
