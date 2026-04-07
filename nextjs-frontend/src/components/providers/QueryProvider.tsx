'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

let ReactQueryDevtools: React.ComponentType<{ initialIsOpen: boolean }> | null = null;

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,   // 2 minutes
            gcTime: 10 * 60 * 1000,      // 10 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Mount-gate prevents server/client HTML mismatch from devtools injecting DOM nodes
  const [devtoolsReady, setDevtoolsReady] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !ReactQueryDevtools) {
      import('@tanstack/react-query-devtools')
        .then((m) => { ReactQueryDevtools = m.ReactQueryDevtools; })
        .catch(() => {})
        .finally(() => setDevtoolsReady(true));
    }
  }, []);

  return (
    <QueryClientProvider client={client}>
      {children}
      {devtoolsReady && ReactQueryDevtools && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
