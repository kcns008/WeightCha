# WeightCha API Reference

Complete API documentation for integrating WeightCha human verification into your applications.

## 🚀 Base URL

```
Production: https://api.weightcha.com
Demo: https://demo-api.weightcha.com
Self-hosted: https://your-domain.com
```

## 🔑 Authentication

All API requests require authentication using API keys in the Authorization header:

```bash
Authorization: Bearer YOUR_API_KEY
```

### Getting an API Key

#### For Testing
Use the demo API key: `demo-key`
- Works with demo endpoint
- Rate limited to 100 requests/hour
- No registration required

#### For Production
1. Sign up at [weightcha.com](https://weightcha.com)
2. Create a new project
3. Copy your API key from dashboard

## 📊 Rate Limits

| Plan | Requests per Hour | Concurrent Verifications |
|------|------------------|-------------------------|
| Demo | 100 | 5 |
| Starter | 10,000 | 100 |
| Pro | 100,000 | 1,000 |
| Enterprise | Unlimited | Unlimited |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 🛡️ Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or expired",
    "details": {
      "timestamp": "2024-01-01T12:00:00Z",
      "requestId": "req_123456789"
    }
  }
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_API_KEY` | 401 | API key is invalid or missing |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `CHALLENGE_NOT_FOUND` | 404 | Challenge ID doesn't exist |
| `CHALLENGE_EXPIRED` | 410 | Challenge has expired |
| `INVALID_PRESSURE_DATA` | 400 | Pressure data format is invalid |
| `VERIFICATION_FAILED` | 422 | Human verification failed |
| `INTERNAL_ERROR` | 500 | Server error |

## 📍 Endpoints

### 1. Create Challenge

Create a new verification challenge.

```http
POST /api/v1/challenges
```

#### Request Body
```json
{
  "type": "pressure_pattern",
  "difficulty": "medium",
  "options": {
    "duration": 3000,
    "minPressure": 0.1,
    "maxPressure": 1.0
  },
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1",
    "sessionId": "sess_123"
  }
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Challenge type (see below) |
| `difficulty` | string | No | `easy`, `medium`, `hard` (default: `medium`) |
| `options` | object | No | Challenge-specific options |
| `metadata` | object | No | Additional context data |

#### Challenge Types

| Type | Description | Duration |
|------|-------------|----------|
| `pressure_pattern` | Detect natural pressure variations | 3-5 seconds |
| `rhythm_test` | Analyze timing patterns | 5-8 seconds |
| `sustained_pressure` | Maintain steady pressure | 3-4 seconds |
| `progressive_pressure` | Gradually increase pressure | 4-6 seconds |

#### Response
```json
{
  "success": true,
  "data": {
    "challengeId": "chall_7a4b2f5c8e9d",
    "type": "pressure_pattern",
    "difficulty": "medium",
    "expiresAt": "2024-01-01T12:05:00Z",
    "instructions": {
      "title": "Verify you're human",
      "description": "Gently press and hold your trackpad",
      "duration": 3000
    },
    "websocketUrl": "wss://ws.weightcha.com/challenges/chall_7a4b2f5c8e9d"
  }
}
```

### 2. Get Challenge Details

Retrieve information about a specific challenge.

```http
GET /api/v1/challenges/{challengeId}
```

#### Response
```json
{
  "success": true,
  "data": {
    "challengeId": "chall_7a4b2f5c8e9d",
    "type": "pressure_pattern",
    "status": "pending",
    "createdAt": "2024-01-01T12:00:00Z",
    "expiresAt": "2024-01-01T12:05:00Z",
    "attempts": 0,
    "maxAttempts": 3
  }
}
```

### 3. Submit Verification Data

Submit pressure data for verification.

```http
POST /api/v1/verification/submit
```

#### Request Body
```json
{
  "challengeId": "chall_7a4b2f5c8e9d",
  "pressureData": [
    {
      "timestamp": 0,
      "pressure": 0.0,
      "x": 0.5,
      "y": 0.5
    },
    {
      "timestamp": 16,
      "pressure": 0.15,
      "x": 0.51,
      "y": 0.5
    }
  ],
  "deviceInfo": {
    "platform": "macOS",
    "deviceModel": "MacBook Pro",
    "trackpadType": "ForceTouch",
    "browserAgent": "Safari/15.0"
  }
}
```

#### Pressure Data Format

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | number | Milliseconds from start |
| `pressure` | number | Pressure value (0.0 - 1.0) |
| `x` | number | X coordinate (0.0 - 1.0) |
| `y` | number | Y coordinate (0.0 - 1.0) |

