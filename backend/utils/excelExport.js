const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const db = require("../database");
const { computeCategory } = require("../ipcrCalculator");
const DefaultTarget = require("../../shared/defaultTarget.json");

const TEMPLATE_PATH = path.resolve(__dirname, "Template.xlsx");

/**
 * 1. EASY CONFIGURATION AREA
 *
 * Only two mapping objects are used:
 *   - META_DATA_MAPPING  — user/meta info mapped to specific cells
 *   - CELL_MAPPING       — per-category IPCR data mapped to specific cells
 */

const META_DATA_MAPPING = [
  { key: "name", cell: "A13", format: "{{val.upper}}" },
  { key: "name", cell: "A6", format: "I, {{val}}, Instructor III of the Laguna State Polytechnic University, commit to deliver and agree to be rated on the attainment of the" },
  { key: "department", cell: "A14", format: "{{val.upper}}" }
];

const CELL_MAPPING = {
  syllabus:     { target: "B19", accomplished: "C19", Q: "F19", E: "G19", T: "H19", rating: "I19", dateCell: "D19", folderLink: "J19" },
  courseGuide:  { target: "B20", accomplished: "C20", Q: "F20", E: "G20", T: "H20", rating: "I20", dateCell: "D20", folderLink: "J20" },
  slm:          { target: "B21", accomplished: "C21", Q: "F21", E: "G21", T: "H21", rating: "I21", dateCell: "D21", folderLink: "J21" },
  tos:          { target: "B30", accomplished: "C30", Q: "F30", E: "G30", T: "H30", rating: "I30", dateCell: "D30", folderLink: "J30" },
  gradingSheet: { target: "B34", accomplished: "C34", Q: "F34", E: "G34", T: "H34", rating: "I34", dateCell: "D34", folderLink: "J34" },
};

const DB_CATEGORY_TO_KEY = {
  Syllabus: "syllabus", "Course Guide": "courseGuide", SLM: "slm", TOS: "tos", "Grading Sheet": "gradingSheet"
};

/**
 * Export IPCR data to Excel for a specific academic period.
 *
 * @param {string|number} userId
 * @param {string}        [academicYear]  - e.g. "2025-2026"
 * @param {string}        [semester]       - e.g. "1st Semester"
 */
async function exportIPCRToExcel(userId, academicYear, semester) {
  const workbook = new ExcelJS.Workbook();
  if (!fs.existsSync(TEMPLATE_PATH)) throw new Error(`Template not found at ${TEMPLATE_PATH}`);
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  const worksheet = workbook.getWorksheet("IPCR") || workbook.worksheets[0];

  const uid = parseInt(userId, 10) || userId;

  // Resolve active config if no year/semester provided
  let activeYear = academicYear;
  let activeSem  = semester;
  if (!activeYear || !activeSem) {
    const config = await new Promise((resolve) => {
      db.get(
        `SELECT academic_year, semester FROM semester_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1`,
        (err, row) => resolve(row || { academic_year: "2025-2026", semester: "1st Semester" })
      );
    });
    activeYear = activeYear || config.academic_year;
    activeSem  = activeSem  || config.semester;
  }

  // 2. FETCH USER DETAILS (prefer user_profiles then users)
  const user = await new Promise((resolve, reject) => {
    db.get(
      `SELECT u.*, COALESCE(up.name, u.name) as display_name,
              COALESCE(up.department, u.department) as display_department
       FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ?`,
      [uid],
      (err, row) => {
        if (err) reject(err); else resolve(row);
      }
    );
  });

  // 3. FETCH IPCR RECORDS (scoped to year + semester)
  const rows = await new Promise((resolve, reject) => {
    db.all(
      `SELECT category, target, accomplished, q_score, e_score, t_score, rating,
              submission_date, start_date, end_date, folder_link
       FROM ipcr_records
       WHERE user_id = ? AND (academic_year = ? OR academic_year IS NULL OR academic_year = '')
       AND (semester = ? OR semester IS NULL OR semester = '')`,
      [uid, activeYear, activeSem],
      (err, rows) => { if (err) reject(err); else resolve(rows); }
    );
  });

  // 4. FILL CUSTOM META DATA — only insert values, do NOT change formatting
  if (user) {
    const metaUser = { name: user.display_name || user.name, department: user.display_department || user.department };
    META_DATA_MAPPING.forEach(item => {
      const dbValue = (metaUser[item.key] || "").toString();
      let finalString = item.format;
      finalString = finalString.replace("{{val.upper}}", dbValue.toUpperCase());
      finalString = finalString.replace("{{val}}", dbValue);
      worksheet.getCell(item.cell).value = finalString;
    });
  }

  // 5. FILL CATEGORY DATA — only insert values, do NOT change formatting
  const byKey = {};
  rows.forEach((r) => {
    const key = DB_CATEGORY_TO_KEY[r.category];
    if (key) byKey[key] = r;
  });

  Object.keys(CELL_MAPPING).forEach((key) => {
    const map = CELL_MAPPING[key];
    const r = byKey[key];

    const target = r?.target != null ? Number(r.target) : Number(DefaultTarget[key] || 0);
    const accomplished = r?.accomplished != null ? Number(r.accomplished) : 0;
    const computed = computeCategory(key, accomplished, target);

    worksheet.getCell(map.target).value = target;
    worksheet.getCell(map.accomplished).value = accomplished;
    worksheet.getCell(map.Q).value = r?.q_score != null ? Number(r.q_score) : computed.Q;
    worksheet.getCell(map.E).value = r?.e_score != null ? Number(r.e_score) : computed.E;
    worksheet.getCell(map.T).value = r?.t_score != null ? Number(r.t_score) : computed.T;
    worksheet.getCell(map.rating).value = r?.rating != null ? Number(r.rating) : computed.rating;

    // Fill start/end date into column D (use start_date, fallback to end_date)
    if (map.dateCell) {
      const dateVal = r?.start_date || r?.end_date || r?.submission_date || "";
      if (dateVal) {
        worksheet.getCell(map.dateCell).value = dateVal;
      }
    }

    // Fill Google Drive folder link into column J — value only, no formatting changes
    if (map.folderLink && r?.folder_link) {
      worksheet.getCell(map.folderLink).value = r.folder_link;
    }
  });

  return await workbook.xlsx.writeBuffer();
}

module.exports = { exportIPCRToExcel };