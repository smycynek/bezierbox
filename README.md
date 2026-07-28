## Bezler Box

Copyright 2026 Steven Mycynek

version: 000283

# A simple bezier app

In my spare time, I've tried to learn more about splines. So far, I have a simple bezier implementation.  It's a single high-order polynomial curve -- I might build a composite curve of many quadratic or cubic beziers in the future.  

Curve definitions are saved to local storage, so you can come back to the site later and continue editing a curve.  You can also share the curve definition over text, etc.. via a URL query string.

## Installation

```bash
// Set up and debug

bun install
bun run dev


// Code styling

bun run lint
bun run format

// Deployment

bun run build
deploy.sh
```

## Other notes

# Live demo

https://stevenvictor.net/bezierbox
