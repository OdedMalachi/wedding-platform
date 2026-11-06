import type { CampaignType, Guest, Locale, Wedding } from '@/types/wedding';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getDefaultCampaignTemplate(campaign: CampaignType, locale: Locale): string {
  if (locale === 'he') {
    switch (campaign) {
      case 'SAVE_THE_DATE':
        return 'היי {{guest_name}}! 💍 שמרו את התאריך: {{couple_names}} מתחתנים ב-{{event_date}} ב{{venue_name}}. הזמנה רשמית תישלח בקרוב!';
      case 'INITIAL_INVITATION':
        return 'היי {{guest_name}} היקרים! 🎉 אנו מתרגשים להזמין אתכם לחתונה של {{couple_names}} ב-{{event_date}} ב{{venue_name}}. לצפייה בהזמנה ולאישור הגעה מהיר: {{rsvp_link}}';
      case 'RSVP_REMINDER':
        return 'היי {{guest_name}} ❤️ נשמח מאוד לדעת אם תוכלו לחגוג איתנו בחתונה של {{couple_names}}! אנא עדכנו אישור הגעה בקישור: {{rsvp_link}}';
      case 'DAY_OF_TABLE':
        return 'היי {{guest_name}}! מתרגשים לראותכם הערב בחתונה של {{couple_names}} ב{{venue_name}} 🥂 מספר השולחן שלכם הוא: *{{table_number}}*. כרטיס הכניסה שלכם: {{rsvp_link}}';
      case 'THANK_YOU':
        return 'היי {{guest_name}} היקרים! תודה ענקית שהגעתם לשמוח איתנו והפכתם את הערב שלנו לבלתי נשכח ❤️ אוהבים, {{couple_names}}';
    }
  }

  switch (campaign) {
    case 'SAVE_THE_DATE':
      return 'Hi {{guest_name}}! 💍 Save the Date: {{couple_names}} are getting married on {{event_date}} at {{venue_name}}!';
    case 'INITIAL_INVITATION':
      return 'Hi {{guest_name}}! 🎉 You are invited to the wedding of {{couple_names}} on {{event_date}} at {{venue_name}}. View your personal invitation & RSVP here: {{rsvp_link}}';
    case 'RSVP_REMINDER':
      return 'Hi {{guest_name}} ❤️ Friendly reminder to confirm your attendance for {{couple_names}}’s wedding here: {{rsvp_link}}';
    case 'DAY_OF_TABLE':
      return 'Hi {{guest_name}}! We cannot wait to celebrate with you tonight at {{venue_name}} 🥂 Your assigned table is *{{table_number}}*. Entry pass: {{rsvp_link}}';
    case 'THANK_YOU':
      return 'Dear {{guest_name}}, thank you so much for celebrating with us and making our wedding unforgettable! With love, {{couple_names}} ❤️';
  }
}

export function buildWhatsAppInvitationLink(params: {
  template: string;
  wedding: Wedding;
  guest: Guest;
  baseUrl: string;
}): { renderedMessage: string; whatsappUrl: string; rsvpLink: string } {
  const { template, wedding, guest, baseUrl } = params;
  const cleanBase = baseUrl.replace(/\/$/, '');
  const rsvpLink = `${cleanBase}/i/${guest.invitation.shortCode}`;
  const coupleNames = `${wedding.partner1Name} & ${wedding.partner2Name}`;
  const formattedDate = new Date(wedding.eventDate).toLocaleDateString(
    wedding.defaultLocale === 'he' ? 'he-IL' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );

  const renderedMessage = template
    .replace(/\{\{guest_name\}\}/g, guest.fullName)
    .replace(/\{\{couple_names\}\}/g, coupleNames)
    .replace(/\{\{event_date\}\}/g, formattedDate)
    .replace(/\{\{venue_name\}\}/g, wedding.venueName)
    .replace(/\{\{rsvp_link\}\}/g, rsvpLink)
    .replace(/\{\{table_number\}\}/g, guest.tableName || 'VIP / Reception');

  const phoneDigits = guest.phoneE164.replace(/[^\d]/g, '');
  const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(renderedMessage)}`;

  return { renderedMessage, whatsappUrl, rsvpLink };
}
