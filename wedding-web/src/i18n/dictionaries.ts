import type { Locale } from '@/types/wedding';

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

export const DICTIONARIES: Record<Locale, Dictionary> = {
  he: {
    dir: 'rtl',
    langName: 'עברית',
    nav: {
      overview: 'לוח בקרה',
      guests: 'ניהול מוזמנים',
      studio: 'עיצוב הזמנה',
      whatsapp: 'וואטסאפ ואוטומציה',
      seating: 'סידורי הושבה',
      checkin: 'צ׳ק-אין בכניסה',
      greetings: 'ברכות ומתנות',
      newWedding: 'אירוע חדש +',
      previewInvitation: 'תצוגת הזמנה חיה',
    },
    invitation: {
      gettingMarried: 'מתחתנים!',
      saveTheDate: 'שמרו את התאריך',
      days: 'ימים',
      hours: 'שעות',
      minutes: 'דקות',
      reception: 'קבלת פנים',
      ceremony: 'חופה וקידושין',
      navigateWaze: 'ניווט ב-Waze',
      navigateMaps: 'Google Maps',
      addToCalendar: 'הוספה ליומן',
      rsvpTitle: 'אישור הגעה',
      personalGreeting: 'שמחים להזמינכם לחגוג איתנו! שמורים לכם עד',
      attending: 'מגיעים בשמחה 🎉',
      maybe: 'אולי 🤔',
      declined: 'לצערנו לא נגיע 💔',
      adultsCount: 'מבוגרים',
      childrenCount: 'ילדים',
      mealPreferences: 'העדפות מנה',
      meals: {
        regular: 'רגיל',
        vegetarian: 'צמחוני',
        vegan: 'טבעוני',
        kids: 'מנת ילדים',
        glatt: 'גלאט כשר',
      },
      dietaryNotesPlaceholder: 'רגישויות, אלרגיות או הערות לזוג...',
      submitRsvp: 'שליחת אישור הגעה',
      rsvpSaved: 'תודה! אישור ההגעה שלכם נשמר בהצלחה.',
      qrPassTitle: 'כרטיס כניסה אישי לאירוע',
      qrPassSubtitle: 'הציגו קוד זה בעמדת הקבלה בכניסה לאולם',
      assignedTable: 'שולחן שמור',
      giftSectionTitle: 'מתנה באשראי או באפליקציה',
      giftSectionSubtitle: 'תודה שאתם חוגגים איתנו ביום המיוחד שלנו',
      bitButton: 'שליחת מתנה ב-Bit',
      payboxButton: 'שליחת מתנה ב-PayBox',
      cardButton: 'מתנה בכרטיס אשראי',
      greetingWallTitle: 'קיר הברכות של הזוג',
      leaveBlessing: 'כתבו ברכה לזוג',
      yourName: 'שם מלא',
      yourRelationship: 'קרבה (למשל: חברים מהלימודים)',
      yourBlessing: 'הברכה שלכם...',
      sendBlessing: 'פרסום ברכה',
    },
  },
  en: {
    dir: 'rtl',
    langName: 'English',
    nav: {
      overview: 'Overview',
      guests: 'Guest List',
      studio: 'Invitation Studio',
      whatsapp: 'WhatsApp & Campaigns',
      seating: 'Seating Chart',
      checkin: 'Event Check-In',
      greetings: 'Greetings & Gifts',
      newWedding: '+ New Wedding',
      previewInvitation: 'Live Guest Preview',
    },
    invitation: {
      gettingMarried: 'Are Getting Married!',
      saveTheDate: 'Save The Date',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      reception: 'Reception',
      ceremony: 'Ceremony',
      navigateWaze: 'Open in Waze',
      navigateMaps: 'Google Maps',
      addToCalendar: 'Add to Calendar',
      rsvpTitle: 'Confirm Attendance (RSVP)',
      personalGreeting: 'We are thrilled to invite you! We have reserved seats for up to',
      attending: 'Joyfully Attending 🎉',
      maybe: 'Maybe 🤔',
      declined: 'Regretfully Decline 💔',
      adultsCount: 'Adults',
      childrenCount: 'Children',
      mealPreferences: 'Meal Preferences',
      meals: {
        regular: 'Standard',
        vegetarian: 'Vegetarian',
        vegan: 'Vegan',
        kids: 'Kids Meal',
        glatt: 'Kosher Glatt',
      },
      dietaryNotesPlaceholder: 'Allergies, dietary restrictions, or a note for the couple...',
      submitRsvp: 'Submit RSVP',
      rsvpSaved: 'Thank you! Your RSVP has been recorded.',
      qrPassTitle: 'Your Express Reception Pass',
      qrPassSubtitle: 'Present this QR pass at the entrance to view your table assignment',
      assignedTable: 'Table Number',
      giftSectionTitle: 'Digital Wedding Gift',
      giftSectionSubtitle: 'Thank you for celebrating our special day with us',
      bitButton: 'Send Gift via Bit',
      payboxButton: 'Send Gift via PayBox',
      cardButton: 'Send Gift by Card',
      greetingWallTitle: 'Couple’s Greeting Wall',
      leaveBlessing: 'Write a Blessing for the Couple',
      yourName: 'Your Name',
      yourRelationship: 'Relationship (e.g., College Friends)',
      yourBlessing: 'Write your heartfelt wishes...',
      sendBlessing: 'Post Blessing',
    },
  },
};
