const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Always resolve template from THIS file's directory
 */
const TEMPLATE_PATH = path.resolve(__dirname, 'Template.xlsx');

/**
 * EXACT IPCR CELL MAPPING (based on your PDF)
 * Columns:
 * B = Target
 * C = Accomplished
 * D = Q (QL/E)
 * E = E
 * F = T
 * G = Average Rating
 */
const CELL_MAPPING = {
  syllabus: {
    target: 'B19',
    accomplished: 'C19',
    Q: 'D19',
    E: 'E19',
    T: 'F19',
    rating: 'G19'
  },
  courseGuide: {
    target: 'B20',
    accomplished: 'C20',
    Q: 'D20',
    E: 'E20',
    T: 'F20',
    rating: 'G20'
  },
  slm: {
    target: 'B21',
    accomplished: 'C21',
    Q: 'D21',
    E: 'E21',
    T: 'F21',
    rating: 'G21'
  },
  tos: {
    target: 'B30',
    accomplished: 'C30',
    Q: 'D30',
    E: 'E30',
    T: 'F30',
    rating: 'G30'
  },
  gradingSheet: {
    target: 'B34',
    accomplished: 'C34',
    Q: 'D34',
    E: 'E34',
    T: 'F34',
    rating: 'G34'
  }
};

/**
 * CATEGORY TARGETS
 * (fallback if OCR does not provide target)
 */
const DEFAULT_TARGETS = {
  syllabus: 8,
  courseGuide: 6,
  slm: 10,
  tos: 5,
  gradingSheet: 5
};

/**
 * CATEGORY WEIGHTS
 */
const WEIGHTS = {
  syllabus: 0.5,
  courseGuide: 0.5,
  slm: 0.5,
  tos: 0.5,
  gradingSheet: 0.5
};

/**
 * Convert accomplished vs target → IPCR score (1–5)
 */
function autoRate(accomplished, target) {
  if (!target || target === 0) return 0;
  const ratio = accomplished / target;
  if (ratio >= 1.0) return 5;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.4) return 2;
  return 1;
}

/**
 * IPCR math (matches your PDF)
 */
function calculateRowRating(Q, E, T) {
  return Number(((Q + E + T) / 3).toFixed(2));
}

function calculateOverallRating(rows) {
  return Number(
    rows.reduce((sum, r) => sum + r.rating * r.weight, 0).toFixed(2)
  );
}

/**
 * MAIN EXPORT FUNCTION
 * OCR RESULTS SHAPE:
 * {
 *   syllabus: { target: 8, accomplished: 6 },
 *   courseGuide: { accomplished: 5 },
 *   slm: { target: 10, accomplished: 12 }
 * }
 */
async function exportIPCRToExcel(ocrResults) {
  const workbook = new ExcelJS.Workbook();

  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template not found at: ${TEMPLATE_PATH}`);
  }

  await workbook.xlsx.readFile(TEMPLATE_PATH);
  const worksheet = workbook.getWorksheet('IPCR') || workbook.worksheets[0];

  const computedRows = [];

  Object.entries(ocrResults).forEach(([key, ocrData]) => {
  const map = CELL_MAPPING[key];
  if (!map) return;

  // ✅ TARGET IS FIXED (SYSTEM-CONTROLLED)
  const target = Number(DEFAULT_TARGETS[key]) || 0;

  // ✅ ACCOMPLISHED COMES FROM OCR
  const accomplished = Number(ocrData?.accomplished) || 0;

  const weight = WEIGHTS[key] ?? 0;

  const score = autoRate(accomplished, target);
  const rating = calculateRowRating(score, score, score);

  worksheet.getCell(map.target).value = target;
  worksheet.getCell(map.accomplished).value = accomplished;
  worksheet.getCell(map.Q).value = score;
  worksheet.getCell(map.E).value = score;
  worksheet.getCell(map.T).value = score;
  worksheet.getCell(map.rating).value = rating;

  computedRows.push({ rating, weight });
});

  /**
   * FINAL NUMERICAL RATING (same place as PDF)
   */
  worksheet.getCell('E40').value = calculateOverallRating(computedRows);

  return await workbook.xlsx.writeBuffer();
}

/**
 * EXAMPLE OCR INPUT (REMOVE IN PRODUCTION)
 */
const ocrResults = {
  syllabus: { target: 4, accomplished: 2 },
  courseGuide: { target: 2, accomplished: 2 },
  slm: { target: 10, accomplished: 12 },
  tos: { accomplished: 5 },
  gradingSheet: { accomplished: 4 }
};

module.exports = { exportIPCRToExcel };