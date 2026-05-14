export const OFFICE_TYPE_LABELS: Record<string, string> = {
  HPO: 'HO',
  SPO: 'SO',
  BPO: 'BO',
  BPC: 'BPC',
};

export const TERRITORIAL_DIVISIONS = [
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

// Backward-compat alias — prefer TERRITORIAL_DIVISIONS in new code
export const AP_CIRCLE_DIVISIONS = TERRITORIAL_DIVISIONS;

// NOTE: 'RMS TP Divison' is a typo in the source hierarchy file ('Divison' not 'Division').
// Preserve it exactly so the JOIN to offices_master.division_name works.
export const RMS_DIVISIONS = [
  'RMS AG Division',
  'RMS TP Divison',
  'RMS V Division',
  'RMS Y Division',
] as const;

export const ALL_DIVISIONS = [...TERRITORIAL_DIVISIONS, ...RMS_DIVISIONS] as const;

export const STANDARD_OFFICE_TYPES = ['HPO', 'SPO', 'BPO', 'BPC'] as const;
export const OTHER_OFFICE_TYPES    = ['RMO', 'NPH', 'NSH', 'TMO', 'IDC', 'BNP', 'FPO'] as const;

export const TAB_ORDER = ['HO', 'SO', 'BO', 'BPC', 'OTH'] as const;

export const TAB_TO_TYPE_CODE: Record<string, string[]> = {
  HO:  ['HPO'],
  SO:  ['SPO'],
  BO:  ['BPO'],
  BPC: ['BPC'],
  OTH: ['RMO', 'NPH', 'NSH', 'TMO', 'IDC', 'BNP', 'FPO'],
};

export function isRmsDivision(name: string): boolean {
  return (RMS_DIVISIONS as readonly string[]).includes(name);
}

export type DivisionName = typeof TERRITORIAL_DIVISIONS[number];
export type TabLabel = typeof TAB_ORDER[number];
