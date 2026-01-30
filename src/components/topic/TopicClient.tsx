import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { TopicClientInner } from './TopicClientInner';

export function TopicClient(props: { topicId: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TopicClientInner topicId={props.topicId} />
    </QueryClientProvider>
  );
}

