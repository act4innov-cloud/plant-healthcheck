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
    con
