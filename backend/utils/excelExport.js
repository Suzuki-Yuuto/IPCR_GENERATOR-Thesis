const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const db = require("../database");
const { computeCategory } = require("../ipcrCalculator");
const DefaultTarget = require("../../shared/defaultTarget.json");

const TEMPLATE_PATH = path.resolve(__dirname, "Template.xlsx");

/**
 * 1. EASY CONFIGURATION AREA
 * * - dateCell: The cell in the Excel template for the primary date (usually Column D).
 * - dateType: Choose "start" or "end" to decide which DB column to pull into the dateCell.
 * - submissionDate: The cell for the actual date the file was submitted (assigned to Column E).
 */

const META_DATA_MAPPING = [
  { key: "name", cell: "A13", format: "{{val.upper}}" },
  { key: "name", cell: "A6", format: "I, {{val}}, Instructor III of the Laguna State Polytechnic University, commit to deliver and agree to be rated on the attainment of the" },
  { key: "department", cell: "A14", format: "{{val.upper}}" }
];

const CELL_MAPPING = {
  syllabus:                             { target: "B19", accomplished: "C19", Q: "F19", E: "G19", T: "H19", rating: "I19", dateCell: "D19", dateType: "start", submissionDate: "E19", folderLink: "J19" },
  courseGuide:                          { target: "B20", accomplished: "C20", Q: "F20", E: "G20", T: "H20", rating: "I20", dateCell: "D20", dateType: "start", submissionDate: "E20", folderLink: "J20" },
  slm:                                  { target: "B21", accomplished: "C21", Q: "F21", E: "G21", T: "H21", rating: "I21", dateCell: "D21", dateType: "start", submissionDate: "E21", folderLink: "J21" },
  tos:                                  { target: "B30", accomplished: "C30", Q: "F30", E: "G30", T: "H30", rating: "I30", dateCell: "D30", dateType: "end", submissionDate: "E30", folderLink: "J30" },
  gradingSheet:                         { target: "B34", accomplished: "C34", Q: "F34", E: "G34", T: "H34", rating: "I34", dateCell: "D34", dateType: "end", submissionDate: "E34", folderLink: "J34" },
  attendanceSheet:                      { target: "B24", accomplished: "C24", Q: "F24", E: "G24", T: "H24", rating: "I24", dateCell: "D24", dateType: "end", submissionDate: "E24", folderLink: "J24" },
  classRecord:                          { target: "B25", accomplished: "C25", Q: "F25", E: "G25", T: "H25", rating: "I25", dateCell: "D25", dateType: "end", submissionDate: "E25", folderLink: "J25" },
  evaluationOfTeachingEffectiveness:    { target: "B27", accomplished: "C27", Q: "F27", E: "G27", T: "H27", rating: "I27", dateCell: "D27", dateType: "end", submissionDate: "E27", folderLink: "J27" },
  classroomObservation:                 { target: "B28", accomplished: "C28", Q: "F28", E: "G28", T: "H28", rating: "I28", dateCell: "D28", dateType: "end", submissionDate: "E28", folderLink: "J28" },
  testQuestions:                        { target: "B31", accomplished: "C31", Q: "F31", E: "G31", T: "H31", rating: "I31", dateCell: "D31", dateType: "end", submissionDate: "E31", folderLink: "J31" },
  answerKeys:                           { target: "B32", accomplished: "C32", Q: "F32", E: "G32", T: "H32", rating: "I32", dateCell: "D32", dateType: "end", submissionDate: "E32", folderLink: "J32" },
  facultyAndStudentsSeekAdvices:        { target: "B36", accomplished: "C36", Q: "F36", E: "G36", T: "H36", rating: "I36", dateCell: "D36", dateType: "end", submissionDate: "E36", folderLink: "J36" },
  accomplishmentReport:                 { target: "B38", accomplished: "C38", Q: "F38", E: "G38", T: "H38", rating: "I38", dateCell: "D38", dateType: "end", submissionDate: "E38", folderLink: "J38" },
  randdProposal:                        { target: "B41", accomplished: "C41", Q: "F41", E: "G41", T: "H41", rating: "I41", dateCell: "D41", dateType: "end", submissionDate: "E41", folderLink: "J41" },
  researchImplemented:                  { target: "B42", accomplished: "C42", Q: "F42", E: "G42", T: "H42", rating: "I42", dateCell: "D42", dateType: "end", submissionDate: "E42", folderLink: "J42" },
  researchPresented:                    { target: "B43", accomplished: "C43", Q: "F43", E: "G43", T: "H43", rating: "I43", dateCell: "D43", dateType: "end", submissionDate: "E43", folderLink: "J43" },
  researchPublished:                    { target: "B44", accomplished: "C44", Q: "F44", E: "G44", T: "H44", rating: "I44", dateCell: "D44", dateType: "end", submissionDate: "E44", folderLink: "J44" },
  intellectualPropertyRights:           { target: "B45", accomplished: "C45", Q: "F45", E: "G45", T: "H45", rating: "I45", dateCell: "D45", dateType: "end", submissionDate: "E45", folderLink: "J45" },
  researchUtilizedDeveloped:            { target: "B46", accomplished: "C46", Q: "F46", E: "G46", T: "H46", rating: "I46", dateCell: "D46", dateType: "end", submissionDate: "E46", folderLink: "J46" },
  numberOfCitations:                    { target: "B47", accomplished: "C47", Q: "F47", E: "G47", T: "H47", rating: "I47", dateCell: "D47", dateType: "end", submissionDate: "E47", folderLink: "J47" },
  extentionProposal:                    { target: "B50", accomplished: "C50", Q: "F50", E: "G50", T: "H50", rating: "I50", dateCell: "D50", dateType: "end", submissionDate: "E50", folderLink: "J50" },
  personsTrained:                       { target: "B51", accomplished: "C51", Q: "F51", E: "G51", T: "H51", rating: "I51", dateCell: "D51", dateType: "end", submissionDate: "E51", folderLink: "J51" },
  personServiceRating:                  { target: "B52", accomplished: "C52", Q: "F52", E: "G52", T: "H52", rating: "I52", dateCell: "D52", dateType: "end", submissionDate: "E52", folderLink: "J52" },
  personGivenTraining:                  { target: "B53", accomplished: "C53", Q: "F53", E: "G53", T: "H53", rating: "I53", dateCell: "D53", dateType: "end", submissionDate: "E53", folderLink: "J53" },
  technicalAdvice:                      { target: "B54", accomplished: "C54", Q: "F54", E: "G54", T: "H54", rating: "I54", dateCell: "D54", dateType: "end", submissionDate: "E54", folderLink: "J54" },
  accomplishmentReportSupport:          { target: "B57", accomplished: "C57", Q: "F57", E: "G57", T: "H57", rating: "I57", dateCell: "D57", dateType: "end", submissionDate: "E57", folderLink: "J57" },
  attendanceFlagCeremony:               { target: "B59", accomplished: "C59", Q: "F59", E: "G59", T: "H59", rating: "I59", dateCell: "D59", dateType: "end", submissionDate: "E59", folderLink: "J59" },
  attendanceFlagLowering:               { target: "B61", accomplished: "C61", Q: "F61", E: "G61", T: "H61", rating: "I61", dateCell: "D61", dateType: "end", submissionDate: "E61", folderLink: "J61" },
  attendanceHealthAndWellnessProgram:   { target: "B63", accomplished: "C63", Q: "F63", E: "G63", T: "H63", rating: "I63", dateCell: "D63", dateType: "end", submissionDate: "E63", folderLink: "J63" },
  attendanceSchoolCelebrations:         { target: "B65", accomplished: "C65", Q: "F65", E: "G65", T: "H65", rating: "I65", dateCell: "D65", dateType: "end", submissionDate: "E65", folderLink: "J65" },
  trainingSeminarConferenceCertificate: { target: "B67", accomplished: "C67", Q: "F67", E: "G67", T: "H67", rating: "I67", dateCell: "D67", dateType: "end", submissionDate: "E67", folderLink: "J67" },
  atttendanceFacultyMeeting:            { target: "B69", accomplished: "C69", Q: "F69", E: "G69", T: "H69", rating: "I69", dateCell: "D69", dateType: "end", submissionDate: "E69", folderLink: "J69" },
  attendanceISOAndRelatedActivities:    { target: "B71", accomplished: "C71", Q: "F71", E: "G71", T: "H71", rating: "I71", dateCell: "D71", dateType: "end", submissionDate: "E71", folderLink: "J71" },
  attendaceSpiritualActivities:         { target: "B73", accomplished: "C73", Q: "F73", E: "G73", T: "H73", rating: "I73", dateCell: "D73", dateType: "end", submissionDate: "E73", folderLink: "J73" },
};

