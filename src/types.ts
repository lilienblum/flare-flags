export type CohortName = string;
export type FlagName = string;
export type UserId = string;
export type Properties = Record<string, string | number | boolean>;
export type Matchers = (UserId | Properties)[];

export interface Config {
  cohorts: Record<CohortName, Matchers>;
  flags: Record<FlagName, [boolean, ...Matchers]>;
}
