import type { Metadata } from 'next';
import { findInvitationByCode } from '../../../../../wedding-api/src/db/store.ts';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;

  try {
    const found = await findInvitationByCode(code, { markOpened: false });

    if (!found) {
      return {
        title: 'הזמנה לחתונה 💍',
        description: 'הזמנה אישית ואישור הגעה לחתונה',
      };
    }

    const wedding = found.wedding;
    const guest = found.guest;

    const coupleNames = `${wedding.partner1Name} & ${wedding.partner2Name}`;
    const eventDate = new Date(wedding.eventDate).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const title = `הזמנה לחתונה של ${coupleNames} 💍`;
    const description = `לכבוד ${guest.fullName} — מתרגשים להזמינכם לחגוג איתנו ב-${eventDate} ב${wedding.venueName}. לחצו לצפייה בהזמנה ולאישור הגעה.`;
    const coverImage =
      wedding.themeConfig?.coverImageUrl && !wedding.themeConfig.coverImageUrl.startsWith('data:')
        ? wedding.themeConfig.coverImageUrl
        : undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        locale: 'he_IL',
        images: coverImage ? [{ url: coverImage, width: 1200, height: 630, alt: title }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: coverImage ? [coverImage] : undefined,
      },
    };
  } catch {
    return {
      title: 'הזמנה לחתונה 💍',
      description: 'הזמנה אישית ואישור הגעה לחתונה',
    };
  }
}

export default function InvitationCodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
