# React Integration Example

Complete React integration with hooks and components.

## 🚀 Quick Start

### Installation

```bash
npm install weightcha react
```

### Basic Usage

```jsx
import React, { useState } from 'react';
import { WeightCha } from 'weightcha';

function ContactForm() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [formData, setFormData] = useState({ email: '', message: '' });

  const weightcha = new WeightCha({
    apiKey: 'your-api-key',
    theme: 'light'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isVerified) {
      setIsVerifying(true);
      
      try {
        const token = await weightcha.verify('weightcha-container', {
          onSuccess: () => setIsVerified(true),
          onError: (error) => console.error('Verification failed:', error)
        });
        
        // Submit form with token
        await submitForm({ ...formData, weightchaToken: token });
      } catch (error) {
        console.error('Verification error:', error);
      } finally {
        setIsVerifying(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        placeholder="Email"
        required
      />
      
      <textarea
        value={formData.message}
        onChange={(e) => setFormData({...formData, message: e.target.value})}
        placeholder="Message"
        required
      />
      
      {!isVerified && (
        <div id="weightcha-container" style={{ margin: '20px 0' }} />
      )}
      
      <button type="submit" disabled={isVerifying}>
        {isVerifying ? 'Verifying...' : 'Submit'}
      </button>
      
      {isVerified && (
        <div style={{ color: 'green' }}>✅ Human verified!</div>
      )}
    </form>
  );
}

export default ContactForm;
```

## 🎨 WeightCha React Component

### WeightChaComponent.jsx

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { WeightCha } from 'weightcha';

const WeightChaComponent = ({ 
  apiKey,
  onSuccess,
  onError,
  theme = 'light',
  challengeType = 'pressure_pattern',
  difficulty = 'medium',
  className = '',
  style = {}
}) => {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('ready'); // 'ready', 'verifying', 'success', 'error'
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current || !apiKey) return;

    const weightcha = new WeightCha({
      apiKey,
      theme,
      challengeType,
      difficulty
    });

    const verify = async () => {
      setStatus('verifying');
      setError(null);
      
      try {
        const token = await weightcha.verify(containerRef.current, {
          onProgress: (progress) => setProgress(progress),
          onSuccess: (token) => {
            setStatus('success');
            onSuccess?.(token);
          },
          onError: (error) => {
            setStatus('error');
            setError(error.message);
            onError?.(error);
          }
        });
      } catch (err) {
        setStatus('error');
        setError(err.message);
        onError?.(err);
      }
    };

    // Auto-start verification when component mounts
    verify();
  }, [apiKey, theme, challengeType, difficulty, onSuccess, onError]);

  const getStatusMessage = () => {
    switch (status) {
      case 'ready':
        return 'Ready to verify';
      case 'verifying':
        return `Verifying... ${progress}%`;
      case 'success':
        return '✅ Verification successful!';
      case 'error':
        return `❌ ${error}`;
      default:
        return '';
    }
  };

  return (
    <div className={`weightcha-wrapper ${className}`} style={style}>
      <div 
        ref={containerRef}
        className="weightcha-container"
        style={{
          minHeight: '120px',
          border: '2px dashed #ccc',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f9f9f9',
          color: theme === 'dark' ? '#fff' : '#333'
        }}
      />
      
      <div 
        className="weightcha-status"
        style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '14px',
          color: status === 'error' ? '#e74c3c' : 
                 status === 'success' ? '#27ae60' : '#666'
        }}
      >
        {getStatusMessage()}
      </div>
    </div>
  );
};

export default WeightChaComponent;
```

## 🪝 Custom React Hook

### useWeightCha.js

```jsx
import { useState, useCallback, useRef } from 'react';
import { WeightCha } from 'weightcha';

