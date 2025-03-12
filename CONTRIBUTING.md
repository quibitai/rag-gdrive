# Contributing to RAG Chatbot with Vercel AI SDK

Thank you for considering contributing to this project! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:

1. A clear, descriptive title
2. Steps to reproduce the bug
3. Expected behavior
4. Actual behavior
5. Screenshots (if applicable)
6. Environment information (browser, OS, etc.)

### Suggesting Features

Feature suggestions are welcome! Please create an issue with:

1. A clear, descriptive title
2. A detailed description of the proposed feature
3. Any relevant mockups or examples
4. Why this feature would be beneficial

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/rag-chatbot-with-vercel-ai-sdk.git
   cd rag-chatbot-with-vercel-ai-sdk
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Code Style

- Follow the existing code style
- Use meaningful variable and function names
- Write comments for complex logic
- Use TypeScript types appropriately

## Testing

Before submitting a pull request, please:

1. Test your changes locally
2. Ensure there are no linting errors (`npm run lint`)
3. Make sure the application builds successfully (`npm run build`)

## Documentation

If your changes include new features or modify existing ones, please update the documentation accordingly:

- Update the README.md if necessary
- Add or update JSDoc comments for functions and components
- Update any relevant documentation in the codebase

## Maintenance Scripts

If you're adding or modifying maintenance scripts:

1. Place them in the `scripts/` directory
2. Make them executable (`chmod +x scripts/your-script.js`)
3. Add a shebang line at the top (`#!/usr/bin/env node`)
4. Update the scripts/README.md with usage instructions
5. Add an npm script in package.json if appropriate

## License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT License. 