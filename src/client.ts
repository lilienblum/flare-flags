import { COHORT_PROPERTY_PREFIX, DEFAULT_CONFIG } from "./constants";
import type { CohortName, Config, Matchers, UserId, Properties } from "./types";

interface User extends Properties {
  id: UserId;
}

type Listener = () => void;

const matchUser = (
  user: User,
  matchers: Matchers,
  cohorts = new Set<CohortName>()
) =>
  matchers.some((m) => {
    if (typeof m === "string") {
      if (m.startsWith(COHORT_PROPERTY_PREFIX)) {
        return cohorts.has(
          m.slice(COHORT_PROPERTY_PREFIX.length) as CohortName
        );
      }
      return m === user.id;
    }
    if (
      typeof m === "object" &&
      Object.entries(m).every(([key, value]) => user[key] === value)
    ) {
      return true;
    }
  });

export class FlareFlags<TFlagName extends string> {
  #config: Config = DEFAULT_CONFIG;
  #user: User | undefined;
  #flags: Record<TFlagName, boolean>;
  #listeners = new Set<Listener>();

  constructor(private readonly flagsDefaults: Record<TFlagName, boolean>) {
    this.#flags = { ...flagsDefaults };
  }

  setConfig(config: Config) {
    this.#config = config;
    this.#evalFlags();
  }

  indenify(id: UserId, properties?: Properties) {
    this.#user = { id, ...properties };
    this.#evalFlags();
  }

  isEnabled(flag: TFlagName): boolean {
    return this.#flags[flag] ?? false;
  }

  subscribe(listener: Listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notifyListeners() {
    for (const listener of this.#listeners) {
      listener();
    }
  }

  #evalFlags() {
    let flagsChanged = false;

    if (!this.#config) {
      const newFlags = { ...this.flagsDefaults };
      flagsChanged = Object.entries(this.#flags).some(
        ([flagName, value]) => newFlags[flagName as TFlagName] !== value
      );
      if (flagsChanged) {
        this.#flags = newFlags;
        this.#notifyListeners();
      }
      return;
    }

    const matchedCohorts = new Set<CohortName>();
    const user = this.#user;
    if (user) {
      for (const cohortName in this.#config.cohorts) {
        const cohortMatchers = this.#config.cohorts[cohortName];
        if (cohortMatchers && matchUser(user, cohortMatchers)) {
          matchedCohorts.add(cohortName);
        }
      }
    }
    for (const flagName in this.flagsDefaults) {
      const flagConfig = this.#config.flags[flagName];
      const defaultFlagValue = this.flagsDefaults[flagName];
      if (!flagConfig) {
        flagsChanged =
          flagsChanged || this.#flags[flagName] !== defaultFlagValue;
        this.#flags[flagName] = defaultFlagValue;
        continue;
      }
      const [isEnabled, ...matchers] = flagConfig;
      if (isEnabled) {
        flagsChanged = flagsChanged || this.#flags[flagName] !== true;
        this.#flags[flagName] = true;
        continue;
      }
      const isMatched = user
        ? matchUser(user, matchers, matchedCohorts)
        : false;
      flagsChanged = flagsChanged || this.#flags[flagName] !== isMatched;
      this.#flags[flagName] = isMatched;
    }
    if (flagsChanged) {
      this.#notifyListeners();
    }
  }
}
