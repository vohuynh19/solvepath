import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

interface User {
  id: number;
  name: string;
}

async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users');
  return data;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}
