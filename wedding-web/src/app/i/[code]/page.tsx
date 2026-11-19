'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-stone-900 text-white">
        <div className="text-xs font-medium text-stone-300">טוען הזמנה אישית...</div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-stone-100 p-6 text-center">
        <div className="max-w-md rounded-xl border border-stone-200 bg-white p-8 shadow-xs">
          <h1 className="text-lg font-bold text-stone-900">ההזמנה לא נמצאה</h1>
          <p className="mt-2 text-xs leading-relaxed text-stone-600">
            קוד ההזמנה שהוזן אינו תואם לרשומה פעילה במערכת.
            אנא ודאו שנכנסתם דרך הקישור המלא שנשלח אליכם בהודעת הוואטסאפ מהזוג.
          </p>
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
