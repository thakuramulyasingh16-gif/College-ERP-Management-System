export const UG_COURSES = ['B.A.', 'B.Sc.', 'B.Com', 'BBA', 'BCA', 'B.El.Ed'];
export const PG_COURSES = ['M.A.', 'M.Sc.', 'M.Com', 'MBA', 'MCA', 'LLM', 'M.Tech', 'M.Ed'];

export const generateSessions = (courseName) => {
  const isUG = UG_COURSES.some(c => courseName?.includes(c));
  const isPG = PG_COURSES.some(c => courseName?.includes(c));
  
  if (!isUG && !isPG) return [];

  const duration = isUG ? 3 : 2;
  const currentYear = new Date().getFullYear();
  const sessions = [];

  // Requirements: 2023-26, 2024-27, 2025-28, 2026-29 for UG
  // Show a range of sessions from 2023 to 2026 as starting years
  for (let startYear = 2023; startYear <= currentYear + 1; startYear++) {
    const endYear = startYear + duration;
    sessions.push(`${startYear}-${endYear.toString().slice(-2)}`);
  }
  return sessions;
};

