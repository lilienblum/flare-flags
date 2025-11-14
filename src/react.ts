import React from "react";
import type { FlareFlags } from "./client";
import type { FlagName } from "./types";

type ExtractFlagName<T> = T extends FlareFlags<infer TFlagName>
  ? TFlagName
  : never;

export const createIsFeatureEnabledHook =
  <TFlags extends FlareFlags<FlagName>>(instance: FlareFlags<FlagName>) =>
  (flagName: ExtractFlagName<TFlags>) => {
    return React.useSyncExternalStore(instance.subscribe, () =>
      instance.isEnabled(flagName)
    );
  };
