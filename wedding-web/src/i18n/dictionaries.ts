export interface Dictionary {
  dir: 'rtl';
  langName: string;
  nav: {
    overview: string;
    guests: string;
    studio: string;
    whatsapp: string;
    seating: string;
    checkin: string;
    greetings: string;
    newWedding: string;
    previewInvitation: string;
  };
  invitation: {
    gettingMarried: string;
    saveTheDate: string;
    days: string;
    hours: string;
    minutes: string;
    reception: string;
    ceremony: string;
    navigateWaze: string;
    navigateMaps: string;
    addToCalendar: string;
    rsvpTitle: string;
    personalGreeting: string;
    attending: string;
    maybe: string;
    declined: string;
    adultsCount: string;
    childrenCount: string;
    mealPreferences: string;
    meals: {
      regular: string;
      vegetarian: string;
      vegan: string;
      kids: string;
      glatt: string;
    };
    dietaryNotesPlaceholder: string;
    submitRsvp: string;
    rsvpSaved: string;
    qrPassTitle: string;
    qrPassSubtitle: string;
    assignedTable: string;
    giftSectionTitle: string;
    giftSectionSubtitle: string;
    bitButton: string;
    payboxButton: string;
    cardButton: string;
    greetingWallTitle: string;
    leaveBlessing: string;
    yourName: string;
    yourRelationship: string;
    yourBlessing: string;
    sendBlessing: string;
  };
}

export const HEBREW_DICT: Dictionary = {
  dir: 'rtl',
  langName: 'עברית',
  nav: {
    overview: 'סקירה כללית',
    guests: 'ספר מוזמנים',
    studio: 'עיצוב ההזמנה',
    whatsapp: 'הפצה בוואטסאפ',
    seating: 'סידורי הושבה',
    checkin: 'קליטה באולם',
    greetings: 'ברכות ומתנות',
    newWedding: 'אירוע חדש',
    previewInvitation: 'תצוגת ההזמנה',
  },
  invitation: {
    gettingMarried: 'מתחתנים',
    saveTheDate: 'הזמנה לחתונה',
    days: 'ימים',
    hours: 'שעות',
    minutes: 'דקות',
    reception: 'קבלת פנים',
    ceremony: 'חופה וקידושין',
    navigateWaze: 'ניווט ב-Waze',
    navigateMaps: 'מפות גוגל',
    addToCalendar: 'שמירה ביומן',
    rsvpTitle: 'אישור הגעה לאירוע',
    personalGreeting: 'נשמח לראותכם משתתפים בשמחתנו. שמורים עבורכם עד',
    attending: 'מגיעים בשמחה',
    maybe: 'טרם בטוחים',
    declined: 'לא נוכל להגיע',
    adultsCount: 'מבוגרים',
    childrenCount: 'ילדים',
    mealPreferences: 'העדפות כשרות ומנות מיוחדות',
    meals: {
      regular: 'מנה רגילה',
      vegetarian: 'צמחוני',
      vegan: 'טבעוני',
      kids: 'מנת ילדים',
      glatt: 'גלאט מהדרין',
    },
    dietaryNotesPlaceholder: 'הערות בנושא רגישויות, אלרגיות או בקשות מיוחדות...',
    submitRsvp: 'שמירת אישור הגעה',
    rsvpSaved: 'אישור ההגעה נקלט במערכת. נתראה בשמחות!',
    qrPassTitle: 'שובר כניסה אישי לאולם',
    qrPassSubtitle: 'הציגו קוד זה בעמדת הקבלה בכניסה לאירוע לקבלת מספר השולחן',
    assignedTable: 'מספר שולחן',
    giftSectionTitle: 'מתנה לזוג באפליקציה או בהעברה',
    giftSectionSubtitle: 'תודה על השתתפותכם בשמחתנו',
    bitButton: 'העברת מתנה ב-Bit',
    payboxButton: 'העברת מתנה ב-PayBox',
    cardButton: 'מתנה בכרטיס אשראי',
    greetingWallTitle: 'ספר הברכות לזוג',
    leaveBlessing: 'כתיבת ברכה לזוג',
    yourName: 'שם המברכים',
    yourRelationship: 'קרבה (למשל: משפחה / חברים)',
    yourBlessing: 'כתבו כאן ברכה לזוג...',
    sendBlessing: 'שמירת ברכה',
  },
};

export const DICTIONARIES = {
  he: HEBREW_DICT,
  en: HEBREW_DICT,
};
