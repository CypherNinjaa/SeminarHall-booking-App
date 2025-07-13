import { supabase } from '../utils/supabaseSetup';

/**
 * Utility service for logging admin actions
 * This provides a centralized way to log admin activities for audit trails
 */

export interface AdminActionLog {
  action: string;
  targetType: 'booking' | 'hall' | 'user' | 'system' | 'maintenance' | 'equipment';
  targetId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

class AdminLoggingService {
  /**
   * Log an admin action for audit trail
   */
  async logAction(logData: AdminActionLog): Promise<void> {
    try {
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user found for admin action logging');
        return;
      }

      const { error } = await supabase
        .from('admin_activity_logs')
        .insert({
          admin_id: user.id,
          action: logData.action,
          target_type: logData.targetType,
          target_id: logData.targetId || null,
          old_values: logData.oldValues || null,
          new_values: logData.newValues || null,
          ip_address: logData.ipAddress || null,
          user_agent: logData.userAgent || null,
          notes: logData.notes || null,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error logging admin action:', error);
        // Don't throw here as this is just logging
      } else {
        console.log(`📝 Admin action logged: ${logData.action} on ${logData.targetType}${logData.targetId ? ` (${logData.targetId})` : ''}`);
      }
    } catch (error) {
      console.error('Error in admin action logging:', error);
      // Don't throw here as this is just logging
    }
  }

  /**
   * Log a booking action (convenience method)
   */
  async logBookingAction(
    bookingId: string,
    action: 'approved' | 'rejected' | 'cancelled' | 'completed' | 'created' | 'updated',
    notes?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      action: `booking_${action}`,
      targetType: 'booking',
      targetId: bookingId,
      oldValues,
      newValues,
      notes,
    });
  }

  /**
   * Log a hall action (convenience method)
   */
  async logHallAction(
    hallId: string,
    action: 'created' | 'updated' | 'deleted' | 'maintenance_scheduled' | 'maintenance_completed',
    notes?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      action: `hall_${action}`,
      targetType: 'hall',
      targetId: hallId,
      oldValues,
      newValues,
      notes,
    });
  }

  /**
   * Log a user management action (convenience method)
   */
  async logUserAction(
    userId: string,
    action: 'created' | 'updated' | 'deleted' | 'role_changed' | 'suspended' | 'activated',
    notes?: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      action: `user_${action}`,
      targetType: 'user',
      targetId: userId,
      oldValues,
      newValues,
      notes,
    });
  }

  /**
   * Log a system action (convenience method)
   */
  async logSystemAction(
    action: 'backup_created' | 'settings_updated' | 'maintenance_mode_enabled' | 'maintenance_mode_disabled',
    notes?: string,
    newValues?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      action: `system_${action}`,
      targetType: 'system',
      notes,
      newValues,
    });
  }

  /**
   * Get admin activity logs with optional filters
   */
  async getActivityLogs(filters?: {
    adminId?: string;
    targetType?: string;
    targetId?: string;
    action?: string;
    dateRange?: { start: string; end: string };
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from('admin_activity_logs')
        .select(`
          *,
          admin:admin_id(email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.adminId) {
        query = query.eq('admin_id', filters.adminId);
      }

      if (filters?.targetType) {
        query = query.eq('target_type', filters.targetType);
      }

      if (filters?.targetId) {
        query = query.eq('target_id', filters.targetId);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activity logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActivityLogs:', error);
      return [];
    }
  }
}

export const adminLoggingService = new AdminLoggingService();
export default adminLoggingService;
