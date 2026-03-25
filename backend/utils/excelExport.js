const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const db = require("../database");
const { computeCategory } = require("../ipcrCalculator");

const TEMPLATE_PATH = path.resolve(__dirname, "Template.xlsx");

/**
 * HELPER: Generates cell addresses for a row to avoid repetition.
 * Columns: Target(B), Acc(C), Date(D), SubDate(E), Q(F), E(G), T(H), Rating(I), Link(J)
 */
const mapRow = (row, dateType = "end") => ({
  target: `B${row}`,
  accomplished: `C${row}`,
  dateCell: `D${row}`,
  submissionDate: `E${row}`,
  Q: `F${row}`,
  E: `G${row}`,
  T: `H${row}`,
  rating: `I${row}`,
  folderLink: `J${row}`,
  dateType: dateType // "start" or "end"
});

/**
 * META DATA MAPPING
 */
const META_DATA_MAPPING = [
  { key: "name", cell: "A13", format: "{{val.upper}}" },
  {
    key: "name",
    cell: "A6",
    format: "I, {{val}}, Instructor III of the Laguna State Polytechnic University, commit to deliver and agree to be rated on the attainment of the",
  },
  { key: "department", cell: "A14", format: "{{val.upper}}" },
];

/**
 * CELL MAPPING - Organized by row number
 */
const CELL_MAPPING = {
  syllabus: mapRow(19, "start"),
  courseGuide: mapRow(20, "start"),
  slm: mapRow(21, "start"),
  attendanceSheet: mapRow(24, "end"),
  classRecord: mapRow(25, "end"),
  evaluationOfTeachingEffectiveness: mapRow(27, "end"),
  classroomObservation: mapRow(28, "end"),
  tos: mapRow(30, "end"),
  testQuestions: mapRow(31, "end"),
  answerKeys: mapRow(32, "end"),
  gradingSheet: mapRow(34, "end"),
  facultyAndStudentsSeekAdvices: mapRow(36, "end"),
  accomplishmentReport: mapRow(38, "end"),
  randdProposal: mapRow(41, "end"),
  researchImplemented: mapRow(42, "end"),
  researchPresented: mapRow(43, "end"),
  researchPublished: mapRow(44, "end"),
  intellectualPropertyRights: mapRow(45, "end"),
  researchUtilizedDeveloped: mapRow(46, "end"),
  numberOfCitations: mapRow(47, "end"),
  extentionProposal: mapRow(50, "end"),
  personsTrained: mapRow(51, "end"),
  personServiceRating: mapRow(52, "end"),
  personGivenTraining: mapRow(53, "end"),
  technicalAdvice: mapRow(54, "end"),
  accomplishmentReportSupport: mapRow(57, "end"),
  attendanceFlagCeremony: mapRow(59, "end"),
  attendanceFlagLowering: mapRow(61, "end"),
  attendanceHealthAndWellnessProgram: mapRow(63, "end"),
  attendanceSchoolCelebrations: mapRow(65, "end"),
  trainingSeminarConferenceCertificate: mapRow(67, "end"),
  atttendanceFacultyMeeting: mapRow(69, "end"),
  attendanceISOAndRelatedActivities: mapRow(71, "end"),
  attendaceSpiritualActivities: mapRow(73, "end"),
};

const DB_CATEGORY_TO_KEY = {
  Syllabus: "syllabus",
  "Course Guide": "courseGuide",
  SLM: "slm",
  TOS: "tos",
  "Grading Sheet": "gradingSheet",
  "Attendance Sheet": "attendanceSheet",
  "Class Record": "classRecord",
  "Evaluation of Teaching Effectiveness": "evaluationOfTeachingEffectiveness",
  "Classroom Observation": "classroomObservation",
  "Test Questions": "testQuestions",
  "Answer Keys": "answerKeys",
  "Faculty and Students Seek Advices": "facultyAndStudentsSeekAdvices",
  "Accomplishment Report": "accomplishmentReport",
  "R&D Proposal": "randdProposal",
  "Research Implemented": "researchImplemented",
  "Research Presented": "researchPresented",
  "Research Published": "researchPublished",
  "Intellectual Property Rights": "intellectualPropertyRights",
  "Research Utilized/Developed": "researchUtilizedDeveloped",
  "Number of Citations": "numberOfCitations",
  "Extension Proposal": "extentionProposal",
  "Persons Trained": "personsTrained",
  "Person Service Rating": "personServiceRating",
  "Person Given Training": "personGivenTraining",
  "Technical Advice": "technicalAdvice",
  "Accomplishment Report Support": "accomplishmentReportSupport",
  "Attendance Flag Ceremony": "attendanceFlagCeremony",
  "Attendance Flag Lowering": "attendanceFlagLowering",
  "Attendance Health and Wellness Program": "attendanceHealthAndWellnessProgram",
  "Attendance School Celebrations": "attendanceSchoolCelebrations",
  "Training/Seminar/Conference Certificate": "trainingSeminarConferenceCertificate",
  "Attendance Faculty Meeting": "atttendanceFacultyMeeting",
  "Attendance ISO and Related Activities": "attendanceISOAndRelatedActivities",
  "Attendance Spiritual Activities": "attendaceSpiritualActivities",
};

