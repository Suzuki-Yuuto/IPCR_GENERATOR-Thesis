const express = require('express');
const router = express.Router();
const db = require('../database');

const { KEY_TO_COL, rowToTargets } = require('./targets');

/**
 * GET /api/presets/:userId
 * Returns all presets for a user.
 */
router.get('/presets/:userId', (req, res) => {
  db.all(
    `SELECT * FROM target_presets WHERE user_id = ? ORDER BY created_at DESC`,
    [req.params.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const presets = (rows || []).map(row => ({
        id: row.id,
        preset_name: row.preset_name,
        created_at: row.created_at,
        targets: rowToTargets(row),
      }));
      res.json(presets);
    }
  );
});

/**
 * POST /api/presets/create
 * Body: { userId, preset_name, targets: { camelKey: number, ... } }
 * Inserts a new preset row.
 */
router.post('/presets/create', (req, res) => {
  const { userId, preset_name, targets } = req.body;

  if (!userId || !preset_name || !targets) {
    return res.status(400).json({ error: 'userId, preset_name, and targets are required' });
  }

  // Validate
  for (const [key, val] of Object.entries(targets)) {
    const n = Number(val);
    if (isNaN(n) || n < 0) {
      return res.status(400).json({ error: `Invalid value for ${key}: must be a non-negative number` });
    }
  }

  const setCols = [];
  const values = [];
  for (const [camel, col] of Object.entries(KEY_TO_COL)) {
    setCols.push(col);
    values.push(targets[camel] !== undefined ? Number(targets[camel]) : 5);
  }

  const colList = setCols.join(', ');
  const placeholders = setCols.map(() => '?').join(', ');

  const sql = `
    INSERT INTO target_presets (user_id, preset_name, ${colList})
    VALUES (?, ?, ${placeholders})
  `;

  db.run(sql, [userId, preset_name, ...values], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

/**
 * DELETE /api/presets/:presetId
 * Deletes a preset by ID.
 */
router.delete('/presets/:presetId', (req, res) => {
  db.run(
    `DELETE FROM target_presets WHERE id = ?`,
    [req.params.presetId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Preset not found' });
      res.json({ success: true });
    }
  );
});

module.exports = router;
