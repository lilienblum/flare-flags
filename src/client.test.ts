import { describe, test, expect } from "bun:test";
import { FlareFlags } from "./client";
import type { Config } from "./types";
import { COHORT_PROPERTY_PREFIX } from "./constants";

describe("FlareFlags", () => {
  describe("constructor", () => {
    test("should initialize with default flag values", () => {
      const ff = new FlareFlags({
        featureA: false,
        featureB: true,
      });

      expect(ff.isEnabled("featureA")).toBe(false);
      expect(ff.isEnabled("featureB")).toBe(true);
    });

    test("should handle empty flags object", () => {
      const ff = new FlareFlags({} as Record<string, boolean>);
      expect(ff.isEnabled("nonexistent")).toBe(false);
    });
  });

  describe("isEnabled", () => {
    test("should return default value when no config is set", () => {
      const ff = new FlareFlags({
        featureA: true,
        featureB: false,
      });

      expect(ff.isEnabled("featureA")).toBe(true);
      expect(ff.isEnabled("featureB")).toBe(false);
    });

    test("should return false for unknown flags", () => {
      const ff = new FlareFlags({
        featureA: true,
      });

      expect(ff.isEnabled("unknown" as any)).toBe(false);
    });
  });

  describe("setConfig", () => {
    test("should update flags based on config with enabled flag", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should update flags based on config with disabled flag and user ID matcher", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123");

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should update flags based on config with disabled flag and property matcher", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123", { plan: "premium", region: "us" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "premium" }],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should revert to default when flag config is removed", () => {
      const ff = new FlareFlags({
        featureA: true,
      });

      const config1: Config = {
        cohorts: {},
        flags: {
          featureA: [false],
        },
      };

      ff.setConfig(config1);
      expect(ff.isEnabled("featureA")).toBe(false);

      const config2: Config = {
        cohorts: {},
        flags: {},
      };

      ff.setConfig(config2);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should handle multiple flags independently", () => {
      const ff = new FlareFlags({
        featureA: false,
        featureB: false,
        featureC: true,
      });

      ff.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
          featureB: [false, "user123"],
          featureC: [false, { plan: "premium" }],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
      expect(ff.isEnabled("featureB")).toBe(true);
      expect(ff.isEnabled("featureC")).toBe(true);
    });
  });

  describe("identify", () => {
    test("should set user ID and re-evaluate flags", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(false);

      ff.identify("user123");
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should set user properties and re-evaluate flags", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "premium" }],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(false);

      ff.identify("user123", { plan: "premium" });
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should handle user with multiple properties", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123", {
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

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should not match when properties don't match exactly", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123", { plan: "basic" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "premium" }],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(false);
    });

    test("should match when all properties match", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123", { plan: "premium", region: "us" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "premium", region: "us" }],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should not match when property matcher has extra properties", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "premium", region: "us" }],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(false);
    });
  });

  describe("cohorts", () => {
    test("should match user to cohort by user ID", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123");

      const config: Config = {
        cohorts: {
          beta: ["user123"],
        },
        flags: {
          featureA: [false, `${COHORT_PROPERTY_PREFIX}beta`],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should match user to cohort by properties", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {
          premium: [{ plan: "premium" }],
        },
        flags: {
          featureA: [false, `${COHORT_PROPERTY_PREFIX}premium`],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should match user to multiple cohorts", () => {
      const ff = new FlareFlags({
        featureA: false,
        featureB: false,
      });

      ff.identify("user123", { plan: "premium" });

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

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
      expect(ff.isEnabled("featureB")).toBe(true);
    });

    test("should not match when user is not in cohort", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user456");

      const config: Config = {
        cohorts: {
          beta: ["user123"],
        },
        flags: {
          featureA: [false, `${COHORT_PROPERTY_PREFIX}beta`],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(false);
    });
  });

  describe("matchers", () => {
    test("should match when any matcher matches (OR logic)", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123");

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user456", "user123"],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should match when any property matcher matches", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, { plan: "basic" }, { plan: "premium" }],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should not match when no matchers match", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123", { plan: "basic" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user456", { plan: "premium" }],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(false);
    });
  });

  describe("subscribe", () => {
    test("should call listener when flags change", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      let callCount = 0;
      ff.subscribe(() => {
        callCount++;
      });

      expect(callCount).toBe(0);

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      ff.setConfig(config);
      expect(callCount).toBe(1);
    });

    test("should call multiple listeners when flags change", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      let callCount1 = 0;
      let callCount2 = 0;

      ff.subscribe(() => {
        callCount1++;
      });
      ff.subscribe(() => {
        callCount2++;
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      ff.setConfig(config);
      expect(callCount1).toBe(1);
      expect(callCount2).toBe(1);
    });

    test("should return unsubscribe function", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      let callCount = 0;
      const unsubscribe = ff.subscribe(() => {
        callCount++;
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      ff.setConfig(config);
      expect(callCount).toBe(1);

      unsubscribe();

      ff.setConfig({
        cohorts: {},
        flags: {
          featureA: [false],
        },
      });

      expect(callCount).toBe(1); // Should not increment after unsubscribe
    });

    test("should notify listeners when user is identified", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
        },
      };

      ff.setConfig(config);

      let callCount = 0;
      ff.subscribe(() => {
        callCount++;
      });

      ff.identify("user123");
      expect(callCount).toBe(1);
    });

    test("should not notify listeners when flags don't change", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      let callCount = 0;
      ff.subscribe(() => {
        callCount++;
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false],
        },
      };

      ff.setConfig(config);
      expect(callCount).toBe(0); // No change from default false
    });
  });

  describe("edge cases", () => {
    test("should handle config with no flags", () => {
      const ff = new FlareFlags({
        featureA: true,
      });

      const config: Config = {
        cohorts: {},
        flags: {},
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true); // Should use default
    });

    test("should handle user without properties", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123");

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should handle empty matchers array", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123");

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(false);
    });

    test("should handle numeric and boolean properties", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123", {
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

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
    });

    test("should handle flag that doesn't exist in defaults", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureB: [true],
        },
      };

      ff.setConfig(config);
      // featureB config is ignored since it's not in defaults
      expect(ff.isEnabled("featureA")).toBe(false);
    });
  });

  describe("reset", () => {
    test("should reset user and revert flags to defaults", () => {
      const ff = new FlareFlags({
        featureA: false,
        featureB: true,
      });

      ff.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
          featureB: [true, { plan: "premium" }],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
      expect(ff.isEnabled("featureB")).toBe(true);

      ff.reset();
      expect(ff.isEnabled("featureA")).toBe(false);
      expect(ff.isEnabled("featureB")).toBe(true);
    });

    test("should notify listeners when reset changes flag values", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123");

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);

      let callCount = 0;
      ff.subscribe(() => {
        callCount++;
      });

      ff.reset();
      expect(callCount).toBe(1);
      expect(ff.isEnabled("featureA")).toBe(false);
    });

    test("should not notify listeners when reset doesn't change flag values", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(false);

      let callCount = 0;
      ff.subscribe(() => {
        callCount++;
      });

      ff.reset();
      expect(callCount).toBe(0); // No change from default false
      expect(ff.isEnabled("featureA")).toBe(false);
    });

    test("should reset user identification", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      ff.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);

      ff.reset();

      // After reset, user-specific flag should revert to default
      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(false);
    });

    test("should reset multiple flags independently", () => {
      const ff = new FlareFlags({
        featureA: false,
        featureB: false,
        featureC: true,
      });

      ff.identify("user123", { plan: "premium" });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [false, "user123"],
          featureB: [false, { plan: "premium" }],
          featureC: [true, "user123"],
        },
      };

      ff.setConfig(config);
      expect(ff.isEnabled("featureA")).toBe(true);
      expect(ff.isEnabled("featureB")).toBe(true);
      expect(ff.isEnabled("featureC")).toBe(true);

      ff.reset();
      expect(ff.isEnabled("featureA")).toBe(false);
      expect(ff.isEnabled("featureB")).toBe(false);
      expect(ff.isEnabled("featureC")).toBe(true);
    });
  });
});
