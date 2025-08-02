# 🚀 WeightCha Quick Install

One-line installation for the WeightCha human verification system.

## For Websites (NPM)

```bash
# Install the SDK
npm install weightcha

# Or use Yarn
yarn add weightcha
```

## For Testing (CDN)

```html
<!-- Add to your HTML -->
<script src="https://unpkg.com/weightcha@latest/dist/weightcha.min.js"></script>

<!-- Quick test -->
<div id="weightcha-demo"></div>
<script>
  const weightcha = new WeightCha({ apiKey: 'demo-key' });
  weightcha.verify('weightcha-demo');
</script>
```

## For Self-Hosting (Docker)

```bash
# Clone and start
git clone https://github.com/weightcha/weightcha.git
cd weightcha
./quick-start.sh
```

## Framework-Specific

### React
```bash
npm install weightcha react
```

### Vue
```bash
npm install weightcha vue
```

### Angular
```bash
npm install weightcha @angular/core
```

## Need Help?

- 📖 [Full Documentation](./docs/getting-started.md)
- 💬 [Discord Community](https://discord.gg/weightcha)
- 🐛 [Report Issues](https://github.com/weightcha/weightcha/issues)

**⚡ Get started in under 60 seconds!**
