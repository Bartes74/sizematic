import useSWR from 'swr';
import type { MissionState } from '@/components/missions/types';

type MissionsResponse = {
  missions: MissionState[];
};

async function fetcher(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Nie udało się pobrać misji (${response.status})`);
  }
  return (await response.json()) as MissionsResponse;
}

export function useMissions() {
  const { data, error, isLoading, mutate } = useSWR<MissionsResponse>('/api/v1/missions', fetcher, {
    revalidateOnFocus: true,
  });

  return {
    missions: data?.missions ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}
