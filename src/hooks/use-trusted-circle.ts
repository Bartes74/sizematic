import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => {
  if (!res.ok) {
    throw new Error('Nie udało się pobrać danych Kręgu zaufanych');
  }
  return res.json();
});

type CircleResponse = {
  plan: string | null;
  plan_type: string | null;
  limit: number | null;
  pending_invitations: Array<{ id: string; invitee_email: string; status: string; created_at: string; circle_id: string | null }>;
  circles: Array<{
    id: string;
    name: string;
    allow_wishlist_access: boolean;
    allow_size_access: boolean;
    member_count: number;
  }>;
  members: Array<{
    profile: {
      id: string;
      display_name: string | null;
      email: string | null;
      avatar_url: string | null;
    };
    circle_id: string;
    circle_name: string;
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
