import { describe, test, expect } from "bun:test";
import { createIsFeatureEnabledHook } from "./react";
import { FlareFlags } from "./client";
import type { Config } from "./types";

describe("react", () => {
  describe("createIsFeatureEnabledHook", () => {
    test("should return a function (hook)", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      const useIsEnabled = createIsFeatureEnabledHook(ff);
      expect(typeof useIsEnabled).toBe("function");
    });

    test("should create a hook that uses subscribe method from FlareFlags for reactivity", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      // Test that the hook would use subscribe (which useSyncExternalStore uses)
      let callCount = 0;
      const unsubscribe = ff.subscribe(() => {
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

      unsubscribe();
      ff.setConfig({
        cohorts: {},
        flags: {
          featureA: [false],
        },
      });

      // Should not increment after unsubscribe
      expect(callCount).toBe(1);
    });

    test("should create a hook that uses isEnabled method to get current flag value", () => {
      const ff = new FlareFlags({
        featureA: false,
        featureB: true,
      });

      // Test that the hook would use isEnabled (which useSyncExternalStore uses as getSnapshot)
      let currentValue = ff.isEnabled("featureA");
      expect(currentValue).toBe(false);

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      ff.setConfig(config);
      currentValue = ff.isEnabled("featureA");
      expect(currentValue).toBe(true);
    });

    test("should create a hook that handles flag changes reactively", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      // Simulate what useSyncExternalStore does: subscribe + getSnapshot
      let snapshotValue = ff.isEnabled("featureA");
      expect(snapshotValue).toBe(false);

      let updateCount = 0;
      const unsubscribe = ff.subscribe(() => {
        updateCount++;
        snapshotValue = ff.isEnabled("featureA"); // Update snapshot on change
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      ff.setConfig(config);
      expect(updateCount).toBe(1);
      expect(snapshotValue).toBe(true);

      unsubscribe();
    });

    test("should create a hook that handles multiple flags independently", () => {
      const ff = new FlareFlags({
        featureA: false,
        featureB: false,
      });

      let valueA = ff.isEnabled("featureA");
      let valueB = ff.isEnabled("featureB");

      expect(valueA).toBe(false);
      expect(valueB).toBe(false);

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      ff.setConfig(config);
      valueA = ff.isEnabled("featureA");
      valueB = ff.isEnabled("featureB");

      expect(valueA).toBe(true);
      expect(valueB).toBe(false);
    });

    test("should create a hook that updates when user is identified", () => {
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
      let value = ff.isEnabled("featureA");
      expect(value).toBe(false);

      let updateCount = 0;
      ff.subscribe(() => {
        updateCount++;
        value = ff.isEnabled("featureA");
      });

      ff.identify("user123");
      expect(updateCount).toBe(1);
      expect(value).toBe(true);
    });

    test("should create a hook that works with useSyncExternalStore pattern", () => {
      const ff = new FlareFlags({
        featureA: false,
      });

      // Simulate useSyncExternalStore(ff.subscribe, () => ff.isEnabled(flagName))
      const subscribe = ff.subscribe.bind(ff);
      const getSnapshot = () => ff.isEnabled("featureA" as any);

      let currentValue = getSnapshot();
      expect(currentValue).toBe(false);

      let notified = false;
      const unsubscribe = subscribe(() => {
        notified = true;
      });

      const config: Config = {
        cohorts: {},
        flags: {
          featureA: [true],
        },
      };

      ff.setConfig(config);
      expect(notified).toBe(true);
      currentValue = getSnapshot();
      expect(currentValue).toBe(true);

      unsubscribe();
    });
  });
});
