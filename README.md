# **vlt** serverless registry (`vsr`)

> A modern, npm-compatible serverless registry that's fast, secure,
> and ridiculously easy to deploy.

`vsr` is a minimal yet powerful npm-compatible registry that
replicates core npm features while adding cutting-edge capabilities.
Built for the modern web, it runs seamlessly on Cloudflare's global
edge network.

<img src="https://github.com/user-attachments/assets/e76c6f8a-a078-4787-963c-8ec95a879731" alt="vsr api screenshot" />

## 🚀 Quick Start

```bash
vlx -y @vltpkg/vsr
# VSR Running: http://localhost:1337
```

Common flags:

```bash
vsr --port 4000   # custom ports
vsr --debug       # stream all server logs
vsr --help        # full flag reference
```

## ✨ Why Choose VSR?

- **🔥 Fast**: The speed of setup and startup makes it great for dev/CI
- **🔐 Secure by Default**: Integrity validation and granular access controls
- **🛠 Backwards Compatible**: Drop-in replacement for legacy tools

## 💻 Development Requirements

- Node.js
- Wrangler
- VLT

## 📚 Resources

- **[Configuration Guide](info/CONFIGURATION.md)**
- **[Testing Guide](info/TESTING.md)**
- **[Deployment Guide](info/DEPLOY.md)**
- **[Database Setup](info/DATABASE_SETUP.md)**
- **[Access Control](info/GRANULAR_ACCESS_TOKENS.md)**
- **[Support Guide](info/USER_SUPPORT.md)**
- **[Contributing Guide](info/CONTRIBUTING.md)**
- **[Project Structure](info/PROJECT_STRUCTURE.md)**
- **[Product Roadmap](info/ROADMAP.md)**
- **[Comparisons](info/COMPARISONS.md)**

## 📄 License

VSR is licensed under the **[Functional Source License](https://fsl.software)**
([FSL-1.1-MIT](LICENSE.md)) - free for most use cases, with commercial
restrictions that convert to MIT after two years.
