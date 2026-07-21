import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

export function createTrpcClient(adminKey?: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/trpc",
        headers: adminKey ? { "x-admin-key": adminKey } : {},
      }),
    ],
    transformer: superjson,
  });
}

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  });
}
