const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const db = require("../database");
const { computeCategory } = require("../ipcrCalculator");
const DefaultTarget = require("../../shared/defaultTarget.json");

const TEMPLATE_PATH = path.resolve(__dirname, "Template.xlsx");

// Keep consistent with backend/saveIPCR.js and backend/server.js defaults
const DEFAULT_ACADEMIC_YEAR = "2023-2024";
const DEFAULT_SEMESTER = "1st";

// Keep consistent with frontend defaults shown on the dashboard for a fresh user.
// These are used when a category has no ipcr_records row yet (e.g. 0 detected files).
const DEFAULT_EXPORT_TARGETS = {
  syllabus: DefaultTarget.syllabus,
  courseGuide: DefaultTarget.courseGuide,
  slm: DefaultTarget.slm,
  gradingSheet: DefaultTarget.gradingSheet,
  tos: DefaultTarget.tos,
};

const CELL_MAPPING = {
  syllabus: {
    target: "B19",
    accomplished: "C19",
    Q: "D19",
    E: "E19",
    T: "F19",
    rating: "G19",
  },

  courseGuide: {
    target: "B20",
    accomplished: "C20",
    Q: "D20",
    E: "E20",
    T: "F20",
    rating: "G20",
  },

  slm: {
    target: "B21",
    accomplished: "C21",
    Q: "D21",
    E: "E21",
    T: "F21",
    rating: "G21",
  },

  tos: {
    target: "B30",
    accomplished: "C30",
    Q: "D30",
    E: "E30",
    T: "F30",
    rating: "G30",
  },

  gradingSheet: {
    target: "B34",
    accomplished: "C34",
    Q: "D34",
    E: "E34",
    T: "F34",
    rating: "G34",
  },
};

// DB display name -> internal key used by CELL_MAPPING
const DB_CATEGORY_TO_KEY = {
  Syllabus: "syllabus",
  "Course Guide": "courseGuide",
  SLM: "slm",
  TOS: "tos",
  "Grading Sheet": "gradingSheet",
};

async function exportIPCRToExcel(userId) {
  const workbook = new ExcelJS.Workbook();

  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template not found at ${TEMPLATE_PATH}`);
  }

  await workbook.xlsx.readFile(TEMPLATE_PATH);

  const worksheet = workbook.getWorksheet("IPCR") || workbook.worksheets[0];

  const uid = parseInt(userId, 10) || userId;

  const rows = await new Promise((resolve, reject) => {
    db.all(
      `
      SELECT category,
             target,
             accomplished,
             q_score,
             e_score,
             t_score,
             rating
      FROM ipcr_records
      WHERE user_id = ?
        AND (academic_year = ? OR academic_year IS NULL OR academic_year = '')
        AND (semester = ? OR semester IS NULL OR semester = '')
    `,
      [uid, DEFAULT_ACADEMIC_YEAR, DEFAULT_SEMESTER],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      },
    );
  });

  // Build a best-effort lookup by internal key (syllabus/courseGuide/...)
  const byKey = {};
  rows.forEach((r) => {
    const key = DB_CATEGORY_TO_KEY[r.category];
    if (!key) return;

    // Prefer a row that has a meaningful rating (typically from saveIPCR).
    const hasRating = r.rating != null && Number(r.rating) > 0;
    if (!byKey[key] || hasRating) byKey[key] = r;
  });

  // Always write all categories to the template, even if nothing was detected/uploaded.
  Object.keys(CELL_MAPPING).forEach((key) => {
    const map = CELL_MAPPING[key];
    const r = byKey[key];

    const target =
      r?.target != null
        ? Number(r.target)
        : Number(DEFAULT_EXPORT_TARGETS[key] || 0);
    const accomplished = r?.accomplished != null ? Number(r.accomplished) : 0;

    // If the DB row doesn't exist yet, compute an "expected" rating from accomplished=0.
    // We keep date blank by not creating/updating DB rows during export.
    const computed = computeCategory(key, accomplished, target);

    worksheet.getCell(map.target).value = target;
    worksheet.getCell(map.accomplished).value = accomplished;

    worksheet.getCell(map.Q).value =
      r?.q_score != null ? Number(r.q_score) : computed.Q;
    worksheet.getCell(map.E).value =
      r?.e_score != null ? Number(r.e_score) : computed.E;
    worksheet.getCell(map.T).value =
      r?.t_score != null ? Number(r.t_score) : computed.T;

    worksheet.getCell(map.rating).value =
      r?.rating != null ? Number(r.rating) : computed.rating;
  });

  return await workbook.xlsx.writeBuffer();
}

module.exports = { exportIPCRToExcel };
