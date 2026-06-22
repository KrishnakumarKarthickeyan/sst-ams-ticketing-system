/**
 * Canonical SAP module code → full name. Single source so dropdown labels stay
 * consistent everywhere and can't drift. DISPLAY ONLY — the stored ticket value
 * remains the module code (e.g. "MM"), never the label.
 */
export const SAP_MODULE_NAMES: Record<string, string> = {
  FICO: 'Finance & Controlling',
  MM: 'Materials Management',
  SD: 'Sales & Distribution',
  PP: 'Production Planning',
  PM: 'Plant Maintenance',
  QM: 'Quality Management',
  HCM: 'Human Capital Management',
  ABAP: 'ABAP Development',
  BASIS: 'SAP Basis',
  CPI: 'Cloud Platform Integration',
  SAC: 'SAP Analytics Cloud',
  'SF EC': 'SuccessFactors Employee Central',
  'SF ECP': 'SuccessFactors Employee Central Payroll',
  'SF PMGM': 'SuccessFactors Performance & Goals',
  'SF RCM': 'SuccessFactors Recruiting',
  // Legacy codes still present in the type/data.
  SuccessFactors: 'SuccessFactors',
  'Security/GRC': 'Security & GRC',
  'CPI/Integration': 'Cloud Platform Integration',
  'BW/BI': 'Business Warehouse / BI',
  Fiori: 'SAP Fiori',
  TRM: 'Treasury & Risk Management',
};

/** "CODE — Full Module Name" for dropdown display; falls back to the bare code. */
export function moduleLabel(code: string): string {
  const name = SAP_MODULE_NAMES[code];
  return name ? `${code} — ${name}` : code;
}
