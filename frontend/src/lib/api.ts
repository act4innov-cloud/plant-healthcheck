import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://plant-healthcheck-app.onrender.com/api/v1';

// ============================================================================
// Helper pour obtenir le token Firebase
// ============================================================================
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// ============================================================================
// Wrapper fetch avec authentification
// ============================================================================
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'An error occurred',
      message: response.statusText
    }));
    throw new Error(error.message || error.error || 'Request failed');
  }

  return response.json();
}

// ============================================================================
// EQUIPMENTS API
// ============================================================================
export const equipmentsApi = {
  getAll: async (params?: {
    status?: string;
    category?: string;
    building?: string;
    zone?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    return apiRequest<{
      success: boolean;
      data: Equipment[];
      pagination: Pagination;
    }>(`/equipments${queryString}`);
  },

  getById: async (id: string) => {
    return apiRequest<{
      success: boolean;
      data: {
        equipment: Equipment;
        recentChecklists: Checklist[];
        activeAlerts: Alert[];
        maintenanceHistory: MaintenanceRecord[];
      };
    }>(`/equipments/${id}`);
  },

  create: async (data: Partial<Equipment>) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: Equipment;
    }>('/equipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Equipment>) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: Equipment;
    }>(`/equipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/equipments/${id}`, {
      method: 'DELETE',
    });
  },

  getHealthHistory: async (id: string, period: string = '30d') => {
    return apiRequest<{
      success: boolean;
      data: HealthHistoryPoint[];
      period: string;
      days: number;
    }>(`/equipments/${id}/health-history?period=${period}`);
  },
};

