import React from "react";
import type { FlareFlags } from "./client";
import type { FlagName } from "./types";

type ExtractFlagName<T> = T extends FlareFlags<infer TFlagName>
  ? TFlagName
  : never;

const context = React.createContext<FlareFlags<any> | null>(null);

export function useIsFeatureEnabled<TFlags extends FlareFlags<FlagName>>(
  flagName: ExtractFlagName<TFlags>
) {
  const ff = React.useContext(context);
  if (!ff) {
    throw new Error(
      "useIsFeatureEnabled must be used within a FlareFlagsProvider"
    );
  }
  return React.useSyncExternalStore(ff.subscribe, () => ff.isEnabled(flagName));
}

export function FlareFlagsProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: FlareFlags<string>;
}) {
  return <context.Provider value={value}>{children}</context.Provider>;
}
