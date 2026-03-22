// Load environment variables
require("dotenv").config();

const DefaultTarget = require("../shared/defaultTarget.json");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs-extra");
const path = require("path");

const db = require("./database");
const authRoutes = require("./routes/auth");
const GoogleDriveService = require("./utils/googleDrive");
const { saveIPCR } = require("./saveIPCR");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());
fs.ensureDirSync("uploads");

// Routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

// ──────────────────────────────────────────────────────────────────────────────
// CATEGORY MAP
// ──────────────────────────────────────────────────────────────────────────────
const categoryMap = {
  syllabus: "Syllabus",
  courseGuide: "Course Guide",
  slm: "SLM",
  gradingSheet: "Grading Sheet",
  tos: "TOS",
  attendanceSheet: "Attendance Sheet",
  classRecord: "Class Record",
  evaluationOfTeachingEffectiveness: "Evaluation of Teaching Effectiveness",
  classroomObservation: "Classroom Observation",
  testQuestions: "Test Questions",
  answerKeys: "Answer Keys",
  facultyAndStudentsSeekAdvices: "Faculty and Students Seek Advices",
  accomplishmentReport: "Accomplishment Report",
  randdProposal: "R&D Proposal",
  researchImplemented: "Research Implemented",
  researchPresented: "Research Presented",
  researchPublished: "Research Published",
  intellectualPropertyRights: "Intellectual Property Rights",
  researchUtilizedDeveloped: "Research Utilized/Developed",
  numberOfCitations: "Number of Citations",
  extentionProposal: "Extension Proposal",
  personsTrained: "Persons Trained",
  personServiceRating: "Person Service Rating",
  personGivenTraining: "Person Given Training",
  technicalAdvice: "Technical Advice",
  attendanceFlagCeremony: "Attendance Flag Ceremony",
  attendanceFlagLowering: "Attendance Flag Lowering",
  attendanceHealthAndWellnessProgram: "Attendance Health and Wellness Program",
  attendanceSchoolCelebrations: "Attendance School Celebrations",
  trainingSeminarConferenceCertificate: "Training/Seminar/Conference Certificate",
  atttendanceFacultyMeeting: "Attendance Faculty Meeting",
  attendanceISOAndRelatedActivities: "Attendance ISO and Related Activities",
  attendaceSpiritualActivities: "Attendance Spiritual Activities"

};

