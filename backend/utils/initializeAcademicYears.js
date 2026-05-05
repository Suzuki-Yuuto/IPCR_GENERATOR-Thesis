const db = require('../database');
const createSchoolYearIfMissing = require('./createSchoolYearIfMissing');

async function initializeAcademicYears() {
  db.get('SELECT COUNT(*) as count FROM academic_years', async (err, row) => {
    if (err) {
      console.error('Error checking academic_years:', err);
      return;
    }

    if (row.count === 0) {
      console.log('Initializing default academic years...');
      const years = [
        '2025-2026',
        '2026-2027',
        '2027-2028',
        '2028-2029',
        '2029-2030'
      ];

      for (const year of years) {
        try {
          await createSchoolYearIfMissing(year);
          console.log(`Created academic year ${year}`);
        } catch (error) {
          console.error(`Error creating academic year ${year}:`, error);
        }
      }
    }
  });
}

module.exports = initializeAcademicYears;
