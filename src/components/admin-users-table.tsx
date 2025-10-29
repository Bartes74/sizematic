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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [currentRole, setCurrentRole] = useState<UserRole>('free');
  const [isChanging, setIsChanging] = useState(false);

  const openModal = (userId: string, userName: string, role: UserRole) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    setCurrentRole(role);
  };

  const closeModal = () => {
    if (!isChanging) {
      setSelectedUserId(null);
      setSelectedUserName('');
    }
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!selectedUserId) return;

    setIsChanging(true);
    try {
      const response = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUserId, newRole }),
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
      setSelectedUserId(null);
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
                  <button
                    onClick={() => openModal(user.id, user.display_name || user.email || 'Użytkownik', user.role)}
                    disabled={isChanging}
                    className="text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Zmień rolę
                  </button>
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

      {/* Modal for changing role */}
      {selectedUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">Zmień rolę użytkownika</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedUserName}
              </p>
            </div>

            <div className="space-y-2">
              {(['free', 'premium', 'premium_plus', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  disabled={currentRole === role || isChanging}
                  className={`w-full text-left px-4 py-3 text-sm rounded-lg transition-colors border ${
                    currentRole === role
                      ? 'bg-muted border-border text-muted-foreground cursor-not-allowed'
                      : 'bg-background border-border hover:bg-muted hover:border-primary text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{ROLE_LABELS[role]}</span>
                    {currentRole === role && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[role]}`}>
                        Obecna
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeModal}
                disabled={isChanging}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
