import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error('Nie udało się pobrać danych Kręgu zaufanych');
  }
  return res.json();
});

export function useTrustedCircle() {
  const { data, error, isLoading, mutate } = useSWR('/api/v1/trusted-circle', fetcher, {
    revalidateOnFocus: true,
  });

  return {
    circle: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
