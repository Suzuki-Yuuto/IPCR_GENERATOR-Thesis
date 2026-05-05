const db = require('../database');

function createSchoolYearIfMissing(schoolYear) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM academic_years WHERE school_year = ?', [schoolYear], (err, row) => {
      if (err) return reject(err);
      if (row) return resolve(row);

      // Create new row with default dates
      const [startYearStr, endYearStr] = schoolYear.split('-');
      const startYear = parseInt(startYearStr, 10);
      const endYear = parseInt(endYearStr, 10);

      const firstSemStart = `${startYear}-08-18`;
      const firstSemEnd = `${endYear}-01-02`;
      const secondSemStart = `${endYear}-01-26`;
      const secondSemEnd = `${endYear}-05-29`;

      db.run(
        `INSERT INTO academic_years (school_year, first_sem_start, first_sem_end, second_sem_start, second_sem_end)
         VALUES (?, ?, ?, ?, ?)`,
        [schoolYear, firstSemStart, firstSemEnd, secondSemStart, secondSemEnd],
        function (err2) {
          if (err2) return reject(err2);
          resolve({
            id: this.lastID,
            school_year: schoolYear,
            first_sem_start: firstSemStart,
            first_sem_end: firstSemEnd,
            second_sem_start: secondSemStart,
            second_sem_end: secondSemEnd
          });
        }
      );
    });
  });
}

module.exports = createSchoolYearIfMissing;
