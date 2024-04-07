export enum SearchState {
  InProgress = 'in_progress',
  Success = 'success',
  Failure = 'failure',
}

export const ALL_SEARCH_STATES = Object.values(SearchState) as [
  SearchState,
  ...SearchState[],
];
