import { supabase } from './userManagementService';

// Types
export interface Hall {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  location?: string;
  floor_number?: number;
  building?: string;
  equipment: string[];
  amenities: string[];
  images: string[];
  is_active: boolean;
  is_maintenance: boolean;
  maintenance_notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface HallFilters {
  search?: string;
  capacity_min?: number;
  capacity_max?: number;
  is_active?: boolean;
  has_equipment?: string[];
}

export interface CreateHallData {
  name: string;
  description?: string;
  capacity: number;
  location?: string;
  floor_number?: number;
  building?: string;
  equipment?: string[];
  amenities?: string[];
  images?: string[];
  is_active?: boolean;
  is_maintenance?: boolean;
  maintenance_notes?: string;
}

export interface UpdateHallData {
  name?: string;
  description?: string;
  capacity?: number;
  location?: string;
  floor_number?: number;
  building?: string;
  equipment?: string[];
  amenities?: string[];
  images?: string[];
  is_active?: boolean;
  is_maintenance?: boolean;
  maintenance_notes?: string;
}

export interface HallStats {
  total_halls: number;
  active_halls: number;
  inactive_halls: number;
  total_capacity: number;
  average_capacity: number;
  halls_with_equipment: number;
}

class HallManagementService {
  /**
   * Get all halls with optional filtering
   */
  async getAllHalls(filters?: HallFilters): Promise<Hall[]> {
    try {
      let query = supabase
        .from('halls')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,location.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.capacity_min) {
        query = query.gte('capacity', filters.capacity_min);
      }

      if (filters?.capacity_max) {
        query = query.lte('capacity', filters.capacity_max);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching halls:', error);
      throw new Error('Failed to fetch halls');
    }
  }

  /**
   * Get a single hall by ID
   */
  async getHallById(id: string): Promise<Hall | null> {
    try {
      const { data, error } = await supabase
        .from('halls')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching hall:', error);
      throw new Error('Failed to fetch hall details');
    }
  }

  /**
   * Create a new hall
   */
  async createHall(hallData: CreateHallData): Promise<Hall> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user has admin permissions by checking profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Unable to verify admin permissions');
      }

      if (!['admin', 'super_admin'].includes(profile.role) || !profile.is_active) {
        throw new Error('Insufficient permissions to create halls');
      }

      // Prepare hall data with user context
      const insertData = {
        name: hallData.name,
        description: hallData.description,
        capacity: hallData.capacity,
        location: hallData.location,
        floor_number: hallData.floor_number,
        building: hallData.building,
        equipment: hallData.equipment || [],
        amenities: hallData.amenities || [],
        images: hallData.images || [],
        is_active: hallData.is_active ?? true,
        is_maintenance: hallData.is_maintenance ?? false,
        maintenance_notes: hallData.maintenance_notes,
        created_by: user.id,
        updated_by: user.id,
      };

      const { data, error } = await supabase
        .from('halls')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Log the activity using the database function (optional)
      try {
        await supabase.rpc('log_admin_action', {
          p_action: 'hall_created',
          p_target_type: 'hall',
          p_target_id: data.id,
          p_new_values: data,
          p_notes: `Created hall: ${data.name}`,
        });
      } catch (logError) {
        // Ignore logging errors - don't fail the main operation
        console.warn('Failed to log admin action:', logError);
      }

