import React from "react";
import type { FlareFlags } from "./client.js";
import type { FlagName } from "./types.js";

type ExtractFlagName<T> = T extends FlareFlags<infer TFlagName>
  ? TFlagName
  : never;

export const createUseIsFeatureEnabled =
  <TFlags extends FlareFlags<FlagName>>(instance: FlareFlags<FlagName>) =>
  (flagName: ExtractFlagName<TFlags>) => {
    const getSnapshot = () => instance.isEnabled(flagName);
    return React.useSyncExternalStore(
      instance.subscribe,
      getSnapshot,
      getSnapshot
    );
  };