async function exportIPCRToExcel(userId, academicYear, semester) {
  const workbook = new ExcelJS.Workbook();
  if (!fs.existsSync(TEMPLATE_PATH)) throw new Error(`Template not found at ${TEMPLATE_PATH}`);
  
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  const worksheet = workbook.getWorksheet("IPCR") || workbook.worksheets[0];

  const uid = parseInt(userId, 10) || userId;

  // 1. FETCH SEMESTER CONFIG (Fallback for global dates)
  const config = await new Promise((resolve) => {
    db.get(
      `SELECT academic_year, semester, start_date, end_date FROM semester_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1`,
      (err, row) => resolve(row || { academic_year: "2025-2026", semester: "1st Semester" })
    );
  });

  const activeYear = academicYear || config.academic_year;
  const activeSem = semester || config.semester;

  // 2. FETCH DATA IN PARALLEL
  const [user, records, userTargetRow] = await Promise.all([
    new Promise(res => db.get(`SELECT u.*, COALESCE(up.name, u.name) as display_name, COALESCE(up.department, u.department) as display_department FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?`, [uid], (err, row) => res(row))),
    new Promise(res => db.all(`SELECT * FROM ipcr_records WHERE user_id = ? AND academic_year = ? AND semester = ?`, [uid, activeYear, activeSem], (err, rows) => res(rows || []))),
    new Promise(res => db.get(`SELECT * FROM user_targets WHERE user_id = ? AND academic_year = ? AND semester = ?`, [uid, activeYear, activeSem], (err, row) => res(row)))
  ]);

  // Index records by key
  const recordsByKey = {};
  records.forEach(r => {
    const key = DB_CATEGORY_TO_KEY[r.category];
    if (key) recordsByKey[key] = r;
  });

  // 3. SET METADATA
  if (user) {
    const metaUser = {
      name: user.display_name || user.name,
      department: user.display_department || user.department,
    };
    META_DATA_MAPPING.forEach((item) => {
      const dbValue = (metaUser[item.key] || "").toString();
      let finalString = item.format.replace("{{val.upper}}", dbValue.toUpperCase()).replace("{{val}}", dbValue);
      worksheet.getCell(item.cell).value = finalString;
    });
  }

  // 4. POPULATE ROWS
  Object.keys(CELL_MAPPING).forEach((key) => {
    const map = CELL_MAPPING[key];
    const r = recordsByKey[key];

    // TARGET LOGIC: DB Record -> user_targets table -> Hard Default (5)
    // Converts camelCase to snake_case to match user_targets columns
    const dbColumnName = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const target = r?.target ?? userTargetRow?.[dbColumnName] ?? 5;
    
    const accomplished = r?.accomplished ?? 0;
    const computed = computeCategory(key, accomplished, target);

    worksheet.getCell(map.target).value = Number(target);
    worksheet.getCell(map.accomplished).value = Number(accomplished);
    worksheet.getCell(map.Q).value = r?.q_score ?? computed.Q;
    worksheet.getCell(map.E).value = r?.e_score ?? computed.E;
    worksheet.getCell(map.T).value = r?.t_score ?? computed.T;
    worksheet.getCell(map.rating).value = r?.rating ?? computed.rating;

    // DATE LOGIC: DB Record -> Global Semester Config -> Empty
    if (map.dateCell) {
      const recordDate = map.dateType === "start" ? r?.start_date : r?.end_date;
      const globalDate = map.dateType === "start" ? config.start_date : config.end_date;
      worksheet.getCell(map.dateCell).value = recordDate || globalDate || "";
    }

    if (map.submissionDate) worksheet.getCell(map.submissionDate).value = r?.submission_date || "";
    if (map.folderLink) worksheet.getCell(map.folderLink).value = r?.folder_link || "";
  });

  // 5. FINAL RATING FORMULA
  worksheet.getCell("H85").value = {
    formula: 'IFERROR((AVERAGE(I19:I22,I24:I25,I27:I28,I30:I32,I34,I36,I38))*INS+(AVERAGE(I41:I47))*RES+(AVERAGE(I50:I54))*EXT+(AVERAGE(I57,I59,I61,I63,I65,I67,I69,I71,I73))*SUPT+IFERROR((AVERAGE(I76:I83))*DGT,0),"")',
  };
  worksheet.getCell("H85").result = null;

  return await workbook.xlsx.writeBuffer();
}

module.exports = { exportIPCRToExcel };