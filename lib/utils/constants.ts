export const OFFICE_TYPE_LABELS: Record<string, string> = {
  HPO: 'HO',
  SPO: 'SO',
  BPO: 'BO',
  BPC: 'BPC',
};

export const TAB_ORDER = ['HO', 'SO', 'BO', 'BPC'] as const;

export const AP_CIRCLE_DIVISIONS = [
  'Amalapuram Division', 'Anakapalle Division', 'Anantapur Division',
  'Bhimavaram Division', 'Chittoor Division', 'Cuddapah Division',
  'Eluru Division', 'Gudivada Division', 'Gudur Division',
  'Guntur Division', 'Hindupur Division', 'Kakinada Division',
  'Kurnool Division', 'Machilipatnam Division', 'Markapur Division',
  'Nandyal Division', 'Narasaraopet Division', 'Nellore Division',
  'Parvathipuram Division', 'Prakasam Division', 'Proddatur Division',
  'Rajahmundry Division', 'Srikakulam Division', 'Tadepalligudem Division',
  'Tenali Division', 'Tirupati Division', 'Vijayawada Division',
  'Visakhapatnam Division', 'Vizianagaram Division',
] as const;

export type DivisionName = typeof AP_CIRCLE_DIVISIONS[number];
export type TabLabel = typeof TAB_ORDER[number];
