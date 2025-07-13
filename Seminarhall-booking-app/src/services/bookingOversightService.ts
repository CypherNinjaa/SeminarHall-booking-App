import { supabase } from '../utils/supabaseSetup';
import { adminLoggingService } from './adminLoggingService';
import { notificationService } from './notificationService';

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
  cancelled_at?: string;
  completed_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FilterOptions {
  status: 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
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
   * Update booking status (approve/reject/cancel/complete)
   */
  async updateBookingStatus(
    bookingId: string, 
    status: 'approved' | 'rejected' | 'cancelled' | 'completed',
    adminNotes?: string,
    rejectedReason?: string
  ): Promise<void> {
    try {
      console.log(`[BookingOversight] Updating booking ${bookingId} to status: ${status} - Using separate queries to avoid FK issues`);

      // Get current admin user for approved_by field
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get booking details for notification - using separate queries to avoid foreign key issues
      const { data: bookingData, error: fetchError } = await supabase
        .from('smart_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError || !bookingData) {
        console.error('Error fetching booking details:', fetchError);
        throw new Error('Failed to fetch booking details');
      }

      // Fetch user and hall data separately to avoid foreign key relationship issues
      const [
        { data: userData, error: userError },
        { data: hallData, error: hallError }
      ] = await Promise.all([
        supabase.from('profiles').select('id, email, name').eq('id', bookingData.user_id).single(),
        supabase.from('halls').select('name').eq('id', bookingData.hall_id).single()
      ]);

      // Add user and hall data to booking data
      const enrichedBookingData = {
        ...bookingData,
        user: userData || { id: bookingData.user_id, email: 'unknown@email.com', name: 'Unknown User' },
        hall: hallData || { name: 'Unknown Hall' }
      };

      const updateData: any = {
        status,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
      };

      // Add specific fields based on status
      if (status === 'approved') {
        updateData.approved_by = user?.id;
        updateData.approved_at = new Date().toISOString();
        updateData.rejected_reason = null; // Clear any previous rejection reason
      } else if (status === 'rejected') {
        updateData.rejected_reason = rejectedReason || adminNotes || 'No reason provided';
        updateData.approved_by = null;
        updateData.approved_at = null;
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('smart_bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) {
        console.error('Error updating booking status:', error);
        throw new Error('Failed to update booking status');
      }

      console.log(`[BookingOversight] Successfully updated booking ${bookingId} to ${status}`);

      // Send notification to user based on status
      if (enrichedBookingData.user?.id) {
        const bookingDetails = {
          id: bookingId,
          hall_name: enrichedBookingData.hall?.name || 'Unknown Hall',
          booking_date: enrichedBookingData.booking_date,
          start_time: enrichedBookingData.start_time,
          end_time: enrichedBookingData.end_time,
          purpose: enrichedBookingData.purpose,
        };

        // Get admin name for notification
        const adminName = user?.email || 'Admin';

        switch (status) {
          case 'approved':
            await notificationService.createBookingApprovalNotification(
              enrichedBookingData.user.id,
              bookingDetails,
              adminName
            );
            break;

          case 'rejected':
            await notificationService.createBookingRejectionNotification(
              enrichedBookingData.user.id,
              bookingDetails,
              rejectedReason || adminNotes || 'No reason provided',
              adminName
            );
            break;

          case 'cancelled':
            await notificationService.createBookingCancellationNotification(
              enrichedBookingData.user.id,
              bookingDetails,
              adminNotes || 'Booking was cancelled by admin',
              adminName
            );
            break;
        }
      }

      // Log the admin action
      await this.logAdminAction(bookingId, `Booking ${status}`, adminNotes || rejectedReason);
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
    cancelled: number;
    completed: number;
    total: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('smart_bookings')
        .select('status');

      if (error) {
        console.error('Error fetching booking statistics:', error);
        throw new Error('Failed to fetch booking statistics');
      }

      const stats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        completed: 0,
        total: data?.length || 0,
      };

      data?.forEach(booking => {
        switch (booking.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'approved':
            stats.approved++;
            break;
          case 'rejected':
            stats.rejected++;
            break;
          case 'cancelled':
            stats.cancelled++;
            break;
          case 'completed':
            stats.completed++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error in getBookingStatistics:', error);
      throw error;
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    bookingId: string,
    reason?: string,
    adminNotes?: string
  ): Promise<void> {
    try {
      console.log(`[BookingOversight] Cancelling booking ${bookingId}`);

      const { error } = await supabase
        .from('smart_bookings')
        .update({
          status: 'cancelled',
          rejected_reason: reason || 'Cancelled by admin',
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Error cancelling booking:', error);
        throw new Error('Failed to cancel booking');
      }

      console.log(`[BookingOversight] Successfully cancelled booking ${bookingId}`);

      // Log the admin action
      await this.logAdminAction(bookingId, 'Booking cancelled', reason || adminNotes);
    } catch (error) {
      console.error('Error in cancelBooking:', error);
      throw error;
    }
  }

  /**
   * Complete a booking (mark as completed)
   */
  async completeBooking(
    bookingId: string,
    adminNotes?: string
  ): Promise<void> {
    try {
      console.log(`[BookingOversight] Completing booking ${bookingId}`);

      const { error } = await supabase
        .from('smart_bookings')
        .update({
          status: 'completed',
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Error completing booking:', error);
        throw new Error('Failed to complete booking');
      }

      console.log(`[BookingOversight] Successfully completed booking ${bookingId}`);

      // Log the admin action
      await this.logAdminAction(bookingId, 'Booking completed', adminNotes);
    } catch (error) {
      console.error('Error in completeBooking:', error);
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
        .from('smart_bookings')
        .select('*')
        .eq('status', 'pending')
        .order('booking_date', { ascending: true });

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

      // Fetch related hall and user data with better error handling
      const [
        { data: hall, error: hallError },
        { data: profileData, error: profileError }
      ] = await Promise.all([
        supabase.from('halls').select('id, name').eq('id', booking.hall_id).single(),
        supabase.from('profiles').select('id, name, email').eq('id', booking.user_id).single()
      ]);

      // Log any errors but don't fail the entire operation
      if (hallError) {
        console.warn('Could not fetch hall data:', hallError);
      }
      
      let profile = profileData;
      if (profileError) {
        console.warn('Could not fetch profile data:', profileError);
        
        // Fallback: use default values when profile is not available
        profile = {
          id: booking.user_id,
          name: 'Unknown User',
          email: 'No email available'
        };
      }

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
    // Use the centralized admin logging service
    await adminLoggingService.logBookingAction(
      bookingId,
      action as any, // Type assertion for compatibility
      notes
    );
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
