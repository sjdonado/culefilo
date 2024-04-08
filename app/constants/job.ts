export enum SearchJobState {
  Created = 'created',
  Running = 'running',
  Success = 'success',
  Failure = 'failure',
}

export const ALL_SEARCH_JOB_STATES = Object.values(SearchJobState) as [
  SearchJobState,
  ...SearchJobState[],
];

export const DONE_JOB_MESSAGE = 'done';