export const useWeightCha = (config = {}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  
  const weightchaRef = useRef(null);

  const initialize = useCallback((apiKey, options = {}) => {
    weightchaRef.current = new WeightCha({
      apiKey,
      ...config,
      ...options
    });
  }, [config]);

  const verify = useCallback(async (containerId, options = {}) => {
    if (!weightchaRef.current) {
      throw new Error('WeightCha not initialized. Call initialize() first.');
    }

    setIsVerifying(true);
    setError(null);
    setProgress(0);

    try {
      const verificationToken = await weightchaRef.current.verify(containerId, {
        onProgress: (prog) => setProgress(prog),
        onSuccess: (token) => {
          setIsVerified(true);
          setToken(token);
        },
        onError: (err) => {
          setError(err);
          setIsVerified(false);
        },
        ...options
      });

      return verificationToken;
    } catch (err) {
      setError(err);
      setIsVerified(false);
      throw err;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsVerifying(false);
    setIsVerified(false);
    setProgress(0);
    setError(null);
    setToken(null);
  }, []);

  return {
    initialize,
    verify,
    reset,
    isVerifying,
    isVerified,
    progress,
    error,
    token
  };
};
```

### Usage with Hook

```jsx
import React, { useEffect } from 'react';
import { useWeightCha } from './hooks/useWeightCha';

function FormWithHook() {
  const {
    initialize,
    verify,
    reset,
    isVerifying,
    isVerified,
    progress,
    error,
    token
  } = useWeightCha({
    theme: 'dark',
    challengeType: 'pressure_pattern'
  });

  useEffect(() => {
    initialize('your-api-key');
  }, [initialize]);

  const handleVerify = async () => {
    try {
      await verify('weightcha-container');
      console.log('Verification token:', token);
    } catch (err) {
      console.error('Verification failed:', err);
    }
  };

  return (
    <div>
      <div id="weightcha-container" />
      
      <button onClick={handleVerify} disabled={isVerifying}>
        {isVerifying ? `Verifying... ${progress}%` : 'Verify'}
      </button>
      
      <button onClick={reset} disabled={isVerifying}>
        Reset
      </button>
      
      {isVerified && <div>✅ Verified! Token: {token}</div>}
      {error && <div>❌ Error: {error.message}</div>}
    </div>
  );
}
```

## 🎛️ Advanced Configuration

### Context Provider

```jsx
import React, { createContext, useContext, useRef } from 'react';
import { WeightCha } from 'weightcha';

const WeightChaContext = createContext(null);

export const WeightChaProvider = ({ children, config }) => {
  const weightchaRef = useRef(new WeightCha(config));

  return (
    <WeightChaContext.Provider value={weightchaRef.current}>
      {children}
    </WeightChaContext.Provider>
  );
};

export const useWeightChaContext = () => {
  const context = useContext(WeightChaContext);
  if (!context) {
    throw new Error('useWeightChaContext must be used within WeightChaProvider');
  }
  return context;
};
```

### App.jsx with Provider

```jsx
import React from 'react';
import { WeightChaProvider } from './context/WeightChaContext';
import ContactForm from './components/ContactForm';

function App() {
  const weightchaConfig = {
    apiKey: process.env.REACT_APP_WEIGHTCHA_API_KEY,
    theme: 'auto',
    endpoint: process.env.REACT_APP_WEIGHTCHA_ENDPOINT
  };

  return (
    <WeightChaProvider config={weightchaConfig}>
      <div className="App">
        <h1>My App</h1>
        <ContactForm />
      </div>
    </WeightChaProvider>
  );
}

export default App;
```

## 🎨 Styled Components Example

```jsx
import React from 'react';
import styled, { ThemeProvider } from 'styled-components';
import WeightChaComponent from './WeightChaComponent';

const Form = styled.form`
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid ${props => props.theme.border};
  border-radius: 8px;
  background: ${props => props.theme.background};
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 1px solid ${props => props.theme.border};
  border-radius: 4px;
  font-size: 16px;
`;

const Button = styled.button`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const theme = {
  primary: '#007bff',
  background: '#ffffff',
  border: '#e1e5e9'
};

function StyledForm() {
  return (
    <ThemeProvider theme={theme}>
      <Form>
        <Input type="email" placeholder="Email" required />
        <WeightChaComponent 
          apiKey="your-api-key"
          onSuccess={(token) => console.log('Token:', token)}
        />
        <Button type="submit">Submit</Button>
      </Form>
    </ThemeProvider>
  );
}
```

## 🧪 Testing

### Jest Test Example

```jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContactForm from '../ContactForm';

// Mock WeightCha
jest.mock('weightcha', () => ({
  WeightCha: jest.fn().mockImplementation(() => ({
    verify: jest.fn().mockResolvedValue('mock-token')
  }))
}));

describe('ContactForm', () => {
  test('renders form elements', () => {
    render(<ContactForm />);
    
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  test('handles form submission with verification', async () => {
    render(<ContactForm />);
    
    const emailInput = screen.getByPlaceholderText('Email');
    const messageInput = screen.getByPlaceholderText('Message');
    const submitButton = screen.getByRole('button', { name: /submit/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('✅ Human verified!')).toBeInTheDocument();
    });
  });
});
```

## 📱 React Native Example

```jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { WeightCha } from 'weightcha-react-native';

const ContactForm = () => {
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const weightcha = new WeightCha({
    apiKey: 'your-api-key',
    theme: 'light'
  });

  const handleSubmit = async () => {
    setIsVerifying(true);
    
    try {
      const token = await weightcha.verify({
        challengeType: 'touch_pressure',
        onProgress: (progress) => console.log(`Progress: ${progress}%`)
      });
      
      // Submit form with token
      await submitForm({ email, weightchaToken: token });
      Alert.alert('Success', 'Form submitted successfully!');
    } catch (error) {
      Alert.alert('Error', 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          marginBottom: 20
        }}
      />
      
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isVerifying}
        style={{
          backgroundColor: isVerifying ? '#ccc' : '#007bff',
          padding: 15,
          borderRadius: 5
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {isVerifying ? 'Verifying...' : 'Submit'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ContactForm;
```

## 🚀 Next Steps

1. **Install WeightCha**: `npm install weightcha`
2. **Get API Key**: [Sign up at weightcha.com](https://weightcha.com)
3. **Try the examples** in your React app
4. **Customize** the components for your needs
5. **Add backend validation** using our [API Reference](../api-reference.md)

## 📚 More Examples

- [Next.js Integration](../nextjs/)
- [TypeScript Examples](./typescript/)
- [Testing Guide](./testing/)
- [Performance Optimization](./performance/)

---

**Questions?** Join our [Discord community](https://discord.gg/weightcha) for React-specific help!
