import { PREFIX_COHORT, DEFAULT_CONFIG } from "./constants.js";
import type {
  CohortName,
  Config,
  Matchers,
  UserId,
  Properties,
  FlagName,
} from "./types.js";

interface User extends Properties {
  id: UserId;
}

type Listener = () => void;

export class FlareFlags<TFlagName extends FlagName> {
  readonly #defaultValues: Readonly<Record<TFlagName, boolean>>;
  readonly #globalProperties: Readonly<Properties> = {};
  readonly #matchedCohorts = new Set<CohortName>();
  #config: Config = DEFAULT_CONFIG;
  #user: User | undefined;
  #evalFlagValues: Record<TFlagName, boolean>;
  #listeners = new Set<Listener>();

  constructor(
    defaultValues: Record<TFlagName, boolean>,
    globalProperties: Properties = {}
  ) {
    this.#defaultValues = Object.freeze(defaultValues);
    this.#evalFlagValues = { ...defaultValues };
    this.#globalProperties = Object.freeze(globalProperties);
  }

  setConfig = (config: Config) => {
    this.#config = config;
    this.#eval();
  };

  identify = (id: UserId, properties?: Properties) => {
    this.#user = { id, ...properties };
    this.#eval();
  };

  isEnabled = (flag: TFlagName): boolean => {
    return this.#evalFlagValues[flag] ?? false;
  };

  subscribe = (listener: Listener) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  reset = () => {
    this.#user = undefined;
    this.#resetEvalFlagValues();
  };

  #matchByUserOrGlobalProperties(props: Properties) {
    const entries = Object.entries(props);
    const user = this.#user;
    if (user && entries.every(([key, value]) => user[key] === value)) {
      return true;
    }

    // Check global properties
    return entries.every(
      ([key, value]) => this.#globalProperties[key] === value
    );
  }

  #matchCohort(matchers: Matchers) {
    const user = this.#user;
    return matchers.some((m) => {
      if (typeof m === "string") {
        if (m.startsWith(PREFIX_COHORT)) {
          // Check if user is in the referenced cohort
          const cohortName = m.slice(PREFIX_COHORT.length);
          return this.#matchedCohorts.has(cohortName);
        }
        return user && m === user.id;
      }
      if (typeof m === "object") {
        return this.#matchByUserOrGlobalProperties(m);
      }
      return false;
    });
  }

  #resetEvalFlagValues() {
    let isChanged = false;
    for (const flagName in this.#defaultValues) {
      const prevValue = this.#evalFlagValues[flagName];
      const defaultValue = this.#defaultValues[flagName];
      if (prevValue !== defaultValue) {
        this.#evalFlagValues[flagName] = defaultValue;
        isChanged = true;
      }
    }
    if (isChanged) {
      this.#notifyListeners();
    }
  }

  #notifyListeners() {
    for (const listener of this.#listeners) {
      listener();
    }
  }

  #eval() {
    if (!this.#config) {
      this.#resetEvalFlagValues();
      return;
    }
    this.#matchedCohorts.clear();
    let changed = true;
    let iterations = 0;
    const maxIterations = Object.keys(this.#config.cohorts).length;
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      for (const cohortName in this.#config.cohorts) {
        if (this.#matchedCohorts.has(cohortName)) {
          continue;
        }
        const cohortMatchers = this.#config.cohorts[cohortName];
        if (cohortMatchers && this.#matchCohort(cohortMatchers)) {
          this.#matchedCohorts.add(cohortName);
          changed = true;
        }
      }
    }
    let isChanged = false;
    for (const flagName in this.#defaultValues) {
      const flagConfig = this.#config.flags[flagName];
      const defaultFlagValue = this.#defaultValues[flagName];
      let newValue: boolean;

      if (!flagConfig) {
        newValue = defaultFlagValue;
      } else {
        const [isEnabled, ...matchers] = flagConfig;
        newValue = isEnabled ? true : this.#matchCohort(matchers);
      }

      if (this.#evalFlagValues[flagName] !== newValue) {
        this.#evalFlagValues[flagName] = newValue;
        isChanged = true;
      }
    }
    if (isChanged) {
      this.#notifyListeners();
    }
  }
}
