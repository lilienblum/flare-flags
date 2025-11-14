# flare-flags

A lightweight feature flag library for TypeScript with user targeting, cohorts, and React integration. Designed for Cloudflare Workers.

## Installation

```bash
bun add flare-flags
```

## Quick Start

### Basic Usage

```typescript
import { FlareFlags } from "flare-flags";

const ff = new FlareFlags({
  newFeature: false,
  betaFeature: false,
});

// Set configuration
ff.setConfig({
  cohorts: {
    beta: ["user123"],
    premium: [{ plan: "premium" }],
  },
  flags: {
    newFeature: [true], // Enabled for everyone
    betaFeature: [false, "user123", "__cohort__premium"], // Enabled for specific users/cohorts
  },
});

// Identify user
ff.identify("user123", { plan: "premium" });

// Check flag
if (ff.isEnabled("betaFeature")) {
  // Show feature
}
```

### React

```tsx
import { createIsFeatureEnabledHook } from "flare-flags/react";
import { FlareFlags } from "flare-flags";

const ff = new FlareFlags({ newFeature: false });
ff.setConfig(config);
const useIsEnabled = createIsFeatureEnabledHook(ff);

function MyComponent() {
  const isEnabled = useIsEnabled("newFeature");
  return isEnabled ? <NewFeature /> : null;
}
```

### Cloudflare Workers

```typescript
import { getConfig, setConfig } from "flare-flags/worker";

const config = await getConfig(env.FLAGS);
await setConfig(env.FLAGS, newConfig);
```

## Configuration

Each flag is a tuple: `[enabled: boolean, ...matchers]`

- `[true]` - Enabled for everyone
- `[false, "user123"]` - Enabled for user ID
- `[false, { plan: "premium" }]` - Enabled for users matching properties
- `[false, "__cohort__beta"]` - Enabled for cohort members
- `[false, "user123", { plan: "premium" }, "__cohort__beta"]` - OR logic (any matcher)

```typescript
{
  cohorts: {
    beta: ["user123", "user456"],
    premium: [{ plan: "premium" }],
  },
  flags: {
    publicFeature: [true],
    betaFeature: [false, "user123", "__cohort__beta"],
    premiumFeature: [false, { plan: "premium" }],
  },
}
```

## API

### `FlareFlags`

```typescript
const ff = new FlareFlags(defaults: Record<string, boolean>);
ff.setConfig(config: Config);
ff.identify(id: string, properties?: Record<string, string | number | boolean>);
ff.isEnabled(flag: string): boolean;
ff.subscribe(listener: () => void): () => void;
ff.reset();
```

### `createIsFeatureEnabledHook`

```typescript
const useIsEnabled = createIsFeatureEnabledHook(ff);
const isEnabled = useIsEnabled("flagName"); // Inside React component
```

## License

MIT
