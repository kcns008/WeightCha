# WeightCha Framework Examples

This directory contains integration examples for popular web frameworks and libraries.

## 🚀 Quick Start Examples

### Vanilla JavaScript
```html
<!DOCTYPE html>
<html>
<head>
    <title>WeightCha Example</title>
</head>
<body>
    <form id="contact-form">
        <input type="email" placeholder="Email" required>
        <div id="weightcha-container"></div>
        <button type="submit">Submit</button>
    </form>

    <script src="https://unpkg.com/weightcha/dist/weightcha.min.js"></script>
    <script>
        const weightcha = new WeightCha({ apiKey: 'demo-key' });
        
        document.getElementById('contact-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const token = await weightcha.verify('weightcha-container');
                console.log('Verification successful:', token);
                // Submit form with token
            } catch (error) {
                console.error('Verification failed:', error);
            }
        });
    </script>
</body>
</html>
```

## 📚 Framework Examples

- **[React](./react/)** - React component and hooks
- **[Vue.js](./vue/)** - Vue component and composables  
- **[Angular](./angular/)** - Angular service and component
- **[Svelte](./svelte/)** - Svelte component integration
- **[Next.js](./nextjs/)** - Full-stack Next.js example
- **[Nuxt.js](./nuxtjs/)** - Universal Vue application
- **[WordPress](./wordpress/)** - WordPress plugin
- **[Shopify](./shopify/)** - Shopify app integration

## 🛠️ Backend Examples

- **[Node.js/Express](./nodejs-express/)** - REST API with validation
- **[Python/Django](./python-django/)** - Django middleware
- **[Python/FastAPI](./python-fastapi/)** - FastAPI integration
- **[PHP/Laravel](./php-laravel/)** - Laravel middleware
- **[Ruby on Rails](./ruby-rails/)** - Rails controller integration
- **[Go/Gin](./go-gin/)** - Gin middleware
- **[Java/Spring](./java-spring/)** - Spring Boot integration
- **[C#/.NET](./dotnet/)** - ASP.NET Core middleware

## 📱 Mobile Examples

- **[React Native](./react-native/)** - Cross-platform mobile
- **[Flutter](./flutter/)** - Dart/Flutter integration
- **[Ionic](./ionic/)** - Hybrid mobile apps

## 🎯 Use Case Examples

- **[E-commerce Checkout](./ecommerce/)** - Protect order forms
- **[User Registration](./registration/)** - Prevent fake accounts
- **[Contact Forms](./contact-forms/)** - Stop spam submissions
- **[Comment Systems](./comments/)** - Block spam comments
- **[Login Protection](./login/)** - Additional security layer

---

**Each example includes:**
- Complete working code
- Installation instructions
- Backend validation
- Error handling
- Customization options

**Need a specific example?** [Open an issue](https://github.com/weightcha/weightcha/issues) and we'll create it!
