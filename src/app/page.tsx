// The root route is rewritten to /_landing/index.html in next.config.ts.
// This page exists as a fallback so the build always has a / entry.
export default function RootFallback() {
  return null;
}
