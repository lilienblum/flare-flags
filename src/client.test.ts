import { describe, test, expect } from "bun:test";
import { FlareFlags } from "./client";
import type { Config } from "./types";
import { COHORT_PROPERTY_PREFIX } from "./constants";

describe("FlareFlags", () => {
  describe("constructor", () => {
    test("should initialize with default flag values", () => {
      const flags = new FlareFlags({
        featureA: false,
        featureB: true,
      });

      expect(flags.isEnabled("featureA")).toBe(false);
      expect(flags.isEnabled("featureB")).toBe(true);
    });

    test("should handle empty flags object", () => {
      const flags = new FlareFlags({} as Record<string, boolean>);
      expect(flags.isEnabled("nonexistent")).toBe(false);
    });
  });

  describe("isEnabled", () => {
    test("should return default value when no config is set", () => {
      const flags = new FlareFlags({
        featureA: true,
        featureB: false,
      });

      expect(flags.isEnabled("featureA")).toBe(true);
      expect(flags.isEnabled("featureB")).toBe(false);
    });

    test("should return false for unknown flags", () => {
      const flags = new FlareFlags({
        featureA: true,
      });

      expect(flags.isEnabled("unknown" as any)).toBe(false);
    });
  });

  describe("setConfig", () => {
    test("should update flags based on config with enabled flag", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should update flags based on config with disabled flag and user ID matcher", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123");

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should update flags based on config with disabled flag and property matcher", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123", { plan: "premium", region: "us" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "premium" }],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should revert to default when flag config is removed", () => {
      const flags = new FlareFlags({
        featureA: true,
      });

      const config1: Config = {
        cohorts: {},
        flags: {
          featureA: [false],
        },
      };

      flags.setConfig(config1);
      expect(flags.isEnabled("featureA")).toBe(false);

      const config2: Config = {
        cohorts: {},
        flags: {},
      };

      flags.setConfig(config2);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should handle multiple flags independently", () => {
      const flags = new FlareFlags({
        featureA: false,
        featureB: false,
        featureC: true,
      });

      flags.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
          featureB: [false, "user123"],
          featureC: [false, { plan: "premium" }],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
      expect(flags.isEnabled("featureB")).toBe(true);
      expect(flags.isEnabled("featureC")).toBe(true);
    });
  });

  describe("identify", () => {
    test("should set user ID and re-evaluate flags", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(false);

      flags.identify("user123");
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should set user properties and re-evaluate flags", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "premium" }],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(false);

      flags.identify("user123", { plan: "premium" });
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should handle user with multiple properties", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123", {
        plan: "premium",
        region: "us",
        beta: true,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "premium", region: "us" }],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should not match when properties don't match exactly", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123", { plan: "basic" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "premium" }],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(false);
    });

    test("should match when all properties match", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123", { plan: "premium", region: "us" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "premium", region: "us" }],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should not match when property matcher has extra properties", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "premium", region: "us" }],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(false);
    });
  });

  describe("cohorts", () => {
    test("should match user to cohort by user ID", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123");

      const config: Config = {
        cohorts: {
          beta: ["user123"],
        },
        flags: {
          featureA: [false, `${COHORT_PROPERTY_PREFIX}beta`],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should match user to cohort by properties", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {
          premium: [{ plan: "premium" }],
        },
        flags: {
          featureA: [false, `${COHORT_PROPERTY_PREFIX}premium`],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should match user to multiple cohorts", () => {
      const flags = new FlareFlags({
        featureA: false,
        featureB: false,
      });

      flags.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {
          beta: ["user123"],
          premium: [{ plan: "premium" }],
        },
        flags: {
          featureA: [false, `${COHORT_PROPERTY_PREFIX}beta`],
          featureB: [false, `${COHORT_PROPERTY_PREFIX}premium`],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
      expect(flags.isEnabled("featureB")).toBe(true);
    });

    test("should not match when user is not in cohort", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user456");

      const config: Config = {
        cohorts: {
          beta: ["user123"],
        },
        flags: {
          featureA: [false, `${COHORT_PROPERTY_PREFIX}beta`],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(false);
    });
  });

  describe("matchers", () => {
    test("should match when any matcher matches (OR logic)", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123");

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user456", "user123"],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should match when any property matcher matches", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "basic" }, { plan: "premium" }],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should not match when no matchers match", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123", { plan: "basic" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user456", { plan: "premium" }],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(false);
    });
  });

  describe("subscribe", () => {
    test("should call listener when flags change", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      let callCount = 0;
      flags.subscribe(() => {
        callCount++;
      });

      expect(callCount).toBe(0);

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      flags.setConfig(config);
      expect(callCount).toBe(1);
    });

    test("should call multiple listeners when flags change", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      let callCount1 = 0;
      let callCount2 = 0;

      flags.subscribe(() => {
        callCount1++;
      });
      flags.subscribe(() => {
        callCount2++;
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      flags.setConfig(config);
      expect(callCount1).toBe(1);
      expect(callCount2).toBe(1);
    });

    test("should return unsubscribe function", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      let callCount = 0;
      const unsubscribe = flags.subscribe(() => {
        callCount++;
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      flags.setConfig(config);
      expect(callCount).toBe(1);

      unsubscribe();

      flags.setConfig({
        cohorts: {},
        flags: {
          featureA: [false],
        },
      });

      expect(callCount).toBe(1); // Should not increment after unsubscribe
    });

    test("should notify listeners when user is identified", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
        },
      };

      flags.setConfig(config);

      let callCount = 0;
      flags.subscribe(() => {
        callCount++;
      });

      flags.identify("user123");
      expect(callCount).toBe(1);
    });

    test("should not notify listeners when flags don't change", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      let callCount = 0;
      flags.subscribe(() => {
        callCount++;
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false],
        },
      };

      flags.setConfig(config);
      expect(callCount).toBe(0); // No change from default false
    });
  });

  describe("edge cases", () => {
    test("should handle config with no flags", () => {
      const flags = new FlareFlags({
        featureA: true,
      });

      const config: Config = {
        cohorts: {},
        flags: {},
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true); // Should use default
    });

    test("should handle user without properties", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123");

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should handle empty matchers array", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123");

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(false);
    });

    test("should handle numeric and boolean properties", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      flags.identify("user123", {
        age: 25,
        active: true,
        score: 100,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { age: 25, active: true }],
        },
      };

      flags.setConfig(config);
      expect(flags.isEnabled("featureA")).toBe(true);
    });

    test("should handle flag that doesn't exist in defaults", () => {
      const flags = new FlareFlags({
        featureA: false,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureB: [true],
        },
      };

      flags.setConfig(config);
      // featureB config is ignored since it's not in defaults
      expect(flags.isEnabled("featureA")).toBe(false);
    });
  });
});
