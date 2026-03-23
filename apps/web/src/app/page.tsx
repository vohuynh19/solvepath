'use client';

import { useUsers } from '../hooks/use-users';
import { useAppStore } from '../store/app-store';
import { Button } from '@solvepath/ui';

export default function HomePage() {
  const { data: users, isLoading } = useUsers();
  const { count, increment } = useAppStore();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Solvepath Web</h1>

      <div className="mb-6">
        <p className="text-gray-600">Counter: {count}</p>
        <Button onClick={increment} className="mt-2">
          Increment
        </Button>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Users</h2>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <ul className="space-y-1">
            {users?.map((user) => (
              <li key={user.id} className="text-gray-700">
                {user.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
