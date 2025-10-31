import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => {
  if (!res.ok) {
    throw new Error('Nie udało się pobrać danych Kręgu zaufanych');
  }
  return res.json();
});

type CircleResponse = {
  plan: string | null;
  limit: number | null;
  pending_invitations: Array<{ id: string; invitee_email: string; status: string; created_at: string }>;
  members: Array<{
    profile: {
      id: string;
      display_name: string | null;
      email: string | null;
      avatar_url: string | null;
    };
    connected_at: string;
    outgoing_permissions: { category: string; product_type: string | null }[];
    incoming_permissions: { category: string; product_type: string | null }[];
  }>;
};

export function useTrustedCircle(initialData?: CircleResponse) {
  const { data, error, isLoading, mutate } = useSWR<CircleResponse>('/api/v1/trusted-circle', fetcher, {
    revalidateOnFocus: true,
    fallbackData: initialData,
    revalidateOnMount: !initialData,
    shouldRetryOnError: true,
  });

  return {
    circle: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
