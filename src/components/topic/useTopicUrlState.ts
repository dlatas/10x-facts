import * as React from 'react';

import type { TopicNavContext } from './topic.types';

export interface TopicUrlState {
  // search
  q: string;

  // nav context
  context: TopicNavContext;
}

function readUrlState(): TopicUrlState {
  if (typeof window === 'undefined') {
    return {
      q: '',
      context: {
        topicNameFromUrl: null,
        fromCollectionId: null,
        fromCollectionName: null,
      },
    };
  }

  const url = new URL(window.location.href);
  const q = url.searchParams.get('q') ?? '';

  const topicNameFromUrl = url.searchParams.get('topicName');
  const fromCollectionId = url.searchParams.get('fromCollectionId');
  const fromCollectionName = url.searchParams.get('fromCollectionName');

  return {
    q,
    context: {
      topicNameFromUrl: topicNameFromUrl && topicNameFromUrl.trim() ? topicNameFromUrl : null,
      fromCollectionId: fromCollectionId && fromCollectionId.trim() ? fromCollectionId : null,
      fromCollectionName:
        fromCollectionName && fromCollectionName.trim() ? fromCollectionName : null,
    },
  };
}

function writeUrlState(next: Pick<TopicUrlState, 'q'>): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);

  // q
  if (next.q && next.q.trim()) url.searchParams.set('q', next.q);
  else url.searchParams.delete('q');

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function useTopicUrlState(args?: { debounceMs?: number }) {
  const debounceMs = args?.debounceMs ?? 300;

  const initial = React.useMemo(() => readUrlState(), []);

  // draft (input) + committed (query key)
  const [qDraft, setQDraft] = React.useState('');
  const [qCommitted, setQCommitted] = React.useState('');

  const debounceRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setQDraft(initial.q);
    setQCommitted(initial.q);
  }, [initial.q]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const handle = window.setTimeout(() => {
      setQCommitted(qDraft);
      writeUrlState({ q: qDraft });
    }, debounceMs);
    debounceRef.current = handle;

    return () => window.clearTimeout(handle);
  }, [debounceMs, qDraft]);

  const commitNow = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setQCommitted(qDraft);
    writeUrlState({ q: qDraft });
  }, [qDraft]);

  return {
    // nav context (read-only)
    context: initial.context,

    // filters
    qDraft,
    setQDraft,
    qCommitted,
    commitNow,
  };
}

