import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { getConfig, setConfig } from "./worker";
import type { Config } from "./types";
import { DEFAULT_CONFIG } from "./constants";

// Mock KVNamespace
class MockKVNamespace {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  clear() {
    this.store.clear();
  }
}

describe("worker", () => {
  let kv: MockKVNamespace;

  beforeEach(() => {
    kv = new MockKVNamespace();
  });

  afterEach(() => {
    kv.clear();
  });

  describe("getConfig", () => {
    test("should return DEFAULT_CONFIG when no config exists", async () => {
      const config = await getConfig(kv as any);
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    test("should return parsed config when config exists", async () => {
      const testConfig: Config = {
        cohorts: {
          beta: ["user123"],
        },
        flags: {
          featureA: [true],
        },
      };

      await kv.put("config", JSON.stringify(testConfig));
      const config = await getConfig(kv as any);
      expect(config).toEqual(testConfig);
    });

    test("should handle empty config", async () => {
      const emptyConfig: Config = {
        cohorts: {},
        flags: {},
      };

      await kv.put("config", JSON.stringify(emptyConfig));
      const config = await getConfig(kv as any);
      expect(config).toEqual(emptyConfig);
    });

    test("should handle config with cohorts only", async () => {
      const configWithCohorts: Config = {
        cohorts: {
          beta: ["user123"],
          premium: [{ plan: "premium" }],
        },
        flags: {},
      };

      await kv.put("config", JSON.stringify(configWithCohorts));
      const config = await getConfig(kv as any);
      expect(config).toEqual(configWithCohorts);
    });

    test("should handle config with flags only", async () => {
      const configWithFlags: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
          featureB: [false, "user123"],
        },
      };

      await kv.put("config", JSON.stringify(configWithFlags));
      const config = await getConfig(kv as any);
      expect(config).toEqual(configWithFlags);
    });
  });

  describe("setConfig", () => {
    test("should store config in KV", async () => {
      const testConfig: Config = {
        cohorts: {
          beta: ["user123"],
        },
        flags: {
          featureA: [true],
        },
      };

      await setConfig(kv as any, testConfig);
      const stored = await kv.get("config");
      expect(stored).toBe(JSON.stringify(testConfig));
    });

    test("should overwrite existing config", async () => {
      const config1: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      const config2: Config = {
        cohorts: {
          beta: ["user123"],
        },
        flags: {
          featureB: [false],
        },
      };

      await setConfig(kv as any, config1);
      await setConfig(kv as any, config2);

      const stored = await kv.get("config");
      expect(stored).toBe(JSON.stringify(config2));
    });

    test("should handle empty config", async () => {
      const emptyConfig: Config = {
        cohorts: {},
        flags: {},
      };

      await setConfig(kv as any, emptyConfig);
      const stored = await kv.get("config");
      expect(stored).toBe(JSON.stringify(emptyConfig));
    });

    test("should handle complex config with multiple cohorts and flags", async () => {
      const complexConfig: Config = {
        cohorts: {
          beta: ["user123", "user456"],
          premium: [{ plan: "premium" }],
          us: [{ region: "us" }],
        },
        flags: {
          featureA: [true],
          featureB: [false, "user123", { plan: "premium" }],
          featureC: [false, "__cohort__beta"],
        },
      };

      await setConfig(kv as any, complexConfig);
      const stored = await kv.get("config");
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(complexConfig);
    });
  });
});