// ──────────────────────────────────────────────────────────────────────────────
// HELPER: resolve active semester config from DB
// ──────────────────────────────────────────────────────────────────────────────
function getActiveConfig() {
  return new Promise((resolve) => {
    db.get(
      `SELECT academic_year, semester, start_date, end_date FROM semester_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1`,
      (err, row) => {
        if (err || !row) {
          resolve({ academic_year: "2025-2026", semester: "1st Semester", start_date: null, end_date: null });
        } else {
          resolve(row);
        }
      }
    );
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// SEMESTER CONFIG ROUTES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/semester-config
 * Returns the current active semester configuration.
 */
app.get("/api/semester-config", (req, res) => {
  db.get(
    `SELECT * FROM semester_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1`,
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.json({ academic_year: "2025-2026", semester: "1st Semester", start_date: null, end_date: null });
      res.json(row);
    }
  );
});

/**
 * POST /api/semester-config
 * Admin saves/updates the active semester configuration.
 * Body: { academic_year, semester, start_date, end_date }
 */
app.post("/api/semester-config", (req, res) => {
  const { academic_year, semester, start_date, end_date } = req.body;

  if (!academic_year || !semester) {
    return res.status(400).json({ error: "academic_year and semester are required" });
  }

  // Deactivate all existing configs, then insert new active one
  db.run(`UPDATE semester_config SET is_active = 0`, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    db.run(
      `INSERT INTO semester_config (academic_year, semester, start_date, end_date, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [academic_year, semester, start_date || null, end_date || null],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ success: true, id: this.lastID, academic_year, semester, start_date, end_date });
      }
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// IPCR RECORDS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/ipcr/:userId
 * Optional query params: ?year=2025-2026&semester=1st+Semester
 * Falls back to active config when params are omitted.
 */
app.get("/api/ipcr/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId, 10) || req.params.userId;
  const active = await getActiveConfig();
  const academicYear = req.query.year     || active.academic_year;
  const semester     = req.query.semester || active.semester;

  const query = `
    SELECT category, target, accomplished, rating, submission_date
    FROM ipcr_records
    WHERE user_id = ? AND (academic_year = ? OR academic_year IS NULL) AND (semester = ? OR semester IS NULL)
    ORDER BY COALESCE(academic_year,'') DESC, COALESCE(semester,'') DESC
  `;

  db.all(query, [userId, academicYear, semester], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const ipcrData = {
      syllabus:     { target: DefaultTarget.syllabus,     accomplished: 0, submitted: null },
      courseGuide:  { target: DefaultTarget.courseGuide,  accomplished: 0, submitted: null },
      slm:          { target: DefaultTarget.slm,          accomplished: 0, submitted: null },
      gradingSheet: { target: DefaultTarget.gradingSheet, accomplished: 0, submitted: null },
      tos:          { target: DefaultTarget.tos,          accomplished: 0, submitted: null },
      attendanceSheet: { target: DefaultTarget.attendanceSheet, accomplished: 0, submitted: null },
      classRecord: { target: DefaultTarget.classRecord, accomplished: 0, submitted: null },
      evaluationOfTeachingEffectiveness: { target: DefaultTarget.evaluationOfTeachingEffectiveness, accomplished: 0, submitted: null },
      classroomObservation: { target: DefaultTarget.classroomObservation, accomplished: 0, submitted: null },
      testQuestions: { target: DefaultTarget.testQuestions, accomplished: 0, submitted: null },
      answerKeys: { target: DefaultTarget.answerKeys, accomplished: 0, submitted: null },
      facultyAndStudentsSeekAdvices: { target: DefaultTarget.facultyAndStudentsSeekAdvices, accomplished: 0, submitted: null },
      accomplishmentReport: { target: DefaultTarget.accomplishmentReport, accomplished: 0, submitted: null },
      randdProposal: { target: DefaultTarget.randdProposal, accomplished: 0, submitted: null },
      researchImplemented: { target: DefaultTarget.researchImplemented, accomplished: 0, submitted: null },
      researchPresented: { target: DefaultTarget.researchPresented, accomplished: 0, submitted: null },
      researchPublished: { target: DefaultTarget.researchPublished, accomplished: 0, submitted: null },
      intellectualPropertyRights: { target: DefaultTarget.intellectualPropertyRights, accomplished: 0, submitted: null },
      researchUtilizedDeveloped: { target: DefaultTarget.researchUtilizedDeveloped, accomplished: 0, submitted: null },
      numberOfCitations: { target: DefaultTarget.numberOfCitations, accomplished: 0, submitted: null },
      extentionProposal: { target: DefaultTarget.extentionProposal, accomplished: 0, submitted: null },
      personsTrained: { target: DefaultTarget.personsTrained, accomplished: 0, submitted: null },
      personServiceRating: { target: DefaultTarget.personServiceRating, accomplished: 0, submitted: null },
      personGivenTraining: { target: DefaultTarget.personGivenTraining, accomplished: 0, submitted: null },
      technicalAdvice: { target: DefaultTarget.technicalAdvice, accomplished: 0, submitted: null },
      attendanceFlagCeremony: { target: DefaultTarget.attendanceFlagCeremony, accomplished: 0, submitted: null },
      attendanceFlagLowering: { target: DefaultTarget.attendanceFlagLowering, accomplished: 0, submitted: null },
      attendanceHealthAndWellnessProgram: { target: DefaultTarget.attendanceHealthAndWellnessProgram, accomplished: 0, submitted: null },
      attendanceSchoolCelebrations: { target: DefaultTarget.attendanceSchoolCelebrations, accomplished: 0, submitted: null },
      trainingSeminarConferenceCertificate: { target: DefaultTarget.trainingSeminarConferenceCertificate, accomplished: 0, submitted: null },
      atttendanceFacultyMeeting: { target: DefaultTarget.atttendanceFacultyMeeting, accomplished: 0, submitted: null },
      attendanceISOAndRelatedActivities: { target: DefaultTarget.attendanceISOAndRelatedActivities, accomplished: 0, submitted: null },
      attendaceSpiritualActivities: { target: DefaultTarget.attendaceSpiritualActivities, accomplished: 0, submitted: null },
    };

    const byCategory = {};
    rows.forEach((row) => {
      const key = Object.keys(categoryMap).find((k) => categoryMap[k] === row.category);
      if (key) {
        const hasRating = row.rating != null && Number(row.rating) > 0;
        if (!byCategory[key] || hasRating) byCategory[key] = row;
      }
    });
    Object.entries(byCategory).forEach(([key, row]) => {
      ipcrData[key] = {
        target: row.target,
        accomplished: row.accomplished,
        submitted: row.submission_date,
        rating: row.rating != null ? Number(row.rating) : null,
      };
    });

    res.json(ipcrData);
  });
});

/**
 * POST /api/ipcr/targets
 * Body: { userId, targets, year?, semester? }
 */
app.post("/api/ipcr/targets", async (req, res) => {
  const { userId, targets, year, semester } = req.body;
  const active = await getActiveConfig();
  const academicYear = year     || active.academic_year;
  const sem          = semester || active.semester;

  Object.entries(targets).forEach(([key, value]) => {
    const category = categoryMap[key];
    const query = `
      INSERT INTO ipcr_records (user_id, category, target, accomplished, academic_year, semester)
      VALUES (?, ?, ?, 0, ?, ?)
      ON CONFLICT(user_id, category, academic_year, semester)
      DO UPDATE SET target = ?
    `;
    db.run(query, [userId, category, value, academicYear, sem, value]);
  });

  res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────────────
// DOCUMENT UPLOAD
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/documents/upload
 * Body fields: userId, tokens?, year?, semester?, facultyName?
 */
app.post("/api/documents/upload", upload.array("files"), async (req, res) => {
  try {
    const rawUserId   = req.body.userId;
    const userId      = parseInt(rawUserId, 10) || rawUserId;
    const tokens      = req.body.tokens;
    const files       = req.files;
    const facultyName = req.body.facultyName || "Faculty";

    if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });

    const active = await getActiveConfig();
    const academicYear = req.body.year     || active.academic_year;
    const semester     = req.body.semester || active.semester;

    const userTokens = tokens ? (typeof tokens === "string" ? JSON.parse(tokens) : tokens) : null;
    const results = [];

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.originalname}`);

        // ML classification
        const formData = new FormData();
        formData.append("file", fs.createReadStream(file.path), {
          filename: file.originalname,
          contentType: "application/pdf",
        });

        const mlResponse = await axios.post("http://localhost:5000/classify", formData, {
          headers: formData.getHeaders(),
          timeout: 60000,
        });
        const { category, confidence } = mlResponse.data;
        const dbCategory = categoryMap[category] || category;

        // Google Drive upload with new folder structure
        let driveResult = null;
        if (userTokens) {
          try {
            const driveService = new GoogleDriveService(userTokens);
            driveResult = await driveService.uploadFile(
              file.path,
              file.originalname,
              dbCategory,
              academicYear,
              semester,
              facultyName
            );
          } catch (err) {
            console.warn("Drive upload failed:", err.message);
          }
        }

        const driveUploaded = !!driveResult;
        const driveId   = driveUploaded ? driveResult.fileId   : Math.random().toString(36).substring(7);
        const driveLink = driveUploaded ? driveResult.webViewLink : `https://drive.google.com/file/d/${driveId}`;

        // Save document info (with year + semester)
        db.run(
          `INSERT INTO documents
           (user_id, filename, original_filename, file_size, category, confidence,
            google_drive_id, google_drive_link, academic_year, semester)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, file.filename, file.originalname, file.size, dbCategory,
           confidence, driveId, driveLink, academicYear, semester]
        );

        // Update IPCR record (scoped to year + semester)
        const row = await new Promise((resolve, reject) =>
          db.get(
            `SELECT target, accomplished FROM ipcr_records
             WHERE user_id = ? AND category = ? AND academic_year = ? AND semester = ?`,
            [userId, dbCategory, academicYear, semester],
            (err, r) => (err ? reject(err) : resolve(r))
          )
        );

        const target       = row?.target      || 0;
        const accomplished = (row?.accomplished || 0) + 1;

        await saveIPCR(userId, dbCategory, accomplished, target, academicYear, semester);

        // Store the category-specific folder link on this category's ipcr_record row
        if (driveResult && driveResult.categoryFolderLinks) {
          const catKey = dbCategory.replace(/\s+/g, '').toLowerCase();
          const folderLink = driveResult.categoryFolderLinks[catKey] || null;
          if (folderLink) {
            db.run(
              `UPDATE ipcr_records SET folder_link = ? WHERE user_id = ? AND category = ? AND academic_year = ? AND semester = ?`,
              [folderLink, userId, dbCategory, academicYear, semester]
            );
          }
        }

        results.push({ filename: file.originalname, category: dbCategory, confidence, driveLink, driveUploaded });

        await fs.remove(file.path);
      } catch (err) {
        console.error("File processing error:", err.message);
        if (fs.existsSync(file.path)) await fs.remove(file.path);
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DOCUMENTS LIST
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/documents/:userId
 * Optional query params: ?year=&semester=
 */
app.get("/api/documents/:userId", async (req, res) => {
  const { userId } = req.params;
  const active = await getActiveConfig();
  const academicYear = req.query.year     || active.academic_year;
  const semester     = req.query.semester || active.semester;

  const query = `
    SELECT id, original_filename as name, file_size as size, category,
           confidence, google_drive_link as driveLink, upload_date as uploadDate,
           academic_year, semester
    FROM documents
    WHERE user_id = ? AND academic_year = ? AND semester = ?
    ORDER BY upload_date DESC
  `;
  db.all(query, [userId, academicYear, semester], (err, rows) =>
    err ? res.status(500).json({ error: err.message }) : res.json(rows)
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/ipcr/export/:userId
 * Optional query params: ?year=&semester=
 */
app.get("/api/ipcr/export/:userId", async (req, res) => {
  try {
    const { exportIPCRToExcel } = require("./utils/excelExport");
    const active = await getActiveConfig();
    const academicYear = req.query.year     || active.academic_year;
    const semester     = req.query.semester || active.semester;

    const buffer = await exportIPCRToExcel(req.params.userId, academicYear, semester);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=IPCR_${req.params.userId}_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({ error: "Failed to generate Excel file" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// USER PROFILE ROUTES
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/profile/:userId
 * Returns locally-editable profile (falls back to users table data).
 */
app.get("/api/profile/:userId", (req, res) => {
  const userId = parseInt(req.params.userId, 10) || req.params.userId;

  // First try user_profiles, then fall back to users
  db.get(
    `SELECT up.name, up.department, up.position, up.contact_number, up.notes, up.updated_at,
            u.email, u.profile_image, u.role
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     WHERE u.id = ?`,
    [userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "User not found" });

      // If no profile row exists yet, use data from users table
      db.get(`SELECT name, department FROM users WHERE id = ?`, [userId], (err2, userRow) => {
        if (err2) return res.status(500).json({ error: err2.message });

        res.json({
          name: row.name || (userRow && userRow.name) || '',
          department: row.department || (userRow && userRow.department) || '',
          position: row.position || '',
          contact_number: row.contact_number || '',
          notes: row.notes || '',
          email: row.email || '',
          profile_image: row.profile_image || '',
          role: row.role || 'professor',
          updated_at: row.updated_at || null,
        });
      });
    }
  );
});

/**
 * PUT /api/profile/:userId
 * Upserts locally-editable profile fields.
 * Body: { name, department, position, contact_number, notes }
 */
app.put("/api/profile/:userId", (req, res) => {
  const userId = parseInt(req.params.userId, 10) || req.params.userId;
  const { name, department, position, contact_number, notes } = req.body;

  const upsertSql = `
    INSERT INTO user_profiles (user_id, name, department, position, contact_number, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      name = excluded.name,
      department = excluded.department,
      position = excluded.position,
      contact_number = excluded.contact_number,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `;

  db.run(upsertSql, [userId, name || null, department || null, position || null, contact_number || null, notes || null], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    // Also update the users table name and department so it reflects everywhere
    db.run(
      `UPDATE users SET name = COALESCE(?, name), department = COALESCE(?, department) WHERE id = ?`,
      [name || null, department || null, userId],
      (err2) => {
        if (err2) console.error("Error syncing users table:", err2.message);
        res.json({ success: true, message: "Profile updated successfully" });
      }
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/ipcr
 * Optional query params: ?year=&semester=
 */
app.get("/api/admin/ipcr", async (req, res) => {
  const active = await getActiveConfig();
  const academicYear = req.query.year     || active.academic_year;
  const semester     = req.query.semester || active.semester;

  const query = `
    SELECT
      u.id, u.name, u.department, u.email,
      COUNT(DISTINCT d.id) as document_count,
      AVG(ir.rating) as avg_rating
    FROM users u
    LEFT JOIN documents d
      ON u.id = d.user_id AND d.academic_year = ? AND d.semester = ?
    LEFT JOIN ipcr_records ir
      ON u.id = ir.user_id AND ir.academic_year = ? AND ir.semester = ?
    WHERE u.role = 'professor'
    GROUP BY u.id
  `;
  db.all(query, [academicYear, semester, academicYear, semester], (err, rows) =>
    err ? res.status(500).json({ error: err.message }) : res.json(rows)
  );
});

/**
 * GET /api/admin/faculty/:userId
 * Admin detail view for a specific faculty member.
 * Returns profile info, folder links, and documents for the selected period.
 * Optional query params: ?year=&semester=
 */
app.get("/api/admin/faculty/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId, 10) || req.params.userId;
  const active = await getActiveConfig();
  const academicYear = req.query.year     || active.academic_year;
  const semester     = req.query.semester || active.semester;

  try {
    // 1. Profile info (from user_profiles + users)
    const profile = await new Promise((resolve, reject) => {
      db.get(
        `SELECT u.id, u.email, u.profile_image, u.role,
                COALESCE(up.name, u.name) as name,
                COALESCE(up.department, u.department) as department,
                up.position, up.contact_number, up.notes
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE u.id = ?`,
        [userId],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    if (!profile) return res.status(404).json({ error: "Faculty not found" });

    // 2. Folder links — one per category row
    const folderLinkRows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT category, folder_link
         FROM ipcr_records
         WHERE user_id = ? AND academic_year = ? AND semester = ? AND folder_link IS NOT NULL`,
        [userId, academicYear, semester],
        (err, rows) => (err ? reject(err) : resolve(rows || []))
      );
    });

    // Map DB category names to keys
    const categoryKeyMap = { Syllabus: 'syllabus', 'Course Guide': 'courseGuide', SLM: 'slm', 'Grading Sheet': 'gradingSheet', TOS: 'tos', attendanceSheet: 'attendanceSheet', classRecord: 'classRecord', evaluationOfTeachingEffectiveness: 'evaluationOfTeachingEffectiveness', classroomObservation: 'classroomObservation', testQuestions: 'testQuestions', answerKeys: 'answerKeys', facultyAndStudentsSeekAdvices: 'facultyAndStudentsSeekAdvices', accomplishmentReport: 'accomplishmentReport', randdProposal: 'randdProposal', researchImplemented: 'researchImplemented', researchPresented: 'researchPresented', researchPublished: 'researchPublished', intellectualPropertyRights: 'intellectualPropertyRights', researchUtilizedDeveloped: 'researchUtilizedDeveloped', numberOfCitations: 'numberOfCitations', extentionProposal: 'extentionProposal', personsTrained: 'personsTrained', personServiceRating: 'personServiceRating', personGivenTraining: 'personGivenTraining', technicalAdvice: 'technicalAdvice', attendanceFlagCeremony: 'attendanceFlagCeremony', attendanceFlagLowering: 'attendanceFlagLowering', attendanceHealthAndWellnessProgram: 'attendanceHealthAndWellnessProgram', attendanceSchoolCelebrations: 'attendanceSchoolCelebrations', trainingSeminarConferenceCertificate: 'trainingSeminarConferenceCertificate', atttendanceFacultyMeeting: 'atttendanceFacultyMeeting', attendanceISOAndRelatedActivities: 'attendanceISOAndRelatedActivities', attendaceSpiritualActivities: 'attendaceSpiritualActivities' };
    const folderLinks = {};
    folderLinkRows.forEach(row => {
      const key = categoryKeyMap[row.category];
      if (key) folderLinks[key] = row.folder_link;
    });

    // 3. Documents for this period
    const documents = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, original_filename as name, file_size as size, category,
                confidence, google_drive_link as driveLink, upload_date as uploadDate
         FROM documents
         WHERE user_id = ? AND academic_year = ? AND semester = ?
         ORDER BY upload_date DESC`,
        [userId, academicYear, semester],
        (err, rows) => (err ? reject(err) : resolve(rows || []))
      );
    });

    res.json({
      profile,
      folderLinks: {
        syllabus: folderLinks.syllabus || null,
        courseGuide: folderLinks.courseGuide || null,
        slm: folderLinks.slm || null,
        gradingSheet: folderLinks.gradingSheet || null,
        tos: folderLinks.tos || null,
        attendanceSheet: folderLinks.attendanceSheet || null,
        classRecord: folderLinks.classRecord || null,
        evaluationOfTeachingEffectiveness: folderLinks.evaluationOfTeachingEffectiveness || null,
        classroomObservation: folderLinks.classroomObservation || null,
        testQuestions: folderLinks.testQuestions || null,
        answerKeys: folderLinks.answerKeys || null,
        facultyAndStudentsSeekAdvices: folderLinks.facultyAndStudentsSeekAdvices || null,
        accomplishmentReport: folderLinks.accomplishmentReport || null,
        randdProposal: folderLinks.randdProposal || null,
        researchImplemented: folderLinks.researchImplemented || null,
        researchPresented: folderLinks.researchPresented || null,
        researchPublished: folderLinks.researchPublished || null,
        intellectualPropertyRights: folderLinks.intellectualPropertyRights || null,
        researchUtilizedDeveloped: folderLinks.researchUtilizedDeveloped || null,
        numberOfCitations: folderLinks.numberOfCitations || null,
        extentionProposal: folderLinks.extentionProposal || null,
        personsTrained: folderLinks.personsTrained || null,
        personServiceRating: folderLinks.personServiceRating || null,
        personGivenTraining: folderLinks.personGivenTraining || null,
        technicalAdvice: folderLinks.technicalAdvice || null,
        attendanceFlagCeremony: folderLinks.attendanceFlagCeremony || null,
        attendanceFlagLowering: folderLinks.attendanceFlagLowering || null,
        attendanceHealthAndWellnessProgram: folderLinks.attendanceHealthAndWellnessProgram || null,
        attendanceSchoolCelebrations: folderLinks.attendanceSchoolCelebrations || null,
        trainingSeminarConferenceCertificate: folderLinks.trainingSeminarConferenceCertificate || null,
        atttendanceFacultyMeeting: folderLinks.atttendanceFacultyMeeting || null,
        attendanceISOAndRelatedActivities: folderLinks.attendanceISOAndRelatedActivities || null,
        attendaceSpiritualActivities: folderLinks.attendaceSpiritualActivities || null,
      },
      documents,
    });
  } catch (error) {
    console.error("Admin faculty detail error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// START SERVER
// ──────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});