# ChatGov - US Bill Search & AI Chat

A comprehensive webapp for searching US House/Senate bills with AI-powered chat functionality. Built with React 19, TypeScript, Tailwind CSS 4, and LangChain integration.

## Features

- 🏛️ **Bill Search**: Browse and search US Congressional bills with real-time data
- 🤖 **AI Chat**: Ask questions about specific bills using multiple AI providers
- 📄 **Full Text Analysis**: Download complete bill text with vector embeddings for semantic search
- 🔍 **Smart Search**: AI-powered similarity search through bill sections
- ⚙️ **Multiple AI Providers**: Support for OpenAI, Anthropic, xAI, and Ollama
- 📊 **Comprehensive Logging**: Detailed progress tracking for downloads and embeddings
- 🔒 **Server-side API**: Secure Congress API token usage via Express backend

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment** (optional):
   ```bash
   cp .env.example .env
   # Edit .env and add your Congress API key for better rate limits
   ```

3. **Development**:
   ```bash
   # Development with hot reload (client + server)
   npm run dev:all
   
   # Or run separately:
   npm run server:dev  # Express server on port 3001
   npm run dev         # Vite client on port 5173
   ```

4. **Production**:
   ```bash
   # Build and start production server
   npm start           # Builds client and starts server on port 3001
   
   # Or run commands separately:
   npm run build       # Build client files
   npm run serve       # Start production server
   ```

5. **Configure AI Settings**: 
   - Click the settings icon in the top-right corner
   - Add API keys for your preferred AI providers
   - Select embedding provider and models

## Architecture

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Express.js server serving both API and static files
- **AI Integration**: LangChain with multiple provider support
- **Development**: Vite for fast development builds
- **Production**: Single Express server serving everything on one port

### Server Endpoints

- `GET /` - Serves the React application
- `POST /api/bills/content` - Downloads and processes bill text
- `GET /api/bills/:congress/:type/:number/content` - Alternative bill content endpoint
- `DELETE /api/bills/cache` - Clears server-side bill cache
- `GET /api/health` - Health check endpoint

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
