const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const db = require("../database");
const { computeCategory } = require("../ipcrCalculator");
const DefaultTarget = require("../../shared/defaultTarget.json");

const TEMPLATE_PATH = path.resolve(__dirname, "Template.xlsx");
const DEFAULT_ACADEMIC_YEAR = "2023-2024";

/**
 * 1. EASY CONFIGURATION AREA
 * You can now use:
 * {{val}}       -> Raw data from DB
 * {{val.upper}} -> Capslock version of the data
 */
const META_DATA_MAPPING = [
  { key: "name", cell: "A13", format: "{{val.upper}}" },
  { key: "name", cell: "A6", format: "I,{{val}},- Instructor III of the Laguna State Polytechnic University,  commit to deliver and agree to be rated on the attainment of the" },
];

const CELL_MAPPING = {
  syllabus: { target: "B19", accomplished: "C19", Q: "D19", E: "E19", T: "F19", rating: "G19" },
  courseGuide: { target: "B20", accomplished: "C20", Q: "D20", E: "E20", T: "F20", rating: "G20" },
  slm: { target: "B21", accomplished: "C21", Q: "D21", E: "E21", T: "F21", rating: "G21" },
  tos: { target: "B30", accomplished: "C30", Q: "D30", E: "E30", T: "F30", rating: "G30" },
  gradingSheet: { target: "B34", accomplished: "C34", Q: "D34", E: "E34", T: "F34", rating: "G34" },
};

const DB_CATEGORY_TO_KEY = {
  Syllabus: "syllabus", "Course Guide": "courseGuide", SLM: "slm", TOS: "tos", "Grading Sheet": "gradingSheet"
};

async function exportIPCRToExcel(userId) {
  const workbook = new ExcelJS.Workbook();
  if (!fs.existsSync(TEMPLATE_PATH)) throw new Error(`Template not found`);
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  const worksheet = workbook.getWorksheet("IPCR") || workbook.worksheets[0];

  const uid = parseInt(userId, 10) || userId;

  // 2. FETCH USER DETAILS
  const user = await new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE id = ?", [uid], (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });

  // 3. FETCH IPCR RECORDS
  const rows = await new Promise((resolve, reject) => {
    db.all(
      `SELECT category, target, accomplished, q_score, e_score, t_score, rating 
       FROM ipcr_records 
       WHERE user_id = ? AND (academic_year = ? OR academic_year IS NULL OR academic_year = '')`,
      [uid, DEFAULT_ACADEMIC_YEAR],
      (err, rows) => { if (err) reject(err); else resolve(rows); }
    );
  });

  // 4. FILL CUSTOM META DATA (With Upper Case Support)
  if (user) {
    META_DATA_MAPPING.forEach(item => {
      const dbValue = (user[item.key] || "").toString();
      let finalString = item.format;

      // Handle {{val.upper}} for Capslock
      if (finalString.includes("{{val.upper}}")) {
        finalString = finalString.replace("{{val.upper}}", dbValue.toUpperCase());
      } 
      
      // Handle standard {{val}}
      finalString = finalString.replace("{{val}}", dbValue);

      worksheet.getCell(item.cell).value = finalString;
    });
  }

  // 5. FILL CATEGORY DATA (Standard Logic)
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
  });

  return await workbook.xlsx.writeBuffer();
}

module.exports = { exportIPCRToExcel };