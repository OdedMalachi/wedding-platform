import type { CampaignType, Guest, Locale, Wedding } from '@/types/wedding';

export function getDefaultCampaignTemplate(campaign: CampaignType, _locale?: Locale): string {
  switch (campaign) {
    case 'SAVE_THE_DATE':
      return 'שלום {{guest_name}}, שמחים לעדכן כי החתונה של {{couple_names}} תתקיים בתאריך {{event_date}} ב{{venue_name}}. שמרו את התאריך, הזמנה אישית תישלח בהמשך.';
    case 'INITIAL_INVITATION':
      return 'שלום {{guest_name}} היקרים, אנו שמחים ונרגשים להזמין אתכם לחתונה של {{couple_names}} שתתקיים בתאריך {{event_date}} ב{{venue_name}}. לצפייה בהזמנה ולאישור הגעה: {{rsvp_link}}';
    case 'RSVP_REMINDER':
      return 'שלום {{guest_name}}, נשמח מאוד לדעת האם תוכלו להשתתף בחתונה של {{couple_names}} בתאריך {{event_date}}. לעדכון מהיר של אישור ההגעה לחצו כאן: {{rsvp_link}}';
    case 'DAY_OF_TABLE':
      return 'שלום {{guest_name}}, מתרגשים לראותכם הערב בחתונה של {{couple_names}} ב{{venue_name}}. השולחן השמור עבורכם באולם: {{table_number}}. לקישור להזמנה ולניווט: {{rsvp_link}}';
    case 'THANK_YOU':
      return 'שלום {{guest_name}} היקרים, תודה רבה שהגעתם לשמוח איתנו בחתונה והפכתם את הערב שלנו לבלתי נשכח. מעריכים ואוהבים, {{couple_names}}.';
  }
}

export function buildWhatsAppInvitationLink(params: {
  template: string;
  wedding: Wedding;
  guest: Guest;
  baseUrl: string;
}): {
  renderedMessage: string;
  whatsappUrl: string;
  desktopAppUrl: string;
  webAppUrl: string;
  rsvpLink: string;
} {
  const { template, wedding, guest, baseUrl } = params;
  const cleanBase = baseUrl.replace(/\/$/, '');
  const rsvpLink = `${cleanBase}/i/${guest.invitation.shortCode}`;
  const coupleNames = `${wedding.partner1Name} ו${wedding.partner2Name}`;
  const formattedDate = new Date(wedding.eventDate).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const renderedMessage = template
    .replace(/\{\{guest_name\}\}/g, guest.fullName)
    .replace(/\{\{couple_names\}\}/g, coupleNames)
    .replace(/\{\{event_date\}\}/g, formattedDate)
    .replace(/\{\{venue_name\}\}/g, wedding.venueName)
    .replace(/\{\{rsvp_link\}\}/g, rsvpLink)
    .replace(/\{\{table_number\}\}/g, guest.tableName || 'יימסר בכניסה לאולם');

  const phoneDigits = guest.phoneE164.replace(/[^\d]/g, '');
  const encodedText = encodeURIComponent(renderedMessage);
  const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodedText}`;
  const desktopAppUrl = `whatsapp://send?phone=${phoneDigits}&text=${encodedText}`;
  const webAppUrl = `https://web.whatsapp.com/send?phone=${phoneDigits}&text=${encodedText}`;

  return { renderedMessage, whatsappUrl, desktopAppUrl, webAppUrl, rsvpLink };
}
