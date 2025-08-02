# WeightCha Web SDK

[![npm version](https://badge.fury.io/js/weightcha.svg)](https://badge.fury.io/js/weightcha)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Next-generation human verification using trackpad pressure detection. A privacy-first CAPTCHA alternative.

## 🚀 Installation

```bash
npm install weightcha
```

## 📖 Quick Start

### Basic Usage

```javascript
import { WeightCha } from 'weightcha';

const weightcha = new WeightCha({
  apiKey: 'your-api-key'
});

// Verify user
const token = await weightcha.verify('container-id', {
  onSuccess: (token) => console.log('Human verified!', token),
  onError: (error) => console.error('Verification failed:', error)
});
```

### CDN Usage

```html
<div id="weightcha-container"></div>
<script src="https://unpkg.com/weightcha@latest/dist/weightcha.min.js"></script>
<script>
  const weightcha = new WeightCha({ 
    apiKey: 'demo-key',
    endpoint: 'https://api.weightcha.com' 
  });
  
  weightcha.verify('weightcha-container', {
    onSuccess: (token) => console.log('Human verified!', token),
    onError: (error) => console.log('Verification failed:', error)
  });
</script>
```

## 🎯 Features

- 🔒 **Privacy First** - No biometric data stored
- 🚀 **Easy Integration** - One-line setup
- 🎨 **Customizable** - Match your website's design
- 📱 **Cross-Platform** - Works on MacBook trackpads and touch devices
- 🔧 **TypeScript** - Full type support
- 🌐 **Framework Agnostic** - Works with any JavaScript framework

## 📚 Documentation

- [Getting Started](../docs/getting-started.md)
- [API Reference](../docs/api-reference.md)
- [Framework Examples](../docs/examples/)
- [Self-Hosting Guide](../docs/self-hosting.md)

## 🔧 Configuration

```typescript
interface WeightChaConfig {
  apiKey: string;                    // Your WeightCha API key
  baseUrl?: string;                  // API endpoint (default: https://api.weightcha.com)
  theme?: 'light' | 'dark' | 'auto'; // UI theme (default: auto)
  language?: string;                 // Language code (default: en)
  debug?: boolean;                   // Enable debug mode (default: false)
}
```

## 🎨 Customization

```javascript
const weightcha = new WeightCha({
  apiKey: 'your-api-key',
  theme: 'dark',
  language: 'en'
});
```

## 🔗 Links

- [GitHub Repository](https://github.com/weightcha/weightcha)
- [Documentation](https://docs.weightcha.com)
- [Demo](https://demo.weightcha.com)
- [Discord Community](https://discord.gg/weightcha)

## 📄 License

MIT © [WeightCha Team](https://weightcha.com)

A JavaScript/TypeScript SDK for integrating WeightCha human verification into web applications.

## Installation

### NPM
```bash
npm install weightcha-web-sdk
```

### CDN
```html
<script src="https://cdn.jsdelivr.net/npm/weightcha-web-sdk@latest/dist/weightcha.js"></script>
```

## Quick Start

### 1. Initialize WeightCha

```javascript
import { WeightCha } from 'weightcha-web-sdk';

const weightcha = new WeightCha({
  apiKey: 'your-api-key-here',
  theme: 'auto', // 'light', 'dark', or 'auto'
  debug: true
});

await weightcha.init();
```

### 2. Add Verification to Your Form

```html
<form id="my-form">
  <input type="email" name="email" required>
  <input type="password" name="password" required>
  
  <!-- WeightCha verification container -->
  <div id="weightcha-verification"></div>
  
  <button type="submit">Sign In</button>
</form>
```

### 3. Implement Verification

```javascript
document.getElementById('my-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const result = await weightcha.verify('weightcha-verification', {
      type: 'pressure_pattern',
      difficulty: 'medium',
      onSuccess: (token) => {
        console.log('Verification successful!', token);
        // Include token with form submission
        submitForm(token);
      },
      onError: (error) => {
        console.error('Verification failed:', error);
      }
    });
    
  } catch (error) {
    console.error('WeightCha error:', error);
  }
});
```

## API Reference

### WeightCha Class

#### Constructor
```typescript
new WeightCha(config: WeightChaConfig)
```

**WeightChaConfig:**
- `apiKey` (string): Your WeightCha API key
- `baseUrl` (string, optional): API base URL (default: 'https://api.weightcha.com')
- `theme` (string, optional): UI theme - 'light', 'dark', or 'auto' (default: 'auto')
- `language` (string, optional): Language code (default: 'en')
- `debug` (boolean, optional): Enable debug logging (default: false)

#### Methods

##### `init(): Promise<void>`
Initialize the WeightCha SDK. Must be called before verification.

##### `verify(containerId: string, options?: ChallengeOptions): Promise<VerificationResult>`
Start a verification challenge in the specified container.

**ChallengeOptions:**
- `type` (string, optional): Challenge type
  - `'pressure_pattern'`: Apply steady pressure (default)
  - `'rhythm_test'`: Follow a rhythm pattern
  - `'sustained_pressure'`: Maintain pressure while moving
  - `'progressive_pressure'`: Gradually increase pressure
- `difficulty` (string, optional): 'easy', 'medium', 'hard' (default: 'medium')
- `duration` (number, optional): Challenge duration in seconds
- `onSuccess` (function, optional): Called when verification succeeds
- `onError` (function, optional): Called when verification fails
- `onCancel` (function, optional): Called when user cancels

**VerificationResult:**
- `success` (boolean): Whether verification was successful
- `token` (string, optional): Verification token for backend validation
- `isHuman` (boolean, optional): Whether user was detected as human
- `confidence` (number, optional): Confidence score (0-1)
- `error` (string, optional): Error message if failed

##### `validateToken(token: string): Promise<boolean>`
Validate a verification token on the client side.

## Challenge Types

### Pressure Pattern
```javascript
await weightcha.verify('container', {
  type: 'pressure_pattern',
  duration: 5
});
```
User applies gentle, steady pressure for the specified duration.

### Rhythm Test
```javascript
await weightcha.verify('container', {
  type: 'rhythm_test',
  difficulty: 'easy'
});
```
User follows a tap rhythm pattern.

### Sustained Pressure
```javascript
await weightcha.verify('container', {
  type: 'sustained_pressure',
  duration: 10
});
```
User maintains light pressure while moving finger in a circle.

### Progressive Pressure
```javascript
await weightcha.verify('container', {
  type: 'progressive_pressure',
  duration: 7
});
```
User gradually increases pressure from light to firm.

## Backend Integration

After successful verification, send the token to your backend:

```javascript
// Frontend
const result = await weightcha.verify('container');
if (result.success) {
  // Send to your backend
  const response = await fetch('/api/verify-human', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weightchaToken: result.token,
      // ... other form data
    })
  });
}
```

```javascript
// Backend (Node.js example)
app.post('/api/verify-human', async (req, res) => {
  const { weightchaToken } = req.body;
  
  // Validate with WeightCha API
  const isValid = await fetch('https://api.weightcha.com/api/v1/verification/validate-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${YOUR_API_KEY}`
    },
    body: JSON.stringify({ token: weightchaToken })
  });
  
  const validation = await isValid.json();
  
  if (validation.data.valid && validation.data.isHuman) {
    // Human verified - process request
    res.json({ success: true });
  } else {
    // Verification failed
    res.status(400).json({ error: 'Human verification required' });
  }
});
```

## Requirements

- **macOS**: WeightCha requires macOS with Force Touch trackpad
- **WeightCha Client**: Users must have the WeightCha macOS app installed
- **Modern Browser**: Supports WebSocket and Fetch API

## Error Handling

```javascript
try {
  await weightcha.init();
  const result = await weightcha.verify('container');
} catch (error) {
  if (error.message.includes('WeightCha client not installed')) {
    // Show installation instructions
    showInstallInstructions();
  } else if (error.message.includes('macOS')) {
    // Platform not supported
    showPlatformError();
  } else {
    // Other error
    console.error('WeightCha error:', error);
  }
}
```

## Styling

The WeightCha widget can be customized with CSS:

```css
.weightcha-container {
  /* Custom container styles */
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.weightcha-btn-primary {
  /* Custom button styles */
  background: linear-gradient(45deg, #007AFF, #00C7FF);
}
```

## TypeScript Support

The SDK includes full TypeScript definitions:

```typescript
import { WeightCha, WeightChaConfig, ChallengeOptions, VerificationResult } from 'weightcha-web-sdk';

const config: WeightChaConfig = {
  apiKey: 'your-api-key',
  theme: 'dark',
  debug: true
};

const weightcha = new WeightCha(config);
```

## License

MIT License - see LICENSE file for details.
