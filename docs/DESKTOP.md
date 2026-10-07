# EDHLOG desktop app (Tauri)

The desktop build is the same EDHLOG web app wrapped in a small native shell. Your data file linking, settings, and stats behave like in Chrome/Edge.

## One-time setup (Windows)

1. **Node.js 20+** — [https://nodejs.org/](https://nodejs.org/) (you likely already have this for web dev).

2. **Rust (latest stable)** — install from [https://rustup.rs/](https://rustup.rs/) (default `stable`). Open a **new** terminal and run `rustc --version` (1.85+ recommended; the repo includes `rust-toolchain.toml` so `rustup` picks stable automatically).

3. **Visual Studio C++ build tools** — required to compile the Tauri shell on Windows:
   - Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the **“Desktop development with C++”** workload, **or**
   - Full Visual Studio with that workload.

4. **WebView2** — included on Windows 10/11. If the app won’t start, install the [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

## Build the app

From the repo root:

```bash
npm ci
npm run desktop:build
```

First build downloads Rust crates and can take several minutes.

## Output

Installers and binaries are under:

`src-tauri/target/release/bundle/`

On Windows you’ll typically get:

- **`.msi`** or **`.exe` (NSIS)** installer — use this to install for yourself or friends.
- **`edhlog.exe`** (name may vary) in the `release` folder — portable run without installer.

## Dev mode (hot reload)

```bash
npm run desktop:dev
```

Opens a desktop window pointed at the Vite dev server.

## GitHub Pages vs desktop

- **GitHub Pages** — unchanged; still the browser version at `/EDHLOG/`.
- **Desktop** — uses `npm run build` with relative paths (`./`); no change needed when you ship web updates unless you change desktop-only config.

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `link.exe` / `LNK` errors on Windows | Install MSVC build tools (step 3). |
| `cargo` not found | Restart terminal after `rustup` install. |
| Blank window | Run `npm run build` once, then `npm run desktop:dev` again. |
| File picker issues | Use desktop build; it uses the same File System Access APIs as Chromium. |
