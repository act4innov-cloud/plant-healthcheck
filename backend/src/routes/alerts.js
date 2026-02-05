Remove-Item .\backend\src\routes\alerts.js -Force

@'
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../config/database');
const { requireRole } = require('../middleware/auth');

// GET /api/v1/alerts - Liste des alertes
router.get('/', [
  query('status').optional().isIn(['active', 'acknowledged', 'resolved', 'dismissed']),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('equipmentId').optional().isString(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      status = 'active',
      severity,
      equipmentId,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    let whereConditions = ['status = $1'];
    let queryParams = [status];
    let paramIndex = 2;

    if (severity) {
      whereConditions.push(`severity = $${paramIndex}`);
      queryParams.push(severity);
      paramIndex++;
    }

    if (equipmentId) {
      whereConditions.push(`equipment_id = $${paramIndex}`);
      queryParams.push(equipmentId);
      paramIndex++;
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const alertsQuery = `
      SELECT 
        a.id, a.equipment_id, a.checklist_id, a.alert_type, a.severity,
        a.title, a.message, a.status, a.created_at, a.acknowledged_at,
        a.resolved_at, a.resolution_notes,
        e.name as equipment_name, e.building, e.zone
      FROM alerts a
      LEFT JOIN equipments e ON a.equipment_id = e.id
      ${whereClause}
      ORDER BY 
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM alerts a
      ${whereClause}
    `;

    const [alertsResult, countResult] = await Promise.all([
      pool.query(alertsQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: alertsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/v1/alerts/:id/acknowledge - Accuser réception
router.post('/:id/acknowledge', [
  param('id').isInt().toInt()
], async (req, res, next) => {
  try {
    const { id } = req.params;

    const updateQuery = `
      UPDATE alerts
      SET 
        status = 'acknowledged',
        acknowledged_by = $1,
        acknowledged_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status = 'active'
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or already acknowledged'
      });
    }

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/v1/alerts/:id/resolve - Résoudre une alerte
router.post('/:id/resolve', requireRole('admin', 'manager', 'inspector'), [
  param('id').isInt().toInt(),
  body('notes').isString().notEmpty()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { notes } = req.body;

    const updateQuery = `
      UPDATE alerts
      SET 
        status = 'resolved',
        resolved_by = $1,
        resolved_at = CURRENT_TIMESTAMP,
        resolution_notes = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status IN ('active', 'acknowledged')
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [req.user.id, notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or already resolved'
      });
    }

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
'@ | Out-File -FilePath .\backend\src\routes\alerts.js -Encoding UTF8
