import type { KVNamespace } from "@cloudflare/workers-types";
import { DEFAULT_CONFIG } from "./constants";
import type { Config } from "./types";

const KEY = "config";

export async function getConfig(kv: KVNamespace) {
  const value = await kv.get(KEY);
  return value ? (JSON.parse(value) as Config) : DEFAULT_CONFIG;
}

export async function setConfig(kv: KVNamespace, config: Config) {
  await kv.put(KEY, JSON.stringify(config));
}
