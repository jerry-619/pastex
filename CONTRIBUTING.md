# Contributing to Pastex

First off, thank you for considering contributing to Pastex! It's people like you that make Pastex a great tool for the community.

## Development Setup

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/jerry-619/pastex.git
   cd pastex
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Run the development server**:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` in your browser.

## Architecture Overview

Pastex is a hybrid application built on **Next.js 15**:
- **Socket.io** (`server.js`): Handles the real-time signaling required for WebRTC and text synchronization.
- **WebRTC** (`app/room/[id]/page.tsx`): Establishes direct Peer-to-Peer connections for file sharing so files never touch our servers.
- **Tailwind CSS v4** (`app/globals.css`): Manages the Neo-Brutalism design system.

## Pull Request Process

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Commit your changes. Ensure your code follows the existing Neo-Brutalism design system and includes JSDoc comments for complex logic.
3. Push to your fork and submit a Pull Request.
4. Fill out the PR template completely. Ensure that CI workflows pass (linting/builds).
5. A maintainer will review your PR.

## Code Style

- Use **TypeScript** for all new components.
- Avoid any new CSS files; rely purely on **Tailwind utilities** unless adding a custom `@theme` variable in `globals.css`.
- Ensure buttons and interactive elements use the `.btn-press` utility class for physical click simulation.

## Reporting Bugs

Please use the Bug Report template provided in the `.github/ISSUE_TEMPLATE` directory to submit any issues you find. Provide as much detail as possible, including OS and browser versions.
