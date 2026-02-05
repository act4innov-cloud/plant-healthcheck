# Créer le dossier routes s'il n'existe pas
New-Item -ItemType Directory -Path .\backend\src\routes -Force

# Créer le fichier users.js
@"
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../config/database');
const { requireRole } = require('../middleware/auth');

// ============================================================================
// GET /api/v1/users - Liste des utilisateurs (admin/manager seulement)
// ============================================================================
router.get('/', requireRole('admin', 'manager'), [
  query('role').optional().isIn(['admin', 'manager', 'inspector', 'viewer']),
  query('isActive').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      role,
      isActive,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (role) {
      whereConditions.push(`role = \$${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`is_active = \$${paramIndex}`);
      queryParams.push(isActive === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const usersQuery = `
      SELECT 
        id, firebase_uid, email, display_name, role, department,
        phone, is_active, created_at, last_login
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT \$${paramIndex} OFFSET \$${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      ${whereClause}
    `;

    const [usersResult, countResult] = await Promise.all([
      pool.query(usersQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: usersResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/users/:id - Détails d'un utilisateur
// ============================================================================
router.get('/:id', requireRole('admin', 'manager'), [
  param('id').isUUID()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const query = `
      SELECT 
        id, firebase_uid, email, display_name, role, department,
        phone, is_active, created_at, last_login
      FROM users
      WHERE id = \$1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Statistiques de l'utilisateur si inspecteur
    if (result.rows[0].role === 'inspector') {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_checklists,
          AVG(score) as avg_score,
          COUNT(*) FILTER (WHERE final_status = 'conforme') as conforme_count
        FROM checklists
        WHERE inspector_id = \$1
          AND status = 'completed'
      `;

      const statsResult = await pool.query(statsQuery, [id]);

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          stats: statsResult.rows[0]
        }
      });
    } else {
      res.json({
        success: true,
        data: result.rows[0]
      });
    }

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PUT /api/v1/users/:id - Mettre à jour un utilisateur (admin seulement)
// ============================================================================
router.put('/:id', requireRole('admin'), [
  param('id').isUUID(),
  body('displayName').optional().isString(),
  body('role').optional().isIn(['admin', 'manager', 'inspector', 'viewer']),
  body('department').optional().isString(),
  body('phone').optional().isString(),
  body('isActive').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Vérifier que l'utilisateur existe
    const checkQuery = 'SELECT id FROM users WHERE id = \$1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    const fieldMap = {
      displayName: 'display_name',
      role: 'role',
      department: 'department',
      phone: 'phone',
      isActive: 'is_active'
    };

    Object.keys(req.body).forEach(key => {
      if (fieldMap[key]) {
        updateFields.push(`${fieldMap[key]} = \$${paramIndex}`);
        queryParams.push(req.body[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    queryParams.push(id);

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = \$${paramIndex}
      RETURNING id, email, display_name, role, department, phone, is_active
    `;

    const result = await pool.query(updateQuery, queryParams);

    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
      VALUES (\$1, 'user_updated', 'user', \$2, \$3)
    `, [req.user.id, id, JSON.stringify(req.body)]);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DELETE /api/v1/users/:id - Supprimer un utilisateur (admin seulement)
// ============================================================================
router.delete('/:id', requireRole('admin'), [
  param('id').isUUID()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Empêcher la suppression de soi-même
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    const deleteQuery = 'DELETE FROM users WHERE id = \$1 RETURNING email';
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
      VALUES (\$1, 'user_deleted', 'user', \$2, \$3)
    `, [req.user.id, id, JSON.stringify({ email: result.rows[0].email })]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/users/stats/inspectors - Statistiques des inspecteurs
// ============================================================================
router.get('/stats/inspectors', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.display_name,
        u.email,
        COUNT(c.id) as total_checklists,
        AVG(c.score) as avg_score,
        COUNT(*) FILTER (WHERE c.final_status = 'conforme') as conforme_count,
        COUNT(*) FILTER (WHERE c.completed_at >= CURRENT_DATE - INTERVAL '30 days') as recent_checklists
      FROM users u
      LEFT JOIN checklists c ON u.id = c.inspector_id AND c.status = 'completed'
      WHERE u.role = 'inspector' AND u.is_active = true
      GROUP BY u.id, u.display_name, u.email
      ORDER BY recent_checklists DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        avg_score: row.avg_score ? Math.round(parseFloat(row.avg_score)) : 0,
        total_checklists: parseInt(row.total_checklists),
        conforme_count: parseInt(row.conforme_count),
        recent_checklists: parseInt(row.recent_checklists)
      }))
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
"@ | Out-File -FilePath .\backend\src\routes\users.js -Encoding UTF8
