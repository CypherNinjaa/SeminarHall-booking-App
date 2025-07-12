import { supabase } from '../utils/supabaseSetup';

export interface BookingDetails {
  id: string;
  hall_name: string;
  hall_id: string;
  user_name: string;
  user_email: string;
  purpose: string;
  description?: string;
  booking_date: string; // DDMMYYYY format
  start_time: string;
  end_time: string;
  duration_minutes: number;
  buffer_start: string;
  buffer_end: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  priority: 'low' | 'medium' | 'high';
  equipment_needed: string[];
  attendees_count: number;
  special_requirements?: string;
  auto_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  rejected_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FilterOptions {
  status: 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  date_range: 'today' | 'this_week' | 'this_month' | 'all';
  hall: 'all' | string;
  priority: 'all' | 'low' | 'medium' | 'high';
}

class BookingOversightService {
  /**
   * Get all bookings with optional filters
   */
  async getBookings(filters?: Partial<FilterOptions>): Promise<BookingDetails[]> {
    try {
      // First, get bookings without joins
      let query = supabase
        .from('smart_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply date range filter
      if (filters?.date_range && filters.date_range !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (filters.date_range) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'this_week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay());
            break;
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            startDate = new Date(0);
        }

        // Convert date to DDMMYYYY format for comparison
        const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const [year, month, day] = dateStr.split('-');
        const ddmmyyyy = `${day}${month}${year}`;
        
        query = query.gte('booking_date', ddmmyyyy);
      }

      // Apply hall filter
      if (filters?.hall && filters.hall !== 'all') {
        query = query.eq('hall_id', filters.hall);
      }

      // Apply priority filter
      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      const { data: bookingsData, error } = await query;

      if (error) {
        console.error('Error fetching bookings:', error);
        throw new Error('Failed to fetch bookings');
      }

      if (!bookingsData || bookingsData.length === 0) {
        return [];
      }

      // Get unique hall and user IDs for batch fetching
      const hallIds = [...new Set(bookingsData.map(b => b.hall_id).filter(Boolean))];
      const userIds = [...new Set(bookingsData.map(b => b.user_id).filter(Boolean))];

      // Fetch halls data
      const { data: hallsData } = await supabase
        .from('halls')
        .select('id, name')
        .in('id', hallIds);

      // Fetch user profiles data
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      // Create lookup maps for better performance
      const hallsMap = new Map(hallsData?.map(h => [h.id, h]) || []);
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Transform data to match expected format
      return bookingsData.map(booking => {
        const hall = hallsMap.get(booking.hall_id);
        const profile = profilesMap.get(booking.user_id);
        
        return {
          id: booking.id,
          hall_name: hall?.name || 'Unknown Hall',
          hall_id: booking.hall_id,
          user_name: profile?.name || 'Unknown User',
          user_email: profile?.email || '',
          purpose: booking.purpose,
          description: booking.description,
          booking_date: booking.booking_date, // DDMMYYYY format
          start_time: booking.start_time,
          end_time: booking.end_time,
          duration_minutes: booking.duration_minutes || 0,
          buffer_start: booking.buffer_start || booking.start_time,
          buffer_end: booking.buffer_end || booking.end_time,
          status: booking.status,
          priority: booking.priority || 'medium',
          equipment_needed: booking.equipment_needed || [],
          attendees_count: booking.attendees_count || 0,
          special_requirements: booking.special_requirements,
          auto_approved: booking.auto_approved || false,
          approved_by: booking.approved_by,
          approved_at: booking.approved_at,
          rejected_reason: booking.rejected_reason,
          admin_notes: booking.admin_notes,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
        };
      });
    } catch (error) {
      console.error('Error in getBookings:', error);
      throw error;
    }
  }

  /**
   * Update booking status (approve/reject)
   */
  async updateBookingStatus(
    bookingId: string, 
    status: 'approved' | 'rejected',
    adminNotes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Error updating booking status:', error);
        throw new Error('Failed to update booking status');
      }

