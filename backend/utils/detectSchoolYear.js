function detectSchoolYear(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear !== endYear) {
    return `${startYear}-${endYear}`;
  } else {
    // If dates are in the same year, determine based on month
    const startMonth = start.getMonth(); // 0 = Jan, 11 = Dec
    if (startMonth < 6) {
      // 2nd semester is typically Jan-May
      return `${startYear - 1}-${startYear}`;
    } else {
      // 1st semester or Summer is typically Jun-Dec
      return `${startYear}-${startYear + 1}`;
    }
  }
}

module.exports = detectSchoolYear;
