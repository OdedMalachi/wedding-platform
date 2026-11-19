'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Heart, Sparkles } from 'lucide-react';
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
        <div className="flex items-center gap-2.5 text-sm">
          <Sparkles className="h-5 w-5 animate-spin text-amber-400" />
          טוען הזמנה אישית...
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-stone-100 p-6 text-center">
        <div className="max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <Heart className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">ההזמנה לא נמצאה</h1>
          <p className="mt-2 text-xs leading-relaxed text-stone-600">
            קוד ההזמנה <code className="font-mono font-semibold">{code}</code> אינו תואם להזמנה פעילה.
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
