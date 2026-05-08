/**
 * saveIPCR.js
 * Handles saving IPCR records into SQLite, scoped by academic year + semester.
 * Auto-populates start_date / end_date from semester_config.
 */

const db = require("./database");
const { computeCategory } = require("./ipcrCalculator");

const DEFAULT_ACADEMIC_YEAR = "2025-2026";
const DEFAULT_SEMESTER = "1st Semester";

// Category map (ML/key → DB display name)
const categoryMap = {
  syllabus: "Syllabus",
  courseGuide: "Course Guide",
  slm: "SLM",
  gradingSheet: "Grading Sheet",
  tos: "TOS",
  testQuestions: "Test Questions",
  attendanceSheet: "Attendance Sheet",
  classRecord: "Class Record",
  classroomObservation: "Classroom Observation",
  evaluationOfTeachingEffectiveness: "Evaluation of Teaching Effectiveness",
  accomplishmentReport: "Accomplishment Report",
};

// Reverse map (DB name → key) for computeCategory
const categoryKeyMap = {
  Syllabus: "syllabus",
  "Course Guide": "courseGuide",
  SLM: "slm",
  "Grading Sheet": "gradingSheet",
  TOS: "tos",
  "Test Questions": "testQuestions",
  "Attendance Sheet": "attendanceSheet",
  "Class Record": "classRecord",
  "Classroom Observation": "classroomObservation",
  "Evaluation of Teaching Effectiveness": "evaluationOfTeachingEffectiveness",
  "Accomplishment Report": "accomplishmentReport",
};

/**
 * Fetch start_date and end_date from semester_config for a given period.
 */
function getSemesterDates(academicYear, semester) {
  return new Promise((resolve) => {
    db.get(
      `SELECT start_date, end_date FROM semester_config
       WHERE academic_year = ? AND semester = ? ORDER BY id DESC LIMIT 1`,
      [academicYear, semester],
      (err, row) => {
        if (err || !row) {
          resolve({ start_date: null, end_date: null });
        } else {
          resolve({ start_date: row.start_date || null, end_date: row.end_date || null });
        }
      }
    );
  });
}

/**
 * Save a single category record (UPDATE existing row or INSERT new one).
 * @param {string|number} userId
 * @param {string}        category     - ML key or DB display name
 * @param {number}        accomplished
 * @param {number}        target
 * @param {string}        [academicYear]  - e.g. "2025-2026"
 * @param {string}        [semester]      - e.g. "1st Semester"
 */
async function saveIPCR(userId, category, accomplished, target = 0, academicYear, semester) {
  const uid = parseInt(userId, 10) || userId;
  const dbCategory = categoryMap[category] || category;
  const computeKey = categoryKeyMap[dbCategory] || category;
  const year = academicYear || DEFAULT_ACADEMIC_YEAR;
  const sem  = semester    || DEFAULT_SEMESTER;

  const numericTarget  = Number(target);
  const targetOverride = numericTarget > 0 ? numericTarget : undefined;

  const result = computeCategory(computeKey, accomplished, targetOverride);

  // Fetch semester dates from config
  const { start_date, end_date } = await getSemesterDates(year, sem);

  const rating = Number(result.rating);
  const updateParams = [
    result.target,
    result.accomplished,
    result.Q,
    result.E,
    result.T,
    rating,
    start_date,
    end_date,
    uid,
    dbCategory,
    year,
    sem,
  ];

  return new Promise((resolve, reject) => {
    // 1) Try to update an existing row for this year/semester
    const updateSql = `
      UPDATE ipcr_records
      SET target = ?, accomplished = ?, q_score = ?, e_score = ?, t_score = ?, rating = ?,
          submission_date = DATE('now'), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date)
      WHERE user_id = ? AND category = ? AND academic_year = ? AND semester = ?
    `;
    db.run(updateSql, updateParams, function (err) {
      if (err) return reject(err);
      if (this.changes > 0) return resolve({ success: true, data: result });

      // 2) Try to backfill legacy rows (NULL year/semester)
      const legacySql = `
        UPDATE ipcr_records
        SET target = ?, accomplished = ?, q_score = ?, e_score = ?, t_score = ?, rating = ?,
            submission_date = DATE('now'), academic_year = ?, semester = ?,
            start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date)
        WHERE user_id = ? AND category = ?
          AND (academic_year IS NULL OR academic_year = '')
          AND (semester IS NULL OR semester = '')
      `;
      db.run(
        legacySql,
        [result.target, result.accomplished, result.Q, result.E, result.T, rating, year, sem, start_date, end_date, uid, dbCategory],
        function (err2) {
          if (err2) return reject(err2);
          if (this.changes > 0) return resolve({ success: true, data: result });

          // 3) Insert brand new row (with semester dates)
          const insertSql = `
            INSERT INTO ipcr_records
            (user_id, category, academic_year, semester, target, accomplished, q_score, e_score, t_score, rating, submission_date, start_date, end_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE('now'), ?, ?)
          `;
          db.run(
            insertSql,
            [uid, dbCategory, year, sem, result.target, result.accomplished, result.Q, result.E, result.T, rating, start_date, end_date],
            (err3) => (err3 ? reject(err3) : resolve({ success: true, data: result })),
          );
        },
      );
    });
  });
}

/**
 * Save multiple categories at once.
 * @param {string|number} userId
 * @param {object}        ocrResults  - { category: { accomplished, target }, ... }
 * @param {string}        [academicYear]
 * @param {string}        [semester]
 */
async function saveMultipleIPCR(userId, ocrResults, academicYear, semester) {
  const results = [];

  for (const [category, data] of Object.entries(ocrResults)) {
    const accomplished = Number(data?.accomplished) || 0;
    const target       = Number(data?.target)       || 0;

    const res = await saveIPCR(userId, category, accomplished, target, academicYear, semester);
    results.push(res.data);
  }

  return results;
}

module.exports = {
  saveIPCR,
  saveMultipleIPCR,
};