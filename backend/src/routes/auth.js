const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// ============================================================================
// POST /api/v1/auth/register - Enregistrer un nouvel utilisateur
// ============================================================================
router.post('/register', [
  body('firebaseUid').isString().notEmpty(),
  body('email').isEmail(),
  body('displayName').isString().notEmpty(),
  body('role').optional().isIn(['admin', 'manager', 'inspector', 'viewer'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firebaseUid, email, displayName, role, department } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const checkQuery = 'SELECT id FROM users WHERE firebase_uid = $1 OR email = $2';
    const checkResult = await pool.query(checkQuery, [firebaseUid, email]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Créer l'utilisateur
    const insertQuery = `
      INSERT INTO users (firebase_uid, email, display_name, role, department)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, firebase_uid, email, display_name, role, department, created_at
    `;

    const result = await pool.query(insertQuery, [
      firebaseUid,
      email,
      displayName,
      role || 'inspector',
      department || null
    ]);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// GET /api/v1/auth/me - Obtenir l'utilisateur connecté
// ============================================================================
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const query = `
      SELECT 
        id, firebase_uid, email, display_name, role, department,
        phone, is_active, created_at, last_login
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PUT /api/v1/auth/profile - Mettre à jour le profil
// ============================================================================
router.put('/profile', authMiddleware, [
  body('displayName').optional().isString(),
  body('phone').optional().isString(),
  body('department').optional().isString()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { displayName, phone, department } = req.body;

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (displayName) {
      updateFields.push(`display_name = $${paramIndex}`);
      queryParams.push(displayName);
      paramIndex++;
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      queryParams.push(phone);
      paramIndex++;
    }

    if (department !== undefined) {
      updateFields.push(`department = $${paramIndex}`);
      queryParams.push(department);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    queryParams.push(req.user.id);

    const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, email, display_name, role, department, phone
    `;

    const result = await pool.query(updateQuery, queryParams);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
