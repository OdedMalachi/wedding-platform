export type IsraeliRegion =
  | 'תל אביב וגוש דן'
  | 'השרון ועמק חפר'
  | 'השפלה'
  | 'ירושלים והסביבה'
  | 'חיפה והצפון'
  | 'הדרום';

export interface IsraeliWeddingVenue {
  id: string;
  name: string;
  city: string;
  region: IsraeliRegion;
  address: string;
  wazeQuery: string;
}

export const ISRAELI_REGIONS: IsraeliRegion[] = [
  'תל אביב וגוש דן',
  'השרון ועמק חפר',
  'השפלה',
  'ירושלים והסביבה',
  'חיפה והצפון',
  'הדרום',
];

export const ISRAELI_WEDDING_VENUES: IsraeliWeddingVenue[] = [
  // === השרון ועמק חפר ===
  {
    id: 'havat-ronit',
    name: 'חוות רונית - מתחם אירועים',
    city: 'שפיים',
    region: 'השרון ועמק חפר',
    address: 'ליד קיבוץ שפיים, מועצה אזורית חוף השרון',
    wazeQuery: 'חוות רונית שפיים',
  },
  {
    id: 'alma-events',
    name: 'עלמה - בית לאירועים',
    city: 'אבן יהודה',
    region: 'השרון ועמק חפר',
    address: 'דרך השרון 14, אבן יהודה',
    wazeQuery: 'עלמה אבן יהודה',
  },
  {
    id: 'luka-mishmar',
    name: 'לוקא - גן אירועים',
    city: 'משמר השרון',
    region: 'השרון ועמק חפר',
    address: 'קיבוץ משמר השרון, עמק חפר',
    wazeQuery: 'לוקא משמר השרון',
  },
  {
    id: 'kai-resort',
    name: 'קאי ריזורט אירועים',
    city: 'עמק חפר',
    region: 'השרון ועמק חפר',
    address: 'פארק תעשיות עמק חפר',
    wazeQuery: 'קאי ריזורט עמק חפר',
  },
  {
    id: 'citrus-even-yehuda',
    name: 'סיטרוס - גן אירועים',
    city: 'אבן יהודה',
    region: 'השרון ועמק חפר',
    address: 'כביש 4, צומת הדרים, אבן יהודה',
    wazeQuery: 'סיטרוס אבן יהודה',
  },
  {
    id: 'kochav-hayam',
    name: 'כוכב הים - אירועים על הים',
    city: 'שדות ים',
    region: 'השרון ועמק חפר',
    address: 'קיבוץ שדות ים, קיסריה',
    wazeQuery: 'כוכב הים שדות ים',
  },
  {
    id: 'al-hayam-caesarea',
    name: 'על הים - קיסריה',
    city: 'קיסריה',
    region: 'השרון ועמק חפר',
    address: 'חוף הקשתות, שדות ים, קיסריה',
    wazeQuery: 'על הים שדות ים קיסריה',
  },
  {
    id: 'yara-caesarea',
    name: 'יארה - גן אירועים בקיסריה',
    city: 'קיסריה',
    region: 'השרון ועמק חפר',
    address: 'נמל קיסריה העתיקה, קיסריה',
    wazeQuery: 'יארה קיסריה',
  },
  {
    id: 'agada-badeshe',
    name: 'אגדה בדשא - אחוזת אירועים',
    city: 'משמרות',
    region: 'השרון ועמק חפר',
    address: 'קיבוץ משמרות, פרדס חנה כרכור',
    wazeQuery: 'אגדה בדשא קיבוץ משמרות',
  },
  {
    id: 'mevashelet-emek',
    name: 'הגלריה - עמק חפר',
    city: 'עמק חפר',
    region: 'השרון ועמק חפר',
    address: 'רחוב המסיק 5, פארק תעשיות עמק חפר',
    wazeQuery: 'הגלריה עמק חפר',
  },
  {
    id: 'eden-al-hamayim',
    name: 'עדן על המים',
    city: 'ניר אליהו',
    region: 'השרון ועמק חפר',
    address: 'קיבוץ ניר אליהו, כפר סבא',
    wazeQuery: 'עדן על המים ניר אליהו',
  },
  {
    id: 'white-pardes-hana',
    name: 'ווייט - גן אירועים',
    city: 'פרדס חנה כרכור',
    region: 'השרון ועמק חפר',
    address: 'דרך הים 1, פרדס חנה כרכור',
    wazeQuery: 'ווייט פרדס חנה',
  },

  // === תל אביב וגוש דן ===
  {
    id: 'trask-tlv',
    name: 'טראסק - נמל תל אביב',
    city: 'תל אביב - יפו',
    region: 'תל אביב וגוש דן',
    address: 'נמל תל אביב, ביתן 26, תל אביב - יפו',
    wazeQuery: 'טראסק נמל תל אביב',
  },
  {
    id: 'avenue-airport',
    name: 'אווניו - מרכז קונגרסים ואירועים',
    city: 'קריית שדה התעופה',
    region: 'תל אביב וגוש דן',
    address: 'שדרות התעופה 1, איירפורט סיטי, קריית שדה התעופה',
    wazeQuery: 'אווניו איירפורט סיטי',
  },
  {
    id: 'terminal-petah-tikva',
    name: 'טרמינל - מתחם אירועים',
    city: 'פתח תקווה',
    region: 'תל אביב וגוש דן',
    address: 'רחוב זבוטינסקי 92, פתח תקווה',
    wazeQuery: 'טרמינל מתחם אירועים פתח תקווה',
  },
  {
    id: 'sheva-tlv',
    name: 'שבע - מתחם אירועים תל אביב',
    city: 'תל אביב - יפו',
    region: 'תל אביב וגוש דן',
    address: 'הצפירה 19, תל אביב - יפו',
    wazeQuery: 'שבע הצפירה 19 תל אביב',
  },
  {
    id: 'east-tlv',
    name: 'איסט - אירועים אורבניים',
    city: 'תל אביב - יפו',
    region: 'תל אביב וגוש דן',
    address: 'מיטב 13, תל אביב - יפו',
    wazeQuery: 'איסט מיטב 13 תל אביב',
  },
  {
    id: 'riverside-tlv',
    name: 'ריברסייד - אירועים על הירקון',
    city: 'תל אביב - יפו',
    region: 'תל אביב וגוש דן',
    address: 'שדרות רוקח 2, פארק הירקון, תל אביב - יפו',
    wazeQuery: 'ריברסייד רוקח 2 תל אביב',
  },
  {
    id: 'ray-tlv',
    name: 'ריי - מתחם אירועים',
    city: 'תל אביב - יפו',
    region: 'תל אביב וגוש דן',
    address: 'לחי 28, תל אביב - יפו',
    wazeQuery: 'ריי אירועים תל אביב',
  },
  {
    id: 'bait-al-hayam',
    name: 'בית על הים - יפו',
    city: 'תל אביב - יפו',
    region: 'תל אביב וגוש דן',
    address: 'נמל יפו, רציף העלייה השנייה 48, תל אביב - יפו',
    wazeQuery: 'בית על הים נמל יפו',
  },
  {
    id: 'lawrence-jaffa',
    name: 'הלורנס - יפו העתיקה',
    city: 'תל אביב - יפו',
    region: 'תל אביב וגוש דן',
    address: 'הצורפים 18, יפו העתיקה, תל אביב - יפו',
    wazeQuery: 'הלורנס הצורפים 18 יפו',
  },
  {
    id: 'high-and-tlv',
    name: 'היי אנד - אירועים בתל אביב',
    city: 'תל אביב - יפו',
    region: 'תל אביב וגוש דן',
    address: 'החלוצים 2, תל אביב - יפו',
    wazeQuery: 'היי אנד החלוצים 2 תל אביב',
  },

  // === השפלה ===
  {
    id: 'lago-rishon',
    name: 'לאגו - מרכז כנסים ואירועים',
    city: 'ראשון לציון',
    region: 'השפלה',
    address: 'האירוס 1, מתחם האלף, ראשון לציון',
    wazeQuery: 'לאגו ראשון לציון',
  },
  {
    id: 'gabriel-ness-ziona',
    name: 'גבריאל - תרבות של אירועים',
    city: 'נס ציונה',
    region: 'השפלה',
    address: 'החרש 12, פארק המדע, נס ציונה',
    wazeQuery: 'גבריאל נס ציונה',
  },
  {
    id: 'via-ness-ziona',
    name: 'ויה - בית לאירועים בלב הפרדסים',
    city: 'נס ציונה',
    region: 'השפלה',
    address: 'בילויים 2, נס ציונה',
    wazeQuery: 'ויה נס ציונה',
  },
  {
    id: 'hanahala-beit-oved',
    name: 'הנחלה - גן אירועים',
    city: 'בית עובד',
    region: 'השפלה',
    address: 'מושב בית עובד, ליד נס ציונה',
    wazeQuery: 'הנחלה בית עובד',
  },
  {
    id: 'amara-ness-ziona',
    name: 'אמארה - מתחם אירועים',
    city: 'נס ציונה',
    region: 'השפלה',
    address: 'המזמרה 9, נס ציונה',
    wazeQuery: 'אמארה נס ציונה',
  },
  {
    id: 'nahalat-yehuda-events',
    name: 'אחוזת גן - רחובות',
    city: 'רחובות',
    region: 'השפלה',
    address: 'צומת ביל"ו, קריית עקרון - רחובות',
    wazeQuery: 'אחוזת גן צומת בילו',
  },
  {
    id: 'agadata-reem',
    name: 'אגדתא - מתחם אירועים',
    city: 'צומת ראם',
    region: 'השפלה',
    address: 'כביש 40, צומת ראם (מסמיה)',
    wazeQuery: 'אגדתא צומת ראם',
  },
  {
    id: 'nesya-reem',
    name: 'נסיה - מתחם אירועים',
    city: 'צומת ראם',
    region: 'השפלה',
    address: 'כביש 3, צומת ראם (מסמיה)',
    wazeQuery: 'נסיה צומת ראם',
  },
  {
    id: 'adia-yavne',
    name: 'עדיה - מתחם אירועים',
    city: 'יבנה',
    region: 'השפלה',
    address: 'שדרות העצמאות 1, יבנה',
    wazeQuery: 'עדיה יבנה',
  },
  {
    id: 'harmonia-bagan',
    name: 'הרמוניה בגן - צומת כנות',
    city: 'כנות',
    region: 'השפלה',
    address: 'פארק תעשיות כנות, צומת כנות',
    wazeQuery: 'הרמוניה בגן צומת כנות',
  },
  {
    id: 'hahuza-modiin',
    name: 'האחוזה - מודיעין',
    city: 'מודיעין',
    region: 'השפלה',
    address: 'אזור תעשייה שילת, מודיעין מכבים רעות',
    wazeQuery: 'האחוזה מודיעין',
  },
  {
    id: 'hermoso-modiin',
    name: 'הרמוסו - יער בן שמן',
    city: 'מודיעין',
    region: 'השפלה',
    address: 'נאות קדומים, יער בן שמן, מודיעין',
    wazeQuery: 'הרמוסו נאות קדומים',
  },
  {
    id: 'givat-brenner-events',
    name: 'גן ורדים - ראשון לציון',
    city: 'ראשון לציון',
    region: 'השפלה',
    address: 'מחלף גן הוורדים, ראשון לציון',
    wazeQuery: 'גן ורדים ראשון לציון',
  },
  {
    id: 'top-doran-rehovot',
    name: 'טופ דוראן - מתחם אירועים',
    city: 'רחובות',
    region: 'השפלה',
    address: 'דרך גד פיינשטיין, פארק המדע, רחובות',
    wazeQuery: 'טופ דוראן רחובות',
  },

  // === ירושלים והסביבה ===
  {
    id: 'kedma-neve-ilan',
    name: 'קדמא - אירועים בהרי יהודה',
    city: 'נווה אילן',
    region: 'ירושלים והסביבה',
    address: 'יד השמונה, ליד נווה אילן, הרי ירושלים',
    wazeQuery: 'קדמא נווה אילן',
  },
  {
    id: 'olmaya-jerusalem',
    name: 'אולמיא - טיילת ארמון הנציב',
    city: 'ירושלים',
    region: 'ירושלים והסביבה',
    address: 'דניאל ינובסקי 3, טיילת ארמון הנציב, ירושלים',
    wazeQuery: 'אולמיא ארמון הנציב ירושלים',
  },
  {
    id: 'artemisia-jerusalem',
    name: 'ארטמיסיה - מתחם אירועים',
    city: 'ירושלים',
    region: 'ירושלים והסביבה',
    address: 'יד חרוצים 14, תלפיות, ירושלים',
    wazeQuery: 'ארטמיסיה יד חרוצים ירושלים',
  },
  {
    id: 'view-jerusalem',
    name: 'ויו - אירועים בירושלים',
    city: 'ירושלים',
    region: 'ירושלים והסביבה',
    address: 'האומן 17, תלפיות, ירושלים',
    wazeQuery: 'ויו האומן 17 ירושלים',
  },
  {
    id: 'pavililion-jerusalem',
    name: 'פביליון - מרכז אירועים',
    city: 'ירושלים',
    region: 'ירושלים והסביבה',
    address: 'האומן 22, תלפיות, ירושלים',
    wazeQuery: 'פביליון האומן 22 ירושלים',
  },

  // === חיפה והצפון ===
  {
    id: 'kala-haifa',
    name: 'קאלה - מתחם אירועים',
    city: 'חיפה',
    region: 'חיפה והצפון',
    address: 'שדרות ההסתדרות 241, מפרץ חיפה',
    wazeQuery: 'קאלה שדרות ההסתדרות חיפה',
  },
  {
    id: 'hinuma-nesher',
    name: 'הינומה - אולמות וגני אירועים',
    city: 'נשר',
    region: 'חיפה והצפון',
    address: 'בר יהודה 111, נשר - חיפה',
    wazeQuery: 'הינומה נשר',
  },
  {
    id: 'bayit-bagan-yagur',
    name: 'ארץ קדם - צומת יגור',
    city: 'יגור',
    region: 'חיפה והצפון',
    address: 'קיבוץ יגור, מועצה אזורית זבולון',
    wazeQuery: 'קיבוץ יגור',
  },
  {
    id: 'golden-crown-nazareth',
    name: 'גולדן קראון - הר הקפיצה',
    city: 'נצרת',
    region: 'חיפה והצפון',
    address: 'דרך הר הקפיצה, נצרת',
    wazeQuery: 'מלון גולדן קראון נצרת',
  },
  {
    id: 'tel-megiddo-events',
    name: 'אחוזת סנדרין - רגבה',
    city: 'רגבה',
    region: 'חיפה והצפון',
    address: 'מושב רגבה, ליד נהריה',
    wazeQuery: 'אחוזת סנדרין רגבה',
  },

  // === הדרום ===
  {
    id: 'doria-sde-yoav',
    name: 'דוריה - מתחם אירועים',
    city: 'שדה יואב',
    region: 'הדרום',
    address: 'חמי יואב, קיבוץ שדה יואב (כביש 35)',
    wazeQuery: 'דוריה שדה יואב',
  },
  {
    id: 'neriya-beer-sheva',
    name: 'נריה - אולמי אירועים',
    city: 'באר שבע',
    region: 'הדרום',
    address: 'דרך חברון 48, באר שבע',
    wazeQuery: 'אולמי נריה באר שבע',
  },
  {
    id: 'agada-beer-sheva',
    name: 'הורדוס - מתחם אירועים בדרום',
    city: 'באר שבע',
    region: 'הדרום',
    address: 'הנגרים 1, באר שבע',
    wazeQuery: 'אולמי הורדוס באר שבע',
  },
  {
    id: 'troya-ashdod',
    name: 'טרויה - גן אירועים',
    city: 'אשדוד',
    region: 'הדרום',
    address: 'צומת בני דרום, אשדוד',
    wazeQuery: 'טרויה בני דרום אשדוד',
  },
  {
    id: 'belle-epoca-ashdod',
    name: 'אחוזת טל - אשדוד',
    city: 'אשדוד',
    region: 'הדרום',
    address: 'אזור תעשייה עד הלום, אשדוד',
    wazeQuery: 'אחוזת טל עד הלום אשדוד',
  },
];

export function buildVenueWazeUrl(venue: IsraeliWeddingVenue): string {
  return `https://waze.com/ul?q=${encodeURIComponent(venue.wazeQuery)}&navigate=yes`;
}

export function buildVenueGoogleMapsUrl(venue: IsraeliWeddingVenue): string {
  return `https://maps.google.com/?q=${encodeURIComponent(`${venue.name} ${venue.address}`)}`;
}

export function findVenueByNameOrAddress(
  venueName: string,
  venueAddress?: string
): IsraeliWeddingVenue | undefined {
  const cleanName = (venueName || '').trim();
  const cleanAddr = (venueAddress || '').trim();
  return (
    ISRAELI_WEDDING_VENUES.find((v) => v.name === cleanName) ||
    ISRAELI_WEDDING_VENUES.find((v) => v.address === cleanAddr) ||
    ISRAELI_WEDDING_VENUES.find(
      (v) => cleanName && (v.name.includes(cleanName) || cleanName.includes(v.name))
    )
  );
}
