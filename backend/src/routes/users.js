const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../config/database');
const { requireRole } = require('../middleware/auth');

router.get('/', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (role) {
      whereConditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
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
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;

    const [usersResult, countResult] = await Promise.all([
      pool.query(usersQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: usersResult.rows,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, firebase_uid, email, display_name, role, department, phone, is_active, created_at, last_login FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
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
        updateFields.push(`${fieldMap[key]} = $${paramIndex}`);
        queryParams.push(req.body[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    queryParams.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING id, email, display_name, role, department, phone, is_active`,
      queryParams
    );

    res.json({ success: true, message: 'User updated successfully', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING email', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
