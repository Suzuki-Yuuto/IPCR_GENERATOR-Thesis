const express = require('express');
const router = express.Router();
const db = require('../database');
const detectSchoolYear = require('../utils/detectSchoolYear');
const createSchoolYearIfMissing = require('../utils/createSchoolYearIfMissing');

// GET /api/academic-years
router.get('/academic-years', (req, res) => {
  db.all('SELECT * FROM academic_years ORDER BY school_year ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// PUT /api/academic-years/:schoolYear/:semester
router.put('/academic-years/:schoolYear/:semester', async (req, res) => {
  let { schoolYear, semester } = req.params;
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate and endDate are required" });
  }

  // Detect school year from dates
  const detectedYear = detectSchoolYear(startDate, endDate);
  if (detectedYear) {
    schoolYear = detectedYear;
  }

  try {
    // 1 & 2. Create if missing
    await createSchoolYearIfMissing(schoolYear);

    // 3. Update the specific semester
    let startCol, endCol;
    if (semester === '1st' || semester === '1st Semester') {
      startCol = 'first_sem_start';
      endCol = 'first_sem_end';
    } else if (semester === '2nd' || semester === '2nd Semester') {
      startCol = 'second_sem_start';
      endCol = 'second_sem_end';
    } else {
      return res.status(400).json({ error: "Invalid semester" });
    }

    db.run(
      `UPDATE academic_years SET ${startCol} = ?, ${endCol} = ? WHERE school_year = ?`,
      [startDate, endDate, schoolYear],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, schoolYear, semester, startDate, endDate });
      }
    );
  } catch (error) {
    console.error("Error updating academic year:", error);
    res.status(500).json({ error: error.message || error });
  }
});

module.exports = router;
