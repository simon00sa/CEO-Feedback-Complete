[build]
  command = "npm install -g pnpm@10.11.0 && export PATH=\"$(npm bin -g):$PATH\" && pnpm --version && pnpm install && pnpm build"
  publish = ".next"
