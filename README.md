<div align="center">
  <h1 align="center">PASTEX_</h1>
  <p align="center">
    <strong>Share clipboard text and transfer files peer-to-peer instantly. No logins. High privacy.</strong>
  </p>
  <p align="center">
    <a href="https://github.com/jerry-619/pastex/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/jerry-619/pastex?style=flat-square&color=FF70A6" alt="MIT License" />
    </a>
    <img src="https://img.shields.io/github/stars/jerry-619/pastex?style=flat-square&color=FBFF48" alt="GitHub Stars" />
    <img src="https://img.shields.io/github/forks/jerry-619/pastex?style=flat-square&color=33FF57" alt="GitHub Forks" />
  </p>
</div>

<hr />

## ⚡ What is Pastex?

**Pastex** is a real-time, browser-based sharing application built with a stunning **Neo-Brutalist** aesthetic. It allows you to instantly share text and files across devices without needing to log in, download software, or rely on third-party cloud storage servers for your files.

Files are transferred directly between devices using **WebRTC Peer-to-Peer (P2P)** technology, ensuring maximum speed and complete privacy.

## ✨ Features

- **Peer-to-Peer File Transfer:** Send files directly to other peers. Your files never touch a centralized server.
- **Real-Time Text Sync:** A shared clipboard that synchronizes instantly across all connected devices using WebSockets.
- **Host Permissions & Read-Only UI:** Room creators can toggle text-editing and file-sending permissions for guests.
- **In-Browser Media Previews:** Preview images, videos, audio, and PDF files instantly without downloading.
- **Firewall Traversal (TURN Support):** Works reliably even on strict college or corporate networks.
- **No Logins Required:** Generate a random 6-character room code and instantly invite peers.
- **Neo-Brutalism UI:** High-contrast, bold typography, hard shadows, and physical "clicky" buttons.
- **Cross-Platform:** Works in any modern web browser (Mobile, Desktop, Tablet).

## 🏗️ Architecture

Pastex uses a hybrid architecture for maximum performance and privacy:

1. **Next.js 15 (App Router)**: Powers the React frontend and fast UI rendering.
2. **Socket.io (Custom Node Server)**: Acts as the **Signaling Server**. It synchronizes the text buffer and exchanges WebRTC SDP offers/answers between peers.
3. **WebRTC RTCDataChannel**: Once peers are connected via Socket.io, a direct P2P data channel is opened. File chunks are streamed securely and directly between browsers.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.17.0
- npm or yarn

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jerry-619/pastex.git
   cd pastex
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables (Optional but recommended):**
   Copy `.env.example` to `.env.local` and add your TURN server credentials (e.g., from Metered.ca or Twilio) for reliable file transfers behind strict firewalls.
   ```bash
   cp .env.example .env.local
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   *Note: Pastex uses a custom `server.js` to run Next.js and Socket.io on the same port.*

5. **Open in Browser:**
   Navigate to `http://localhost:3000`.

## 🤝 Contributing

We welcome contributions! Whether it's a bug fix, new feature, or design tweak, please check out our [Contributing Guide](CONTRIBUTING.md) to get started.

Please ensure your pull requests pass all linting and build checks before submitting.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

Developed and maintained by **Fardeen Beigh** ([@jerry-619](https://github.com/jerry-619)).
