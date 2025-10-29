'use client';

import { useState } from 'react';
import type { UserRole } from '@/lib/types';

type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  owner_id: string;
};

type AdminUsersTableProps = {
  users: Profile[];
};

const ROLE_LABELS: Record<UserRole, string> = {
  free: 'Free',
  premium: 'Premium',
  premium_plus: 'Premium+',
  admin: 'Admin'
};

const ROLE_COLORS: Record<UserRole, string> = {
  free: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  premium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  premium_plus: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
};

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setIsChanging(true);
    try {
      const response = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, newRole }),
      });

      if (response.ok) {
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Błąd: ${error.message}`);
      }
    } catch (error) {
      alert('Wystąpił błąd podczas zmiany roli');
      console.error(error);
    } finally {
      setIsChanging(false);
      setSelectedUser(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-lg shadow-black/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Użytkownik
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Rola
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Data rejestracji
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {user.display_name || 'Brak nazwy'}
                      </p>
                      <p className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-foreground">{user.email || 'Brak email'}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('pl-PL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="relative">
                    <button
                      onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                      disabled={isChanging}
                      className="text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Zmień rolę
                    </button>

                    {selectedUser === user.id && (
                      <div className="absolute left-0 mt-2 w-auto rounded-lg border border-border bg-card shadow-lg z-50">
                        <div className="p-2 space-y-1">
                          {(['free', 'premium', 'premium_plus', 'admin'] as UserRole[]).map((role) => (
                            <button
                              key={role}
                              onClick={() => handleRoleChange(user.id, role)}
                              disabled={user.role === role || isChanging}
                              className={`w-full text-left px-4 py-2.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                                user.role === role
                                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                  : 'hover:bg-muted text-foreground'
                              }`}
                            >
                              {ROLE_LABELS[role]}
                              {user.role === role && ' (obecna)'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Brak użytkowników w systemie</p>
        </div>
      )}
    </div>
  );
}
