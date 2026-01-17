/**
 * French public holidays and school vacation periods
 * Used for smart travel date suggestions
 */

/**
 * Get French public holidays for a given year
 * @param {number} year
 * @returns {Array<{date: string, name: string, type: 'public'}>}
 */
export function getFrenchPublicHolidays(year) {
  // Fixed holidays
  const fixedHolidays = [
    { month: 1, day: 1, name: 'Jour de l\'An' },
    { month: 5, day: 1, name: 'Fête du Travail' },
    { month: 5, day: 8, name: 'Victoire 1945' },
    { month: 7, day: 14, name: 'Fête Nationale' },
    { month: 8, day: 15, name: 'Assomption' },
    { month: 11, day: 1, name: 'Toussaint' },
    { month: 11, day: 11, name: 'Armistice' },
    { month: 12, day: 25, name: 'Noël' },
  ];

  const holidays = fixedHolidays.map(h => ({
    date: `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
    name: h.name,
    type: 'public',
  }));

  // Calculate Easter-based holidays
  const easter = calculateEaster(year);
  const easterDate = new Date(easter);

  // Easter Monday (Easter + 1)
  const easterMonday = new Date(easterDate);
  easterMonday.setDate(easterMonday.getDate() + 1);
  holidays.push({
    date: formatDate(easterMonday),
    name: 'Lundi de Pâques',
    type: 'public',
  });

  // Ascension (Easter + 39)
  const ascension = new Date(easterDate);
  ascension.setDate(ascension.getDate() + 39);
  holidays.push({
    date: formatDate(ascension),
    name: 'Ascension',
    type: 'public',
  });

  // Pentecost Monday (Easter + 50)
  const pentecost = new Date(easterDate);
  pentecost.setDate(pentecost.getDate() + 50);
  holidays.push({
    date: formatDate(pentecost),
    name: 'Lundi de Pentecôte',
    type: 'public',
  });

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get French school vacation periods (Zone C - Paris)
 * @param {number} year - School year starting year (e.g., 2025 for 2025-2026)
 * @returns {Array<{start: string, end: string, name: string, type: 'vacation'}>}
 */
export function getFrenchSchoolVacations(year) {
  // Approximate dates - these vary slightly each year
  // Based on Zone C (Paris, Île-de-France)
  return [
    // Toussaint (Fall break) - late October
    {
      start: `${year}-10-19`,
      end: `${year}-11-03`,
      name: 'Vacances de la Toussaint',
      type: 'vacation',
    },
    // Christmas break
    {
      start: `${year}-12-21`,
      end: `${year + 1}-01-05`,
      name: 'Vacances de Noël',
      type: 'vacation',
    },
    // Winter break (February)
    {
      start: `${year + 1}-02-15`,
      end: `${year + 1}-03-02`,
      name: 'Vacances d\'Hiver',
      type: 'vacation',
    },
    // Spring break (April)
    {
      start: `${year + 1}-04-12`,
      end: `${year + 1}-04-27`,
      name: 'Vacances de Printemps',
      type: 'vacation',
    },
    // Summer break
    {
      start: `${year + 1}-07-05`,
      end: `${year + 1}-09-01`,
      name: 'Vacances d\'Été',
      type: 'vacation',
    },
  ];
}

/**
 * Check if a date falls within a vacation period
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {Array} vacations - Array of vacation periods
 * @returns {{isVacation: boolean, vacationName: string|null}}
 */
export function isDateInVacation(dateStr, vacations) {
  const date = new Date(dateStr);

  for (const vacation of vacations) {
    const start = new Date(vacation.start);
    const end = new Date(vacation.end);

    if (date >= start && date <= end) {
      return { isVacation: true, vacationName: vacation.name };
    }
  }

  return { isVacation: false, vacationName: null };
}

/**
 * Check if a date is a public holiday
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {Array} holidays - Array of holidays
 * @returns {{isHoliday: boolean, holidayName: string|null}}
 */
export function isDateHoliday(dateStr, holidays) {
  const holiday = holidays.find(h => h.date === dateStr);
  return {
    isHoliday: !!holiday,
    holidayName: holiday?.name || null,
  };
}

/**
 * Get all holidays and vacations for a date range
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {{holidays: Array, vacations: Array, longWeekends: Array}}
 */
export function getHolidaysInRange(startDate, endDate) {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  let holidays = [];
  let vacations = [];

  // Collect holidays and vacations for all years in range
  for (let year = startYear; year <= endYear; year++) {
    holidays = holidays.concat(getFrenchPublicHolidays(year));
    vacations = vacations.concat(getFrenchSchoolVacations(year - 1)); // School year starts previous year
    vacations = vacations.concat(getFrenchSchoolVacations(year));
  }

  // Filter to only include dates within range
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  holidays = holidays.filter(h => h.date >= startStr && h.date <= endStr);
  vacations = vacations.filter(v => v.end >= startStr && v.start <= endStr);

  // Find long weekends (public holiday + weekend = 3+ day break)
  const longWeekends = findLongWeekends(holidays, startDate, endDate);

  return { holidays, vacations, longWeekends };
}

/**
 * Find long weekends created by public holidays
 * @param {Array} holidays
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Array<{start: string, end: string, days: number, holidays: Array}>}
 */
function findLongWeekends(holidays, startDate, endDate) {
  const longWeekends = [];

  for (const holiday of holidays) {
    const holidayDate = new Date(holiday.date);
    const dayOfWeek = holidayDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    let start, end, days;
    const includedHolidays = [holiday.name];

    // Monday holiday = Sat, Sun, Mon (3 days)
    if (dayOfWeek === 1) {
      start = new Date(holidayDate);
      start.setDate(start.getDate() - 2); // Saturday
      end = new Date(holidayDate); // Monday
      days = 3;
    }
    // Friday holiday = Fri, Sat, Sun (3 days)
    else if (dayOfWeek === 5) {
      start = new Date(holidayDate); // Friday
      end = new Date(holidayDate);
      end.setDate(end.getDate() + 2); // Sunday
      days = 3;
    }
    // Thursday holiday = potential "pont" (Thu, Fri, Sat, Sun = 4 days)
    else if (dayOfWeek === 4) {
      start = new Date(holidayDate); // Thursday
      end = new Date(holidayDate);
      end.setDate(end.getDate() + 3); // Sunday
      days = 4;
      includedHolidays.push('Pont du ' + holiday.name);
    }
    // Tuesday holiday = potential "pont" (Sat, Sun, Mon, Tue = 4 days)
    else if (dayOfWeek === 2) {
      start = new Date(holidayDate);
      start.setDate(start.getDate() - 3); // Saturday
      end = new Date(holidayDate); // Tuesday
      days = 4;
      includedHolidays.push('Pont du ' + holiday.name);
    }
    else {
      continue; // Mid-week holidays (Wed) or weekend holidays don't create long weekends
    }

    // Check if within range
    if (start >= startDate && end <= endDate) {
      longWeekends.push({
        start: formatDate(start),
        end: formatDate(end),
        days,
        holidays: includedHolidays,
        reason: holiday.name,
      });
    }
  }

  return longWeekends;
}

/**
 * Calculate Easter date using Anonymous Gregorian algorithm
 * @param {number} year
 * @returns {string} Date in YYYY-MM-DD format
 */
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Format Date to YYYY-MM-DD string
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Analyze a period for travel potential
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {{
 *   isSchoolVacation: boolean,
 *   vacationName: string|null,
 *   includesHoliday: boolean,
 *   holidays: Array,
 *   isLongWeekend: boolean,
 *   isPeakSeason: boolean,
 *   priceImpact: 'low'|'medium'|'high',
 *   recommendation: string
 * }}
 */
export function analyzePeriodForTravel(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const { holidays, vacations, longWeekends } = getHolidaysInRange(start, end);

  // Check if period is during school vacation
  const vacationCheck = isDateInVacation(startDate, vacations);

  // Check for holidays in the period
  const includedHolidays = holidays.filter(h => {
    const hDate = new Date(h.date);
    return hDate >= start && hDate <= end;
  });

  // Check if this is a long weekend opportunity
  const isLongWeekend = longWeekends.some(lw => {
    const lwStart = new Date(lw.start);
    const lwEnd = new Date(lw.end);
    return lwStart >= start && lwEnd <= end;
  });

  // Determine peak season (summer, Christmas, school breaks)
  const month = start.getMonth() + 1;
  const isPeakSeason =
    (month >= 7 && month <= 8) || // Summer
    (month === 12 && start.getDate() >= 15) || // Christmas
    vacationCheck.isVacation;

  // Price impact assessment
  let priceImpact = 'low';
  if (isPeakSeason) {
    priceImpact = 'high';
  } else if (includedHolidays.length > 0 || isLongWeekend) {
    priceImpact = 'medium';
  }

  // Generate recommendation
  let recommendation = '';
  if (isPeakSeason) {
    recommendation = 'Période de haute saison - réservez tôt pour les meilleurs prix';
  } else if (isLongWeekend) {
    recommendation = 'Pont idéal pour un week-end prolongé';
  } else if (includedHolidays.length > 0) {
    recommendation = 'Période incluant un jour férié - bonne opportunité';
  } else {
    recommendation = 'Période hors saison - meilleurs tarifs disponibles';
  }

  return {
    isSchoolVacation: vacationCheck.isVacation,
    vacationName: vacationCheck.vacationName,
    includesHoliday: includedHolidays.length > 0,
    holidays: includedHolidays,
    isLongWeekend,
    isPeakSeason,
    priceImpact,
    recommendation,
  };
}