#### Response
```json
{
  "success": true,
  "data": {
    "verificationId": "ver_9f2a8b4d6e1c",
    "status": "processing",
    "estimatedTime": 500
  }
}
```

### 4. Get Verification Result

Check the result of a verification.

```http
GET /api/v1/verification/{verificationId}
```

#### Response
```json
{
  "success": true,
  "data": {
    "verificationId": "ver_9f2a8b4d6e1c",
    "challengeId": "chall_7a4b2f5c8e9d",
    "status": "completed",
    "result": {
      "isHuman": true,
      "confidence": 0.94,
      "riskScore": 0.06,
      "token": "eyJhbGciOiJIUzI1NiIs..."
    },
    "analysis": {
      "pressureVariance": 0.12,
      "timingNaturalness": 0.89,
      "patternConsistency": 0.91,
      "detectedPatterns": ["micro_variations", "natural_timing"]
    },
    "completedAt": "2024-01-01T12:01:30Z"
  }
}
```

#### Result Fields

| Field | Type | Description |
|-------|------|-------------|
| `isHuman` | boolean | Whether verification passed |
| `confidence` | number | Confidence score (0.0 - 1.0) |
| `riskScore` | number | Bot risk score (0.0 - 1.0) |
| `token` | string | JWT token for validation |

### 5. Validate Token

Validate a WeightCha verification token on your backend.

```http
POST /api/v1/verification/validate-token
```

#### Request Body
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "isHuman": true,
    "confidence": 0.94,
    "challengeId": "chall_7a4b2f5c8e9d",
    "verificationId": "ver_9f2a8b4d6e1c",
    "issuedAt": "2024-01-01T12:01:30Z",
    "expiresAt": "2024-01-01T12:06:30Z",
    "apiKeyId": "key_a1b2c3d4e5f6"
  }
}
```

### 6. Delete Challenge

Cancel a pending challenge.

```http
DELETE /api/v1/challenges/{challengeId}
```

#### Response
```json
{
  "success": true,
  "message": "Challenge deleted successfully"
}
```

## 📊 Analytics Endpoints

### Get Verification Statistics

```http
GET /api/v1/analytics/stats
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string | Start date (ISO 8601) |
| `to` | string | End date (ISO 8601) |
| `granularity` | string | `hour`, `day`, `week`, `month` |

#### Response
```json
{
  "success": true,
  "data": {
    "totalVerifications": 15420,
    "successRate": 0.985,
    "averageConfidence": 0.91,
    "botDetectionRate": 0.992,
    "timeline": [
      {
        "timestamp": "2024-01-01T00:00:00Z",
        "verifications": 156,
        "successRate": 0.98
      }
    ]
  }
}
```

## 🔌 WebSocket API

For real-time pressure data streaming:

```javascript
const ws = new WebSocket('wss://ws.weightcha.com/challenges/chall_7a4b2f5c8e9d');

// Send pressure data
ws.send(JSON.stringify({
  type: 'pressure_data',
  data: {
    timestamp: Date.now(),
    pressure: 0.15,
    x: 0.5,
    y: 0.5
  }
}));

// Receive updates
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'verification_complete') {
    console.log('Result:', message.data);
  }
};
```

## 🛠️ SDK Integration

### JavaScript/TypeScript SDK

```bash
npm install weightcha
```

```javascript
import { WeightCha } from 'weightcha';

const weightcha = new WeightCha({
  apiKey: 'your-api-key',
  endpoint: 'https://api.weightcha.com'
});

// Simple verification
const token = await weightcha.verify('container-id');

// Advanced options
const token = await weightcha.verify('container-id', {
  challengeType: 'pressure_pattern',
  difficulty: 'medium',
  theme: 'dark',
  onProgress: (progress) => console.log(`${progress}%`),
  onSuccess: (token) => console.log('Verified!'),
  onError: (error) => console.error('Failed:', error)
});
```

### Python SDK

```bash
pip install weightcha
```

```python
from weightcha import WeightCha

weightcha = WeightCha(api_key='your-api-key')

# Create challenge
challenge = weightcha.create_challenge(
    challenge_type='pressure_pattern',
    difficulty='medium'
)

# Validate token
result = weightcha.validate_token(token)
if result.is_human:
    print(f"Human verified with {result.confidence} confidence")
```

## 🔧 Backend Integration Examples

### Node.js/Express

