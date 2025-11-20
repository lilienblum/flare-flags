import { DEFAULT_CONFIG } from "./constants.js";
import type { Config } from "./types.js";
export type { Config as FlareFlagsConfig };

interface KVNamespace {
  get<T>(
    key: string,
    options: {
      type: "json";
      cacheTtl: number;
    }
  ): Promise<T | null>;
  put(key: string, value: string): Promise<void>;
}

const KEY = "config";

export async function getConfig(kv: KVNamespace) {
  const value = await kv.get<Config>(KEY, {
    type: "json",
    cacheTtl: 120,
  });
  return value ?? DEFAULT_CONFIG;
}

export async function setConfig(kv: KVNamespace, config: Config) {
  await kv.put(KEY, JSON.stringify(config));
}
