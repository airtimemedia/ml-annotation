import { useEffect, useCallback } from 'react';
import { FilterState } from '../types';

interface UrlState {
  rowIndex: number | null;
  filters: FilterState;
}

/**
 * Custom hook to sync annotation state with URL parameters
 * Enables deep linking and browser history navigation
 */
export function useUrlState() {
  /**
   * Parse URL search params into state
   */
  const parseUrl = useCallback((): UrlState => {
    const params = new URLSearchParams(window.location.search);

    // Parse row index
    const rowParam = params.get('row');
    const rowIndex = rowParam ? parseInt(rowParam, 10) : null;

    // Parse prompt filters
    const promptsParam = params.get('prompts');
    const prompts = new Set<string>(
      promptsParam ? promptsParam.split(',').filter(Boolean) : []
    );

    // Parse action filters
    const actionsParam = params.get('actions');
    const actions = new Set<string>(
      actionsParam ? actionsParam.split(',').filter(Boolean) : []
    );

    return {
      rowIndex: rowIndex !== null && !isNaN(rowIndex) ? rowIndex : null,
      filters: { prompts, actions },
    };
  }, []);

  /**
   * Update URL with current state
   */
  const updateUrl = useCallback(
    (rowIndex: number, filters: FilterState) => {
      const params = new URLSearchParams();

      // Add row index
      params.set('row', rowIndex.toString());

      // Add prompt filters (if any)
      if (filters.prompts.size > 0) {
        params.set('prompts', Array.from(filters.prompts).join(','));
      }

      // Add action filters (if any)
      if (filters.actions.size > 0) {
        params.set('actions', Array.from(filters.actions).join(','));
      }

      // Update URL without reloading page
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({}, '', newUrl);
    },
    []
  );

  /**
   * Listen for browser back/forward navigation
   */
  const onPopState = useCallback((callback: (state: UrlState) => void) => {
    const handler = () => {
      callback(parseUrl());
    };

    window.addEventListener('popstate', handler);

    return () => {
      window.removeEventListener('popstate', handler);
    };
  }, [parseUrl]);

  return {
    parseUrl,
    updateUrl,
    onPopState,
  };
}
