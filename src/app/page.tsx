'use client';

import { useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Tabs */}
        <div className="mb-6 flex gap-2 rounded-2xl border border-border bg-card p-2">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === 'login'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Logowanie
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === 'register'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Rejestracja
          </button>
        </div>

        {/* Content */}
        {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  );
}
