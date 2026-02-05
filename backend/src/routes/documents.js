const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, param, query, validationResult } = require('express-validator');
const pool = require('../config/database');

// Configuration Multer pour upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = process.env.STORAGE_PATH || '/tmp/uploads';
    
    // Créer le dossier si n'existe pas
    try {
      await fs.mkdir(uploadPath, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'application/pdf'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
  }
});

// ============================================================================
// GET /api/v1/documents - Liste des documents
// ============================================================================
router.get('/', [
  query('equipmentId').optional().isString(),
  query('checklistId').optional().isInt().toInt(),
  query('documentType').optional().isString(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      equipmentId,
      checklistId,
      documentType,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Filtrer selon les permissions de l'utilisateur
    if (req.user.role === 'viewer') {
      whereConditions.push(`(is_public = true OR $${paramIndex} = ANY(allowed_roles))`);
      queryParams.push(req.user.role);
      paramIndex++;
    }

    if (equipmentId) {
      whereConditions.push(`equipment_id = $${paramIndex}`);
      queryParams.push(equipmentId);
      paramIndex++;
    }

    if (checklistId) {
      whereConditions.push(`checklist_id = $${paramIndex}`);
      queryParams.push(checklistId);
      paramIndex++;
    }

    if (documentType) {
      whereConditions.push(`document_type = $${paramIndex}`);
      queryParams.push(documentType);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const documentsQuery = `
      SELECT 
        d.id, d.equipment_id, d.checklist_id, d.document_type,
        d.title, d.description, d.filename, d.file_size, d.mime_type,
        d.uploaded_at, d.is_public,
        u.display_name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      ${whereClause}
      ORDER BY d.uploaded_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents d
      ${whereClause}
    `;

    const [documentsResult, countResult] = await Promise.all([
      pool.query(documentsQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: documentsResult.rows,
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

// ============================================================================
// POST /api/v1/documents/upload - Upload un document
// ============================================================================
router.post('/upload', upload.single('file'), [
  body('equipmentId').optional().isString(),
  body('checklistId').optional().isInt().toInt(),
  body('documentType').isIn(['manual', 'certificate', 'photo', 'report', 'other']),
  body('title').isString().notEmpty(),
  body('description').optional().isString(),
  body('isPublic').optional().isBoolean()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Supprimer le fichier uploadé en cas d'erreur de validation
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const {
      equipmentId,
      checklistId,
      documentType,
      title,
      description,
      isPublic
    } = req.body;

    // Vérifier que au moins equipmentId ou checklistId est fourni
    if (!equipmentId && !checklistId) {
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(400).json({
        success: false,
        error: 'Either equipmentId or checklistId must be provided'
      });
    }

    const insertQuery = `
      INSERT INTO documents (
        equipment_id, checklist_id, document_type, title, description,
        filename, file_path, file_size, mime_type, is_public, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      equipmentId || null,
      checklistId || null,
      documentType,
      title,
      description || null,
      req.file.filename,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      isPublic === 'true',
      req.user.id
    ]);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: result.rows[0]
    });

  } catch (error) {
    // Nettoyer le fichier en cas d'erreur
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    next(error);
  }
});

// ============================================================================
// GET /api/v1/documents/:id - Télécharger un document
// ============================================================================
router.get('/:id', [
  param('id').isUUID()
], async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM documents WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const document = result.rows[0];

    // Vérifier les permissions
    if (!document.is_public && 
        !document.allowed_roles?.includes(req.user.role) &&
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Vérifier que le fichier existe
    try {
      await fs.access(document.file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
    }

    res.download(document.file_path, document.filename);

  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DELETE /api/v1/documents/:id - Supprimer un document
// ============================================================================
router.delete('/:id', [
  param('id').isUUID()
], async (req, res, next) => {
  try {
    const { id } = req.params;

    // Récupérer le document
    const selectQuery = 'SELECT * FROM documents WHERE id = $1';
    const selectResult = await pool.query(selectQuery, [id]);

    if (selectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const document = selectResult.rows[0];

    // Vérifier les permissions (seul uploader, admin, ou manager peuvent supprimer)
    if (document.uploaded_by !== req.user.id && 
        !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Supprimer de la base de données
    const deleteQuery = 'DELETE FROM documents WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    // Supprimer le fichier physique
    try {
      await fs.unlink(document.file_path);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue même si la suppression du fichier échoue
    }

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
