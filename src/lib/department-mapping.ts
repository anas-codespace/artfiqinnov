export const DEPARTMENT_MAPPING: Record<string, string> = {
  "Lead, AI & Technology Development": "TD",
  "Technical Development Executive": "TD",
  "Technology Development Executive": "TD",
  "Web Development Executive": "TD",
  "UI/UX & Web Development Executive": "TD",

  "Operations & Administration Manager": "MO",
  "Project Management & Technical Executive": "MO",
  "Business Operations & Technical Lead": "MO",
  "Business Operations Executive": "MO",
  "Business Development & Strategy Executive": "MO",

  "Technology & Digital Solutions Executive": "CM",
  "AI Media & Creative Director (Associate)": "CM",

  "Public Relations & Brand Communications Head": "ES",
  "Advocate Legal & Compliance Advisor": "ES",
  "Medical Adviser": "ES",
};

export const OFFICIAL_POSTINGS = Object.keys(DEPARTMENT_MAPPING);

export const DEPARTMENTS = [
  { code: 'TD', name: 'Tech Dev' },
  { code: 'MO', name: 'Mgmt Ops' },
  { code: 'CM', name: 'Creative' },
  { code: 'ES', name: 'External' },
] as const;

export function getDepartmentCode(posting: string | null | undefined): string | null {
  if (!posting) return null;
  return DEPARTMENT_MAPPING[posting] || null;
}
