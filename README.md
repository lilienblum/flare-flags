# flare-flags

A lightweight feature flag library for TypeScript/JavaScript applications with support for user targeting, cohorts, and React integration.

## Features

- 🚩 **Feature Flags**: Enable or disable features based on configuration
- 👤 **User Targeting**: Target specific users by ID or properties
- 👥 **Cohorts**: Group users into cohorts for easier management
- ⚛️ **React Integration**: Built-in React hooks for seamless integration
- 🔄 **Reactive**: Subscribe to flag changes and update your UI automatically
- 📦 **Type-Safe**: Full TypeScript support with type inference

## Installation

```bash
bun install
```

## Basic Usage

### Client-Side

```typescript
import { FlareFlags } from "flare-flags";
// or
// import { FlareFlags } from "flare-flags/client";

// Initialize with default flag values
const flags = new FlareFlags({
  newFeature: false,
  betaFeature: false,
});

// Set configuration
flags.setConfig({
  cohorts: {
    beta: ["user123", "user456"],
    premium: [{ plan: "premium" }],
  },
  flags: {
    newFeature: [true], // Enabled for everyone
    betaFeature: [false, "user123", "__cohort__beta"], // Enabled for user123 or beta cohort
  },
});

// Identify a user
flags.indenify("user123", { plan: "premium", region: "us" });

// Check if a flag is enabled
if (flags.isEnabled("newFeature")) {
  // Show new feature
}

// Subscribe to flag changes
const unsubscribe = flags.subscribe(() => {
  // Re-render or update UI
});
```

### React Integration

```tsx
import React from "react";
import { FlareFlagsProvider, useFlareFlags } from "flare-flags/react";

const flags = new FlareFlags({
  newFeature: false,
});

flags.setConfig({
  cohorts: {},
  flags: {
    newFeature: [true],
  },
});

function App() {
  return (
    <FlareFlagsProvider value={flags}>
      <MyComponent />
    </FlareFlagsProvider>
  );
}

function MyComponent() {
  const isEnabled = useFlareFlags();

  if (isEnabled("newFeature")) {
    return <div>New feature is enabled!</div>;
  }

  return <div>New feature is disabled</div>;
}
```

### Cloudflare Workers Integration

```typescript
import { getConfig, setConfig } from "flare-flags/worker";

export default {
  async fetch(request: Request, env: { FLAGS: KVNamespace }) {
    // Get current configuration
    const config = await getConfig(env.FLAGS);

    // Update configuration
    await setConfig(env.FLAGS, {
      cohorts: {},
      flags: {
        newFeature: [true],
      },
    });

    return new Response("OK");
  },
};
```

## API Reference

### `FlareFlags<TFlagName extends string>`

The main class for managing feature flags.

#### Constructor

```typescript
new FlareFlags(flagsDefaults: Record<TFlagName, boolean>)
```

Creates a new FlareFlags instance with default flag values.

#### Methods

##### `setConfig(config: Config)`

Updates the flag configuration and re-evaluates all flags.

```typescript
flags.setConfig({
  cohorts: {
    beta: ["user123"],
  },
  flags: {
    featureA: [true],
    featureB: [false, "user123"],
  },
});
```

##### `indenify(id: UserId, properties?: Properties)`

Identifies the current user and re-evaluates flags.

```typescript
flags.indenify("user123", { plan: "premium", region: "us" });
```

##### `isEnabled(flag: TFlagName): boolean`

Checks if a flag is enabled for the current user.

```typescript
const enabled = flags.isEnabled("newFeature");
```

##### `subscribe(listener: () => void): () => void`

Subscribes to flag changes. Returns an unsubscribe function.

```typescript
const unsubscribe = flags.subscribe(() => {
  console.log("Flags changed!");
});
```

### Configuration Format

```typescript
interface Config {
  cohorts: Record<CohortName, Matchers>;
  flags: Record<FlagName, [boolean, ...Matchers]>;
}
```

#### Cohorts

Cohorts are named groups of users that can be referenced in flag configurations.

```typescript
cohorts: {
  beta: ["user123", "user456"], // User IDs
  premium: [{ plan: "premium" }], // Property matchers
  vip: ["user789", { tier: "vip" }], // Mixed matchers
}
```

#### Flags

Each flag configuration is a tuple where:

- First element (`boolean`): If `true`, the flag is enabled for everyone. If `false`, it's only enabled for users matching the matchers.
- Remaining elements (`Matchers`): Array of matchers (user IDs, property objects, or cohort references).

```typescript
flags: {
  // Enabled for everyone
  publicFeature: [true],

  // Disabled by default, enabled for specific users
  betaFeature: [false, "user123", "user456"],

  // Enabled for users matching properties
  premiumFeature: [false, { plan: "premium" }],

  // Enabled for users in a cohort
  cohortFeature: [false, "__cohort__beta"],

  // Mixed matchers
  complexFeature: [false, "user123", { plan: "premium" }, "__cohort__beta"],
}
```

#### Matchers

Matchers can be:

- **User ID** (`string`): Matches users with the exact ID
- **Property Object** (`Record<string, string | number | boolean>`): Matches users where all properties match exactly
- **Cohort Reference** (`string` starting with `__cohort__`): Matches users in the specified cohort

Matchers use OR logic - if any matcher matches, the flag is enabled.

## Examples

### Targeting by User ID

```typescript
const flags = new FlareFlags({ featureA: false });

flags.indenify("user123");

flags.setConfig({
  cohorts: {},
  flags: {
    featureA: [false, "user123", "user456"],
  },
});

flags.isEnabled("featureA"); // true (user123 matches)
```

### Targeting by Properties

```typescript
const flags = new FlareFlags({ featureA: false });

flags.indenify("user123", { plan: "premium", region: "us" });

flags.setConfig({
  cohorts: {},
  flags: {
    featureA: [false, { plan: "premium" }],
  },
});

flags.isEnabled("featureA"); // true (plan matches)
```

### Using Cohorts

```typescript
const flags = new FlareFlags({ featureA: false });

flags.indenify("user123", { plan: "premium" });

flags.setConfig({
  cohorts: {
    beta: ["user123"],
    premium: [{ plan: "premium" }],
  },
  flags: {
    featureA: [false, "__cohort__beta", "__cohort__premium"],
  },
});

flags.isEnabled("featureA"); // true (user123 is in both cohorts)
```

### React Hook Example

```tsx
import { useFlareFlags } from "flare-flags/react";

function FeatureComponent() {
  const isEnabled = useFlareFlags();

  return (
    <div>
      {isEnabled("newFeature") && <NewFeature />}
      {isEnabled("betaFeature") && <BetaFeature />}
    </div>
  );
}
```

## Testing

Run tests with:

```bash
bun test
```

The test suite includes comprehensive coverage of:

- Flag initialization and defaults
- Configuration updates
- User identification
- Matcher logic (user IDs, properties, cohorts)
- Listener subscriptions
- Edge cases

## TypeScript Support

The library is fully typed and provides type inference:

```typescript
const flags = new FlareFlags({
  featureA: false,
  featureB: true,
});

// TypeScript knows the exact flag names
flags.isEnabled("featureA"); // ✅
flags.isEnabled("unknown"); // ❌ Type error
```

## License

MIT
