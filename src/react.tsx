import React from "react";
import type { FlareFlags } from "./client";
import type { FlagName } from "./types";

type ExtractFlagName<T> = T extends FlareFlags<infer TFlagName>
  ? TFlagName
  : never;

const context = React.createContext<FlareFlags<any> | null>(null);

export function useFlareFlags<TFlagName extends FlagName>() {
  return (flagName: TFlagName) => {
    const flags = React.useContext(context);
    if (!flags) {
      throw new Error("FlareFlags context not found");
    }
    return React.useSyncExternalStore(flags.subscribe, () =>
      flags.isEnabled(flagName)
    );
  };
}

export function createFlareFlagsIsEnabledHook<
  TFlags extends FlareFlags<FlagName>
>() {
  return (flagName: ExtractFlagName<TFlags>) => {
    const flags = React.useContext(context);
    if (!flags) {
      throw new Error("FlareFlags context not found");
    }
    return flags.isEnabled(flagName);
  };
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