      return data;
    } catch (error) {
      console.error('Error creating hall:', error);
      throw new Error('Failed to create hall');
    }
  }

  /**
   * Update an existing hall
   */
  async updateHall(id: string, updates: UpdateHallData): Promise<Hall> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify user has admin permissions
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Unable to verify admin permissions');
      }

      if (!['admin', 'super_admin'].includes(profile.role) || !profile.is_active) {
        throw new Error('Insufficient permissions to update halls');
      }

      // Get the current hall data for logging
      const currentHall = await this.getHallById(id);
      
      // Add updated_by to the updates
      const updateData = {
        ...updates,
        updated_by: user.id,
      };

      const { data, error } = await supabase
        .from('halls')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Log the activity using the database function (optional)
      try {
        await supabase.rpc('log_admin_action', {
          p_action: 'hall_updated',
          p_target_type: 'hall',
          p_target_id: id,
          p_old_values: currentHall,
          p_new_values: data,
          p_notes: `Updated hall: ${data.name}`,
        });
      } catch (logError) {
        // Ignore logging errors - don't fail the main operation
        console.warn('Failed to log admin action:', logError);
      }

      return data;
    } catch (error) {
      console.error('Error updating hall:', error);
      throw new Error('Failed to update hall');
    }
  }

  /**
   * Toggle hall active status
   */
  async toggleHallStatus(id: string): Promise<Hall> {
    try {
      const currentHall = await this.getHallById(id);
      if (!currentHall) {
        throw new Error('Hall not found');
      }

      const newStatus = !currentHall.is_active;

      const { data, error } = await supabase
        .from('halls')
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Log the activity
      await this.logHallActivity('hall_status_changed', {
        hall_id: id,
        hall_name: data.name,
        old_status: currentHall.is_active,
        new_status: newStatus,
      });

      return data;
    } catch (error) {
      console.error('Error toggling hall status:', error);
      throw new Error('Failed to update hall status');
    }
  }

  /**
   * Delete a hall (soft delete by setting is_active to false)
   */
  async deleteHall(id: string): Promise<void> {
    try {
      const currentHall = await this.getHallById(id);
      if (!currentHall) {
        throw new Error('Hall not found');
      }

      // Check if hall has active bookings
      const { data: activeBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('hall_id', id)
        .gte('start_time', new Date().toISOString())
        .eq('status', 'confirmed');

      if (bookingsError) {
        throw bookingsError;
      }

      if (activeBookings && activeBookings.length > 0) {
        throw new Error('Cannot delete hall with active bookings');
      }

      // Soft delete (deactivate instead of actually deleting)
      const { error } = await supabase
        .from('halls')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Log the activity
      await this.logHallActivity('hall_deleted', {
        hall_id: id,
        hall_name: currentHall.name,
        hall_data: currentHall,
      });
    } catch (error) {
      console.error('Error deleting hall:', error);
      throw new Error('Failed to delete hall');
    }
  }

  /**
   * Get hall statistics
   */
  async getHallStats(): Promise<HallStats> {
    try {
      const { data: halls, error } = await supabase
        .from('halls')
        .select('capacity, is_active, equipment');

      if (error) {
        throw error;
      }

      const stats: HallStats = {
        total_halls: halls?.length || 0,
        active_halls: halls?.filter(h => h.is_active).length || 0,
        inactive_halls: halls?.filter(h => !h.is_active).length || 0,
        total_capacity: halls?.reduce((sum, h) => sum + (h.capacity || 0), 0) || 0,
        average_capacity: halls?.length > 0 
          ? Math.round((halls.reduce((sum, h) => sum + (h.capacity || 0), 0) / halls.length)) 
          : 0,
        halls_with_equipment: halls?.filter(h => h.equipment && h.equipment.length > 0).length || 0,
      };

      return stats;
    } catch (error) {
      console.error('Error fetching hall stats:', error);
      throw new Error('Failed to fetch hall statistics');
    }
  }

  /**
   * Get available equipment list across all halls
   */
  async getAvailableEquipment(): Promise<string[]> {
    try {
      const { data: halls, error } = await supabase
        .from('halls')
        .select('equipment')
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      const equipmentSet = new Set<string>();
      halls?.forEach(hall => {
        if (hall.equipment && Array.isArray(hall.equipment)) {
          hall.equipment.forEach(item => equipmentSet.add(item));
        }
      });

      return Array.from(equipmentSet).sort();
    } catch (error) {
      console.error('Error fetching equipment list:', error);
      throw new Error('Failed to fetch equipment list');
    }
  }

  /**
   * Upload hall image
   */
  async uploadHallImage(hallId: string, imageUri: string, fileName: string): Promise<string> {
    try {
      // Convert image URI to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const filePath = `halls/${hallId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('hall-images')
        .upload(filePath, blob);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('hall-images')
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading hall image:', error);
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Delete hall image
   */
  async deleteHallImage(imagePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('hall-images')
        .remove([imagePath]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting hall image:', error);
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Log hall-related activities
   */
  private async logHallActivity(action: string, details: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No user found for activity logging');
        return;
      }

      await supabase
        .from('hall_activity_log')
        .insert([{
          user_id: user.id,
          action,
          details,
          created_at: new Date().toISOString(),
        }]);
    } catch (error) {
      console.error('Error logging hall activity:', error);
      // Don't throw error for logging failures
    }
  }

  /**
   * Get hall activity log
   */
  async getHallActivityLog(hallId?: string, limit: number = 50): Promise<any[]> {
    try {
      let query = supabase
        .from('hall_activity_log')
        .select(`
          *,
          profiles:user_id (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (hallId) {
        query = query.eq('details->hall_id', hallId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching hall activity log:', error);
      throw new Error('Failed to fetch activity log');
    }
  }
}

export const hallManagementService = new HallManagementService();
