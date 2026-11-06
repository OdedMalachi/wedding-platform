'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { Greeting, Guest, Wedding } from '@/types/wedding';
import { GuestInvitationView } from '@/components/invitation/GuestInvitationView';

export default function PublicInvitationPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code || '';

  const [data, setData] = useState<{
    wedding: Wedding;
    guest: Guest;
    greetings: Greeting[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetch(`/api/invitations/${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        setData(json);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-900 text-white">
        <div className="flex items-center gap-2.5 text-sm">
          <Sparkles className="h-5 w-5 animate-spin text-amber-400" />
          טוען הזמנה אישית...
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 p-6 text-center">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-stone-900">Invitation Not Found</h1>
          <p className="mt-2 text-sm text-stone-600">
            The invitation code <code className="font-mono font-semibold">{code}</code> does not
            match an active guest record.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Go to Organizer Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-stone-900">
      <GuestInvitationView
        wedding={data.wedding}
        guest={data.guest}
        greetings={data.greetings}
      />
    </main>
  );
}
