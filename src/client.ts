import { COHORT_PROPERTY_PREFIX, DEFAULT_CONFIG } from "./constants";
import type {
  CohortName,
  Config,
  Matchers,
  UserId,
  Properties,
  FlagName,
} from "./types";

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
        return cohorts.has(m.slice(COHORT_PROPERTY_PREFIX.length));
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

export class FlareFlags<TFlagName extends FlagName> {
  readonly #defaultValues: Readonly<Record<TFlagName, boolean>>;
  #config: Config = DEFAULT_CONFIG;
  #user: User | undefined;
  #evalFlagValues: Record<TFlagName, boolean>;
  #listeners = new Set<Listener>();

  constructor(defaultValues: Record<TFlagName, boolean>) {
    this.#defaultValues = Object.freeze(defaultValues);
    this.#evalFlagValues = { ...defaultValues };
  }

  setConfig(config: Config) {
    this.#config = config;
    this.#evalFlags();
  }

  identify(id: UserId, properties?: Properties) {
    this.#user = { id, ...properties };
    this.#evalFlags();
  }

  isEnabled(flag: TFlagName): boolean {
    return this.#evalFlagValues[flag] ?? false;
  }

  subscribe(listener: Listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  reset() {
    this.#user = undefined;
    this.#resetEvalFlagValues();
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

  #evalFlags() {
    if (!this.#config) {
      this.#resetEvalFlagValues();
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
    let isChanged = false;
    for (const flagName in this.#defaultValues) {
      const flagConfig = this.#config.flags[flagName];
      const defaultFlagValue = this.#defaultValues[flagName];
      if (!flagConfig) {
        isChanged =
          isChanged || this.#evalFlagValues[flagName] !== defaultFlagValue;
        this.#evalFlagValues[flagName] = defaultFlagValue;
        continue;
      }
      const [isEnabled, ...matchers] = flagConfig;
      if (isEnabled) {
        isChanged = isChanged || this.#evalFlagValues[flagName] !== true;
        this.#evalFlagValues[flagName] = true;
        continue;
      }
      const isMatched = user
        ? matchUser(user, matchers, matchedCohorts)
        : false;
      isChanged = isChanged || this.#evalFlagValues[flagName] !== isMatched;
      this.#evalFlagValues[flagName] = isMatched;
    }
    if (isChanged) {
      this.#notifyListeners();
    }
  }
}