// ============================================================================
// CHECKLISTS API
// ============================================================================
export const checklistsApi = {
  getAll: async (params?: {
    equipmentId?: string;
    status?: string;
    finalStatus?: string;
    inspectorId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    return apiRequest<{
      success: boolean;
      data: Checklist[];
      pagination: Pagination;
    }>(`/checklists${queryString}`);
  },

  getById: async (id: number) => {
    return apiRequest<{
      success: boolean;
      data: ChecklistDetail;
    }>(`/checklists/${id}`);
  },

  getTemplates: async (equipmentType?: string) => {
    const query = equipmentType ? `?equipmentType=${equipmentType}` : '';
    return apiRequest<{
      success: boolean;
      data: ChecklistTemplate[];
    }>(`/checklists/templates${query}`);
  },

  getTemplateById: async (id: string) => {
    return apiRequest<{
      success: boolean;
      data: ChecklistTemplate;
    }>(`/checklists/templates/${id}`);
  },

  create: async (data: {
    equipmentId: string;
    templateId: string;
    scheduledDate?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: Checklist;
    }>('/checklists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: {
    responses?: Record<string, any>;
    status?: string;
    inspectorNotes?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: Checklist;
    }>(`/checklists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/checklists/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// DASHBOARD API
// ============================================================================
export const dashboardApi = {
  getStats: async () => {
    return apiRequest<{
      success: boolean;
      data: DashboardStats;
    }>('/dashboard/stats');
  },

  getUpcomingInspections: async () => {
    return apiRequest<{
      success: boolean;
      data: UpcomingInspection[];
    }>('/dashboard/upcoming-inspections');
  },

  getRecentActivity: async () => {
    return apiRequest<{
      success: boolean;
      data: Activity[];
    }>('/dashboard/recent-activity');
  },

  getHealthTrends: async () => {
    return apiRequest<{
      success: boolean;
      data: {
        globalTrend: TrendPoint[];
        trendsByCategory: Record<string, TrendPoint[]>;
        scoreDistribution: ScoreDistribution[];
      };
    }>('/dashboard/health-trends');
  },

  getAlertsSummary: async () => {
    return apiRequest<{
      success: boolean;
      data: AlertSummary[];
    }>('/dashboard/alerts-summary');
  },

  getMaintenanceCalendar: async (month?: number, year?: number) => {
    const query = month && year ? `?month=${month}&year=${year}` : '';
    return apiRequest<{
      success: boolean;
      data: Record<string, CalendarEvent[]>;
    }>(`/dashboard/maintenance-calendar${query}`);
  },
};

// ============================================================================
// DOCUMENTS API
// ============================================================================
export const documentsApi = {
  getAll: async (params?: {
    equipmentId?: string;
    checklistId?: number;
    documentType?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    return apiRequest<{
      success: boolean;
      data: Document[];
      pagination: Pagination;
    }>(`/documents${queryString}`);
  },

  upload: async (file: File, metadata: {
    equipmentId?: string;
    checklistId?: number;
    documentType: string;
    title: string;
    description?: string;
    isPublic?: boolean;
  }) => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  download: async (id: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  },

  delete: async (id: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/documents/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================================
// REPORTS API
// ============================================================================
export const reportsApi = {
  generateChecklistPDF: async (checklistId: number) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/reports/checklist/${checklistId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('PDF generation failed');
    }

    return response.blob();
  },

  generateEquipmentPDF: async (equipmentId: string) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/reports/equipment/${equipmentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('PDF generation failed');
    }

    return response.blob();
  },
};

// ============================================================================
// ALERTS API
// ============================================================================
export const alertsApi = {
  getAll: async (params?: {
    status?: string;
    severity?: string;
    equipmentId?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    return apiRequest<{
      success: boolean;
      data: Alert[];
      pagination: Pagination;
    }>(`/alerts${queryString}`);
  },

  acknowledge: async (id: number) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/alerts/${id}/acknowledge`, {
      method: 'POST',
    });
  },

  resolve: async (id: number, notes: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },
};

// ============================================================================
// AUTH API
// ============================================================================
export const authApi = {
  getMe: async () => {
    return apiRequest<{
      success: boolean;
      data: User;
    }>('/auth/me');
  },

  updateProfile: async (data: {
    displayName?: string;
    phone?: string;
    department?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      data: User;
    }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ============================================================================
// TYPES
// ============================================================================
export interface Equipment {
  id: string;
  name: string;
  type: string;
  category: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  building: string;
  zone: string;
  floor?: string;
  coordinates?: { lat: number; lng: number };
  status: 'operational' | 'maintenance' | 'critical' | 'outOfService';
  health_score?: number;
  install_date?: string;
  warranty_expiry_date?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  maintenance_frequency?: string;
  operating_hours?: number;
  criticality_level?: 'low' | 'medium' | 'high' | 'critical';
  critical_gases?: string[];
  safety_equipment?: string[];
  specifications?: Record<string, any>;
  responsible_person?: string;
  contact_email?: string;
  contact_phone?: string;
  documents?: string[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Checklist {
  id: number;
  equipment_id: string;
  template_id: string;
  inspector_id: string;
  inspector_name: string;
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  responses: Record<string, any>;
  total_items: number;
  completed_items: number;
  passed_items: number;
  failed_items: number;
  score: number;
  final_status?: 'conforme' | 'à_vérifier' | 'critique' | 'en_attente';
  next_check_date?: string;
  photos?: string[];
  documents?: string[];
  inspector_notes?: string;
  manager_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistDetail extends Checklist {
  equipment_name: string;
  equipment_type: string;
  building: string;
  zone: string;
  criticality_level: string;
  template_title: string;
  template_sections: any[];
}

export interface ChecklistTemplate {
  id: string;
  equipment_type: string;
  title: string;
  description?: string;
  version: string;
  frequency?: string;
  estimated_duration?: number;
  required_certifications?: string[];
  required_ppe?: string[];
  sections: TemplateSection[];
  scoring_rules: ScoringRules;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateSection {
  id: string;
  name: string;
  order: number;
  items: TemplateItem[];
}

export interface TemplateItem {
  id: string;
  order: number;
  check: string;
  description?: string;
  type: 'boolean' | 'number' | 'select' | 'textarea' | 'file';
  mandatory: boolean;
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
  unit?: string;
  range?: { min: number; max: number; optimal?: number };
  options?: Array<{ value: string; label: string; acceptable: boolean }>;
  acceptedFormats?: string[];
  maxSize?: number;
}

export interface ScoringRules {
  totalItems: number;
  mandatoryItems: number;
  passingScore: number;
  criticalItemsRequired: boolean;
}

export interface Alert {
  id: number;
  equipment_id?: string;
  checklist_id?: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  equipment_id?: string;
  checklist_id?: number;
  document_type: 'manual' | 'certificate' | 'photo' | 'report' | 'other';
  title: string;
  description?: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  is_public: boolean;
  allowed_roles?: string[];
  uploaded_by: string;
  uploaded_at: string;
}

export interface MaintenanceRecord {
  id: number;
  equipment_id: string;
  maintenance_type: 'preventive' | 'corrective' | 'emergency' | 'calibration';
  description: string;
  scheduled_date?: string;
  start_date?: string;
  end_date?: string;
  performed_by?: string;
  validated_by?: string;
  parts_replaced?: string[];
  cost?: number;
  downtime_hours?: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  overview: {
    totalEquipments: number;
    operationalEquipments: number;
    maintenanceEquipments: number;
    criticalEquipments: number;
    outOfServiceEquipments: number;
    avgHealthScore: number;
    checklistsCompletedMonth: number;
    activeAlerts: number;
    upcomingMaintenanceWeek: number;
    conformityRate: number;
    checklistsEvolution: number;
    scoreEvolution: number;
  };
  checklistsByStatus: Record<string, number>;
  equipmentsByCategory: Array<{
    category: string;
    count: number;
    avgHealthScore: number;
  }>;
  alertsBySeverity: Record<string, number>;
  inspectionsTrend: Array<{
    date: string;
    count: number;
    avgScore: number;
  }>;
  lowScoreEquipments: Equipment[];
}

export interface UpcomingInspection {
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  building: string;
  zone: string;
  next_maintenance_date: string;
  criticality_level: string;
  responsible_person?: string;
  template_id?: string;
  template_title?: string;
  estimated_duration?: number;
  urgency: 'overdue' | 'urgent' | 'soon' | 'scheduled';
  days_until: number;
}

export interface Activity {
  activity_type: string;
  entity_id: number | string;
  equipment_id?: string;
  equipment_name?: string;
  actor: string;
  timestamp: string;
  status: string;
  score?: number;
  metadata: Record<string, any>;
}

export interface TrendPoint {
  date: string;
  avg_score: number;
  num_inspections: number;
}

export interface ScoreDistribution {
  score_range: string;
  count: number;
}

export interface AlertSummary {
  alert_type: string;
  severity: string;
  count: number;
  recent_alerts: Array<{
    id: number;
    equipmentId?: string;
    title: string;
    createdAt: string;
  }>;
}

export interface CalendarEvent {
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  building: string;
  zone: string;
  date: string;
  criticality_level: string;
  responsible_person?: string;
  inspection_type?: string;
  estimated_duration?: number;
}

export interface HealthHistoryPoint {
  date: string;
  avg_score: number;
  num_inspections: number;
}

export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string;
  role: 'admin' | 'manager' | 'inspector' | 'viewer';
  department?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