      // Log the admin action
      await this.logAdminAction(bookingId, `Booking ${status}`, adminNotes);
    } catch (error) {
      console.error('Error in updateBookingStatus:', error);
      throw error;
    }
  }

  /**
   * Get booking statistics for dashboard
   */
  async getBookingStatistics(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('status');

      if (error) {
        console.error('Error fetching booking statistics:', error);
        throw new Error('Failed to fetch booking statistics');
      }

      const stats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: data?.length || 0,
      };

      data?.forEach(booking => {
        if (booking.status === 'pending') stats.pending++;
        else if (booking.status === 'approved') stats.approved++;
        else if (booking.status === 'rejected') stats.rejected++;
      });

      return stats;
    } catch (error) {
      console.error('Error in getBookingStatistics:', error);
      throw error;
    }
  }

  /**
   * Get booking conflicts (overlapping bookings)
   */
  async getBookingConflicts(): Promise<BookingDetails[]> {
    try {
      // Get pending bookings that might have conflicts
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'pending')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching booking conflicts:', error);
        throw new Error('Failed to fetch booking conflicts');
      }

      if (!bookingsData || bookingsData.length === 0) {
        return [];
      }

      // Get unique hall and user IDs for batch fetching
      const hallIds = [...new Set(bookingsData.map(b => b.hall_id).filter(Boolean))];
      const userIds = [...new Set(bookingsData.map(b => b.user_id).filter(Boolean))];

      // Fetch halls data
      const { data: hallsData } = await supabase
        .from('halls')
        .select('id, name')
        .in('id', hallIds);

      // Fetch user profiles data
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      // Create lookup maps for better performance
      const hallsMap = new Map(hallsData?.map(h => [h.id, h]) || []);
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // TODO: Implement actual conflict detection logic
      // This would involve checking for overlapping time slots in the same hall
      
      return bookingsData.map(booking => {
        const hall = hallsMap.get(booking.hall_id);
        const profile = profilesMap.get(booking.user_id);
        
        return {
          id: booking.id,
          hall_name: hall?.name || 'Unknown Hall',
          hall_id: booking.hall_id,
          user_name: profile?.name || 'Unknown User',
          user_email: profile?.email || '',
          purpose: booking.purpose,
          description: booking.description,
          booking_date: booking.booking_date, // DDMMYYYY format
          start_time: booking.start_time,
          end_time: booking.end_time,
          duration_minutes: booking.duration_minutes || 0,
          buffer_start: booking.buffer_start || booking.start_time,
          buffer_end: booking.buffer_end || booking.end_time,
          status: booking.status,
          priority: booking.priority || 'medium',
          equipment_needed: booking.equipment_needed || [],
          attendees_count: booking.attendees_count || 0,
          special_requirements: booking.special_requirements,
          auto_approved: booking.auto_approved || false,
          approved_by: booking.approved_by,
          approved_at: booking.approved_at,
          rejected_reason: booking.rejected_reason,
          admin_notes: booking.admin_notes,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
        };
      });
    } catch (error) {
      console.error('Error in getBookingConflicts:', error);
      throw error;
    }
  }

  /**
   * Bulk approve/reject bookings
   */
  async bulkUpdateBookings(
    bookingIds: string[],
    status: 'approved' | 'rejected',
    adminNotes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('smart_bookings')
        .update({
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .in('id', bookingIds);

      if (error) {
        console.error('Error bulk updating bookings:', error);
        throw new Error('Failed to bulk update bookings');
      }

      // Log the admin action for each booking
      await Promise.all(
        bookingIds.map(bookingId =>
          this.logAdminAction(bookingId, `Bulk ${status}`, adminNotes)
        )
      );
    } catch (error) {
      console.error('Error in bulkUpdateBookings:', error);
      throw error;
    }
  }

  /**
   * Get booking details by ID
   */
  async getBookingById(bookingId: string): Promise<BookingDetails | null> {
    try {
      const { data: booking, error } = await supabase
        .from('smart_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error('Error fetching booking details:', error);
        throw new Error('Failed to fetch booking details');
      }

      if (!booking) return null;

      // Fetch related hall and user data
      const [
        { data: hall },
        { data: profile }
      ] = await Promise.all([
        supabase.from('halls').select('id, name').eq('id', booking.hall_id).single(),
        supabase.from('profiles').select('id, name, email').eq('id', booking.user_id).single()
      ]);

      return {
        id: booking.id,
        hall_name: hall?.name || 'Unknown Hall',
        hall_id: booking.hall_id,
        user_name: profile?.name || 'Unknown User',
        user_email: profile?.email || '',
        purpose: booking.purpose,
        description: booking.description,
        booking_date: booking.booking_date, // DDMMYYYY format
        start_time: booking.start_time,
        end_time: booking.end_time,
        duration_minutes: booking.duration_minutes || 0,
        buffer_start: booking.buffer_start || booking.start_time,
        buffer_end: booking.buffer_end || booking.end_time,
        status: booking.status,
        priority: booking.priority || 'medium',
        equipment_needed: booking.equipment_needed || [],
        attendees_count: booking.attendees_count || 0,
        special_requirements: booking.special_requirements,
        auto_approved: booking.auto_approved || false,
        approved_by: booking.approved_by,
        approved_at: booking.approved_at,
        rejected_reason: booking.rejected_reason,
        admin_notes: booking.admin_notes,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
      };
    } catch (error) {
      console.error('Error in getBookingById:', error);
      throw error;
    }
  }

  /**
   * Log admin actions for audit trail
   */
  private async logAdminAction(
    bookingId: string,
    action: string,
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_activity_logs')
        .insert({
          booking_id: bookingId,
          action,
          notes,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        console.error('Error logging admin action:', error);
        // Don't throw here as this is just logging
      }
    } catch (error) {
      console.error('Error in logAdminAction:', error);
      // Don't throw here as this is just logging
    }
  }

  /**
   * Search bookings by query
   */
  async searchBookings(query: string): Promise<BookingDetails[]> {
    try {
      // Search in booking purpose and description
      const { data: bookingsData, error } = await supabase
        .from('smart_bookings')
        .select('*')
        .or(`purpose.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching bookings:', error);
        throw new Error('Failed to search bookings');
      }

      if (!bookingsData || bookingsData.length === 0) {
        return [];
      }

      // Get unique hall and user IDs for batch fetching
      const hallIds = [...new Set(bookingsData.map(b => b.hall_id).filter(Boolean))];
      const userIds = [...new Set(bookingsData.map(b => b.user_id).filter(Boolean))];

      // Fetch halls data
      const { data: hallsData } = await supabase
        .from('halls')
        .select('id, name')
        .in('id', hallIds);

      // Fetch user profiles data
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      // Create lookup maps for better performance
      const hallsMap = new Map(hallsData?.map(h => [h.id, h]) || []);
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      return bookingsData.map(booking => {
        const hall = hallsMap.get(booking.hall_id);
        const profile = profilesMap.get(booking.user_id);
        
        return {
          id: booking.id,
          hall_name: hall?.name || 'Unknown Hall',
          hall_id: booking.hall_id,
          user_name: profile?.name || 'Unknown User',
          user_email: profile?.email || '',
          purpose: booking.purpose,
          description: booking.description,
          booking_date: booking.booking_date, // DDMMYYYY format
          start_time: booking.start_time,
          end_time: booking.end_time,
          duration_minutes: booking.duration_minutes || 0,
          buffer_start: booking.buffer_start || booking.start_time,
          buffer_end: booking.buffer_end || booking.end_time,
          status: booking.status,
          priority: booking.priority || 'medium',
          equipment_needed: booking.equipment_needed || [],
          attendees_count: booking.attendees_count || 0,
          special_requirements: booking.special_requirements,
          auto_approved: booking.auto_approved || false,
          approved_by: booking.approved_by,
          approved_at: booking.approved_at,
          rejected_reason: booking.rejected_reason,
          admin_notes: booking.admin_notes,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
        };
      });
    } catch (error) {
      console.error('Error in searchBookings:', error);
      throw error;
    }
  }
}

export const bookingOversightService = new BookingOversightService();