```javascript
const express = require('express');
const axios = require('axios');

app.post('/submit-form', async (req, res) => {
  const { weightchaToken, ...formData } = req.body;
  
  try {
    const validation = await axios.post(
      'https://api.weightcha.com/api/v1/verification/validate-token',
      { token: weightchaToken },
      { headers: { 'Authorization': `Bearer ${process.env.WEIGHTCHA_API_KEY}` }}
    );
    
    if (validation.data.data.isValid && validation.data.data.isHuman) {
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

### Python/Django

```python
import requests
from django.http import JsonResponse
from django.conf import settings

def submit_form(request):
    token = request.POST.get('weightchaToken')
    
    response = requests.post(
        'https://api.weightcha.com/api/v1/verification/validate-token',
        json={'token': token},
        headers={'Authorization': f'Bearer {settings.WEIGHTCHA_API_KEY}'}
    )
    
    if response.json()['data']['isValid'] and response.json()['data']['isHuman']:
        # Process form
        return JsonResponse({'success': True})
    else:
        return JsonResponse({'error': 'Verification failed'}, status=400)
```

### PHP/Laravel

```php
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class FormController extends Controller
{
    public function submit(Request $request)
    {
        $token = $request->input('weightchaToken');
        
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('services.weightcha.api_key')
        ])->post('https://api.weightcha.com/api/v1/verification/validate-token', [
            'token' => $token
        ]);
        
        $data = $response->json()['data'];
        
        if ($data['isValid'] && $data['isHuman']) {
            // Process form
            return response()->json(['success' => true]);
        }
        
        return response()->json(['error' => 'Verification failed'], 400);
    }
}
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "os"
)

type ValidationRequest struct {
    Token string `json:"token"`
}

type ValidationResponse struct {
    Success bool `json:"success"`
    Data struct {
        IsValid bool    `json:"isValid"`
        IsHuman bool    `json:"isHuman"`
        Confidence float64 `json:"confidence"`
    } `json:"data"`
}

func submitForm(w http.ResponseWriter, r *http.Request) {
    token := r.FormValue("weightchaToken")
    
    reqBody, _ := json.Marshal(ValidationRequest{Token: token})
    
    req, _ := http.NewRequest("POST", 
        "https://api.weightcha.com/api/v1/verification/validate-token", 
        bytes.NewBuffer(reqBody))
    
    req.Header.Set("Authorization", "Bearer " + os.Getenv("WEIGHTCHA_API_KEY"))
    req.Header.Set("Content-Type", "application/json")
    
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        http.Error(w, "Validation error", http.StatusInternalServerError)
        return
    }
    defer resp.Body.Close()
    
    var validation ValidationResponse
    json.NewDecoder(resp.Body).Decode(&validation)
    
    if validation.Data.IsValid && validation.Data.IsHuman {
        // Process form
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]bool{"success": true})
    } else {
        http.Error(w, "Verification failed", http.StatusBadRequest)
    }
}
```

## 🔒 Security Best Practices

### API Key Security
- Store API keys as environment variables
- Never expose API keys in client-side code
- Rotate API keys regularly
- Use different keys for different environments

### Token Validation
- Always validate tokens on your backend
- Check token expiration
- Verify the issuer and audience
- Rate limit token validation requests

### Request Security
- Use HTTPS for all API requests
- Validate all input data
- Implement request signing for critical operations
- Monitor for unusual patterns

## 📈 Performance Optimization

### Caching
- Cache API key validation results
- Store challenge details temporarily
- Use CDN for SDK delivery

### Request Optimization
- Batch multiple operations when possible
- Use appropriate HTTP methods
- Implement connection pooling
- Set reasonable timeouts

### Error Handling
- Implement exponential backoff
- Handle rate limiting gracefully
- Provide fallback mechanisms
- Log errors for monitoring

## 📊 Monitoring and Debugging

### Request Headers
Include these headers for better debugging:

```
X-WeightCha-Version: 1.0.0
X-WeightCha-SDK: javascript/1.2.3
X-Request-ID: req_123456789
```

### Debug Mode
Enable debug mode for detailed logging:

```javascript
const weightcha = new WeightCha({
  apiKey: 'your-api-key',
  debug: true
});
```

### Health Checks
Monitor API health:

```http
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "api": "healthy"
  }
}
```

## 🆘 Support

- 📖 **Documentation**: [docs.weightcha.com](https://docs.weightcha.com)
- 💬 **Discord**: [discord.gg/weightcha](https://discord.gg/weightcha)
- 🐛 **Issues**: [GitHub Issues](https://github.com/weightcha/weightcha/issues)
- 📧 **API Support**: api-support@weightcha.com

---

**Need help integrating WeightCha?** Join our [Discord community](https://discord.gg/weightcha) or check out our [integration examples](../examples/)!
