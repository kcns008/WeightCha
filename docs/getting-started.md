# Getting Started with WeightCha

Welcome to WeightCha! This guide will help you integrate human verification into your website in just a few minutes.

## 🚀 Quick Integration

### Step 1: Install WeightCha

#### Option A: NPM (Recommended)
```bash
npm install weightcha
```

#### Option B: CDN
```html
<script src="https://unpkg.com/weightcha@latest/dist/weightcha.min.js"></script>
```

#### Option C: Download
Download from [GitHub Releases](https://github.com/weightcha/weightcha/releases)

### Step 2: Get API Key

#### For Testing (Demo Mode)
Use the demo API key: `demo-key`
- Works with our hosted demo endpoint
- No registration required
- Rate limited to 100 requests/hour

#### For Production
1. Sign up at [weightcha.com/signup](https://weightcha.com/signup)
2. Create a new project
3. Copy your API key from the dashboard

### Step 3: Add to Your Website

#### Basic HTML Integration
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <form id="myForm">
        <input type="email" placeholder="Email" required>
        <div id="weightcha-container"></div>
        <button type="submit">Submit</button>
    </form>

    <script src="https://unpkg.com/weightcha/dist/weightcha.min.js"></script>
    <script>
        const weightcha = new WeightCha({
            apiKey: 'demo-key',
            endpoint: 'https://api.weightcha.com'
        });

        document.getElementById('myForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Trigger WeightCha verification
            const token = await weightcha.verify('weightcha-container');
            
            if (token) {
                // Add token to form and submit
                const tokenInput = document.createElement('input');
                tokenInput.type = 'hidden';
                tokenInput.name = 'weightchaToken';
                tokenInput.value = token;
                e.target.appendChild(tokenInput);
                
                // Now submit the form
                e.target.submit();
            }
        });
    </script>
</body>
</html>
```

#### Modern JavaScript (ES6+)
```javascript
import { WeightCha } from 'weightcha';

const weightcha = new WeightCha({
    apiKey: 'your-api-key',
    endpoint: 'https://api.weightcha.com'
});

// Verify user
try {
    const token = await weightcha.verify('container-id', {
        theme: 'dark',
        onProgress: (progress) => console.log(`Progress: ${progress}%`),
        onSuccess: (token) => console.log('Verified!', token),
        onError: (error) => console.error('Failed:', error)
    });
    
    // Use token in your form submission
    await submitForm({ weightchaToken: token });
} catch (error) {
    console.error('Verification failed:', error);
}
```

## 🎨 Customization

### Themes
```javascript
const weightcha = new WeightCha({
    apiKey: 'your-api-key',
    theme: 'dark', // 'light', 'dark', or 'auto'
    colors: {
        primary: '#007bff',
        background: '#ffffff',
        text: '#333333'
    }
});
```

### Custom UI
```javascript
const weightcha = new WeightCha({
    apiKey: 'your-api-key',
    ui: {
        title: 'Verify you\'re human',
        subtitle: 'Gently press and hold your trackpad',
        buttonText: 'Verify',
        successMessage: 'Verification complete!'
    }
});
```

## 🔧 Backend Validation

### Node.js Example
```javascript
const express = require('express');
const axios = require('axios');

app.post('/submit-form', async (req, res) => {
    const { weightchaToken, ...formData } = req.body;
    
    try {
        // Validate WeightCha token
        const validation = await axios.post('https://api.weightcha.com/api/v1/verification/validate-token', {
            token: weightchaToken
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.WEIGHTCHA_API_KEY}`
            }
        });
        
        if (validation.data.isValid && validation.data.isHuman) {
            // Process the form
            await processForm(formData);
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Verification failed' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Validation error' });
    }
});
```

### Python/Django Example
```python
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def submit_form(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        weightcha_token = data.get('weightchaToken')
        
        # Validate token
        response = requests.post(
            'https://api.weightcha.com/api/v1/verification/validate-token',
            json={'token': weightcha_token},
            headers={'Authorization': f'Bearer {settings.WEIGHTCHA_API_KEY}'}
        )
        
        if response.json().get('isValid') and response.json().get('isHuman'):
            # Process form
            process_form(data)
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'error': 'Verification failed'}, status=400)
```

## 🧪 Testing

### Try the Demo
```bash
git clone https://github.com/weightcha/weightcha.git
cd weightcha
./start-demo.sh
```

Visit http://localhost:3000 to test WeightCha integration.

### Test Your Integration
1. Use the demo API key for development
2. Test on a MacBook with a trackpad
3. Check browser console for any errors
4. Verify tokens on your backend

## 📱 Device Compatibility

### Supported Devices
- ✅ **MacBook** (2015+) - Full pressure detection
- ✅ **iPad/iPhone** - Touch pressure fallback
- ✅ **Android** - Touch detection
- ✅ **Desktop** - Mouse click patterns

### Fallback Behavior
WeightCha automatically detects device capabilities:
- **TrackPad Available**: Uses pressure patterns
- **Touch Device**: Uses touch pressure and timing
- **Mouse Only**: Falls back to click patterns
- **Unsupported**: Shows traditional challenge

## 🔍 Troubleshooting

### Common Issues

#### "API Key not found"
- Check your API key is correct
- Ensure you're using the right endpoint
- Verify API key permissions

#### "WeightCha is not defined"
- Check the script is loaded before use
- Verify the CDN URL is accessible
- Try the NPM package instead

#### "Verification always fails"
- Check your device has a trackpad
- Try the demo page to test
- Check browser console for errors

#### "Token validation fails"
- Verify backend API key matches frontend
- Check token hasn't expired (5 minutes)
- Ensure proper request headers

### Getting Help
- 📖 [Full Documentation](https://docs.weightcha.com)
- 💬 [Discord Community](https://discord.gg/weightcha)
- 🐛 [GitHub Issues](https://github.com/weightcha/weightcha/issues)
- 📧 [Email Support](mailto:support@weightcha.com)

## 🚀 Next Steps

1. **Read the [API Reference](./api-reference.md)** for advanced usage
2. **Check [Framework Examples](./examples/)** for your tech stack
3. **Set up [Self-Hosting](./self-hosting.md)** for production
4. **Join our [Discord](https://discord.gg/weightcha)** for community support

---

**Ready to make your website more secure and user-friendly? [Get your API key now!](https://weightcha.com/signup)**
