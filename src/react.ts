import React from "react";
import type { FlareFlags } from "./client.js";
import type { FlagName } from "./types.js";

export const createUseIsFeatureEnabled =
  <TFlagName extends FlagName>(instance: FlareFlags<TFlagName>) =>
  (flagName: TFlagName) => {
    const getSnapshot = () => instance.isEnabled(flagName);
    return React.useSyncExternalStore(
      instance.subscribe,
      getSnapshot,
      getSnapshot
    );
  };
