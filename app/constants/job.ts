export enum SearchJobState {
  Running = 'running',
  Success = 'success',
  Failure = 'failure',
}

export const ALL_SEARCH_JOB_STATES = Object.values(SearchJobState) as [
  SearchJobState,
  ...SearchJobState[],
];