const DB_CATEGORY_TO_KEY = {
  Syllabus: "syllabus", "Course Guide": "courseGuide", SLM: "slm", TOS: "tos", "Grading Sheet": "gradingSheet"
};

/**
 * Export IPCR data to Excel for a specific academic period.
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

  // 2. FETCH USER DETAILS
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

  // 3. FETCH IPCR RECORDS
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

  // 4. FILL CUSTOM META DATA
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

  // 5. FILL CATEGORY DATA
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

    // --- LOGIC: PER-CATEGORY PRIMARY DATE (Start vs End) ---
    if (map.dateCell) {
      // If dateType is "end", use end_date. Otherwise, default to start_date.
      const selectedDate = map.dateType === "end" ? r?.end_date : r?.start_date;
      if (selectedDate) {
        worksheet.getCell(map.dateCell).value = selectedDate;
      }
    }

    // --- LOGIC: SUBMISSION DATE ---
    if (map.submissionDate && r?.submission_date) {
      worksheet.getCell(map.submissionDate).value = r.submission_date;
    }

    // --- LOGIC: FOLDER LINK ---
    if (map.folderLink && r?.folder_link) {
      worksheet.getCell(map.folderLink).value = r.folder_link;
    }
  });

  return await workbook.xlsx.writeBuffer();
}

module.exports = { exportIPCRToExcel };