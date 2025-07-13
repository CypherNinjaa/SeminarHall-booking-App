import { supabase } from './userManagementService';
import { emailService } from './emailService';

// Enhanced Types for Smart Booking System
export interface SmartBooking {
  id: string;
  user_id: string;
  hall_id: string;
  hall_name?: string;
  user_name?: string;
  user_email?: string;
  booking_date: string; // Format: DDMMYYYY (e.g., "12072025")
  start_time: string; // Format: HH:MM (24-hour, e.g., "09:00")
  end_time: string; // Format: HH:MM (24-hour, e.g., "13:00")
  duration_minutes: number; // Total booking duration in minutes
  purpose: string;
  description?: string;
  attendees_count: number;
  equipment_needed: string[];
  special_requirements?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  priority: 'low' | 'medium' | 'high';
  auto_approved: boolean; // Whether booking was auto-approved
  buffer_start: string; // Start time including buffer (HH:MM)
  buffer_end: string; // End time including buffer (HH:MM)
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  rejected_reason?: string;
  admin_notes?: string;
}

export interface CreateBookingData {
  hall_id: string;
  booking_date: string; // DDMMYYYY format
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  purpose: string;
  description?: string;
  attendees_count: number;
  equipment_needed?: string[];
  special_requirements?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface TimeSlotWithBuffer {
  start_time: string;
  end_time: string;
  buffer_start: string;
  buffer_end: string;
  is_available: boolean;
  conflicting_bookings: SmartBooking[];
  duration_minutes: number;
}

export interface AvailabilityCheck {
  is_available: boolean;
  conflicting_bookings: SmartBooking[];
  suggested_slots: TimeSlotWithBuffer[];
  next_available_slot?: TimeSlotWithBuffer;
}

export interface ConflictResult {
  conflicting_booking_id: string;
  conflicting_start: string;
  conflicting_end: string;
  conflicting_buffer_start: string;
  conflicting_buffer_end: string;
}

class SmartBookingService {
  // Buffer time in minutes (44 minutes as requested)
  private readonly BUFFER_TIME = 44;

  // Throttling for expired booking checks (minimum 2 minutes between checks)
  private lastExpiredBookingCheck = 0;
  private readonly EXPIRED_BOOKING_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes in milliseconds

  // Standard time slots for the day (24-hour format)
  private readonly TIME_SLOTS = [
    { start: '06:00', end: '08:00' }, // Early morning
    { start: '08:00', end: '10:00' }, // Morning
    { start: '10:00', end: '12:00' }, // Late morning
    { start: '12:00', end: '14:00' }, // Afternoon
    { start: '14:00', end: '16:00' }, // Mid afternoon
    { start: '16:00', end: '18:00' }, // Late afternoon
    { start: '18:00', end: '20:00' }, // Evening
    { start: '20:00', end: '22:00' }, // Late evening
  ];

  /**
   * Convert date to DDMMYYYY format
   */
  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return `${day}${month}${year}`;
  }

  /**
   * Parse DDMMYYYY format to Date object
   */
  private parseDate(dateString: string): Date {
    const day = parseInt(dateString.substring(0, 2));
    const month = parseInt(dateString.substring(2, 4)) - 1; // Month is 0-indexed
    const year = parseInt(dateString.substring(4, 8));
    return new Date(year, month, day);
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes since midnight to time string
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Add buffer time to start and end times
   */
  private addBufferTime(startTime: string, endTime: string): { bufferStart: string; bufferEnd: string } {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    // Add buffer before start time (but not before 6:00 AM)
    const bufferStartMinutes = Math.max(360, startMinutes - this.BUFFER_TIME); // 360 = 6:00 AM
    // Add buffer after end time (but not after 11:00 PM)
    const bufferEndMinutes = Math.min(1380, endMinutes + this.BUFFER_TIME); // 1380 = 23:00 (11:00 PM)

    return {
      bufferStart: this.minutesToTime(bufferStartMinutes),
      bufferEnd: this.minutesToTime(bufferEndMinutes),
    };
  }

  /**
   * Calculate duration between two times in minutes
   */
  private calculateDuration(startTime: string, endTime: string): number {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    return endMinutes - startMinutes;
  }

  /**
   * Check if two time ranges overlap (including buffer)
   */
  private hasTimeOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
    includeBuffer: boolean = true
  ): boolean {
    let actualStart1 = start1;
    let actualEnd1 = end1;
    let actualStart2 = start2;
    let actualEnd2 = end2;

    if (includeBuffer) {
      const buffer1 = this.addBufferTime(start1, end1);
      const buffer2 = this.addBufferTime(start2, end2);
      actualStart1 = buffer1.bufferStart;
      actualEnd1 = buffer1.bufferEnd;
      actualStart2 = buffer2.bufferStart;
      actualEnd2 = buffer2.bufferEnd;
    }

    const start1Minutes = this.timeToMinutes(actualStart1);
    const end1Minutes = this.timeToMinutes(actualEnd1);
    const start2Minutes = this.timeToMinutes(actualStart2);
    const end2Minutes = this.timeToMinutes(actualEnd2);

    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  }

  /**
   * Get all bookings for a specific hall and date using booking_details view
   */
  async getBookingsForHallAndDate(hallId: string, date: string): Promise<SmartBooking[]> {
    try {
      const { data, error } = await supabase
        .from('booking_details')
        .select('*')
        .eq('hall_id', hallId)
        .eq('booking_date', date)
        .in('status', ['approved', 'pending'])
        .order('start_time');

      if (error) {
        console.error('Error fetching bookings:', error);
        throw new Error('Failed to fetch bookings');
      }

      // The booking_details view already includes hall_name, user_name, user_email
      return data || [];
    } catch (error) {
      console.error('Error in getBookingsForHallAndDate:', error);
      throw error;
    }
  }

  /**
   * Check availability for a specific time slot with improved buffer logic
   */
  async checkAvailability(
    hallId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<AvailabilityCheck> {
    try {
      console.log(`🔍 Checking availability for ${hallId} on ${date} from ${startTime} to ${endTime}`);
      
      // Get all existing bookings for this hall and date
      const existingBookings = await this.getBookingsForHallAndDate(hallId, date);
      console.log(`📋 Found ${existingBookings.length} existing bookings`);

      // Filter out the booking being edited if provided
      const relevantBookings = excludeBookingId 
        ? existingBookings.filter(booking => booking.id !== excludeBookingId)
        : existingBookings;

      console.log(`📋 Checking against ${relevantBookings.length} relevant bookings`);

      // Check for conflicts with improved logic
      const conflictingBookings: SmartBooking[] = [];
      const startMinutes = this.timeToMinutes(startTime);
      const endMinutes = this.timeToMinutes(endTime);

      for (const booking of relevantBookings) {
        const existingStartMinutes = this.timeToMinutes(booking.start_time);
        const existingEndMinutes = this.timeToMinutes(booking.end_time);

        console.log(`⏰ Comparing with booking: ${booking.start_time}-${booking.end_time} (${booking.purpose})`);

        // Check if there's at least 44 minutes gap between bookings
        const gapAfterExisting = startMinutes - existingEndMinutes;
        const gapBeforeExisting = existingStartMinutes - endMinutes;

        console.log(`   Gap after existing: ${gapAfterExisting} minutes`);
        console.log(`   Gap before existing: ${gapBeforeExisting} minutes`);

        // There's a conflict if:
        // 1. The new booking starts before the existing one ends + 44 min buffer
        // 2. The new booking ends after the existing one starts - 44 min buffer
        const hasConflict = (
          (startMinutes < existingEndMinutes + this.BUFFER_TIME) &&
          (endMinutes > existingStartMinutes - this.BUFFER_TIME)
        );

        console.log(`   Has conflict: ${hasConflict}`);

        if (hasConflict) {
          conflictingBookings.push(booking);
        }
      }

      const isAvailable = conflictingBookings.length === 0;
      console.log(`✅ Final result: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);

      // Generate suggested slots if not available
      let suggestedSlots: TimeSlotWithBuffer[] = [];
      let nextAvailableSlot: TimeSlotWithBuffer | undefined;

      if (!isAvailable) {
        suggestedSlots = await this.generateSuggestedSlots(hallId, date, startTime, endTime);
        nextAvailableSlot = suggestedSlots[0];
      }

      return {
        is_available: isAvailable,
        conflicting_bookings: conflictingBookings,
        suggested_slots: suggestedSlots,
        next_available_slot: nextAvailableSlot,
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Generate suggested alternative time slots using optimized database function
   */
  private async generateSuggestedSlots(
    hallId: string,
    date: string,
    requestedStart: string,
    requestedEnd: string
  ): Promise<TimeSlotWithBuffer[]> {
    try {
      // Use the optimized PostgreSQL function to get available slots
      const { data: availableSlots, error } = await supabase.rpc('get_available_slots', {
        p_hall_id: hallId,
        p_booking_date: date
      });

      if (error) {
        console.error('Error getting available slots:', error);
        // Fallback to manual generation
        return this.generateSuggestedSlotsManual(hallId, date, requestedStart, requestedEnd);
      }

      const requestedDuration = this.calculateDuration(requestedStart, requestedEnd);
      const suggestions: TimeSlotWithBuffer[] = [];

      // Filter and format available slots
      for (const slot of availableSlots || []) {
        if (slot.is_available) {
          const slotDuration = this.calculateDuration(slot.slot_start, slot.slot_end);
          
          // Check if slot can accommodate the requested duration
          if (slotDuration >= requestedDuration) {
            const bufferTimes = this.addBufferTime(slot.slot_start, slot.slot_end);
            suggestions.push({
              start_time: slot.slot_start,
              end_time: slot.slot_end,
              buffer_start: bufferTimes.bufferStart,
              buffer_end: bufferTimes.bufferEnd,
              is_available: true,
              conflicting_bookings: [],
              duration_minutes: slotDuration,
            });

            if (suggestions.length >= 5) break;
          }
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error in generateSuggestedSlots:', error);
      // Fallback to manual generation
      return this.generateSuggestedSlotsManual(hallId, date, requestedStart, requestedEnd);
    }
  }

  /**
   * Manual fallback for generating suggested slots
   */
  private async generateSuggestedSlotsManual(
    hallId: string,
    date: string,
    requestedStart: string,
    requestedEnd: string
  ): Promise<TimeSlotWithBuffer[]> {
    const existingBookings = await this.getBookingsForHallAndDate(hallId, date);
    const requestedDuration = this.calculateDuration(requestedStart, requestedEnd);
    const suggestions: TimeSlotWithBuffer[] = [];

    // Generate time slots throughout the day
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) { // Check every 30 minutes
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endMinutes = this.timeToMinutes(startTime) + requestedDuration;
        
        // Don't go past 23:00 (11 PM)
        if (endMinutes > 1380) break;
        
        const endTime = this.minutesToTime(endMinutes);
        
        // Check if this slot is available
        const hasConflict = existingBookings.some(booking =>
          this.hasTimeOverlap(startTime, endTime, booking.start_time, booking.end_time, true)
        );

        if (!hasConflict) {
          const bufferTimes = this.addBufferTime(startTime, endTime);
          suggestions.push({
            start_time: startTime,
            end_time: endTime,
            buffer_start: bufferTimes.bufferStart,
            buffer_end: bufferTimes.bufferEnd,
            is_available: true,
            conflicting_bookings: [],
            duration_minutes: requestedDuration,
          });

          // Limit suggestions to avoid overwhelming the user
          if (suggestions.length >= 5) break;
        }
      }
      if (suggestions.length >= 5) break;
    }

    return suggestions;
  }

  /**
   * Create a new smart booking
   */
  async createBooking(bookingData: CreateBookingData, userId: string): Promise<SmartBooking> {
    try {
      // Validate input
      if (!bookingData.hall_id || !bookingData.booking_date || !bookingData.start_time || !bookingData.end_time) {
        throw new Error('Missing required booking information');
      }

      // Check if the date is in the past
      const bookingDate = this.parseDate(bookingData.booking_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (bookingDate < today) {
        throw new Error('Cannot book halls for past dates');
      }

      // Validate time format and logic
      const startMinutes = this.timeToMinutes(bookingData.start_time);
      const endMinutes = this.timeToMinutes(bookingData.end_time);
      
      if (startMinutes >= endMinutes) {
        throw new Error('End time must be after start time');
      }

      if (endMinutes - startMinutes < 30) {
        throw new Error('Minimum booking duration is 30 minutes');
      }

      if (startMinutes < 360 || endMinutes > 1380) { // 6:00 AM to 11:00 PM
        throw new Error('Bookings are only allowed between 06:00 and 23:00');
      }

      // Check availability
      const availability = await this.checkAvailability(
        bookingData.hall_id,
        bookingData.booking_date,
        bookingData.start_time,
        bookingData.end_time
      );

      if (!availability.is_available) {
        console.log('🚫 Booking conflicts detected:', availability.conflicting_bookings);
        const conflictDetails = availability.conflicting_bookings
          .map(booking => `${booking.start_time}-${booking.end_time} (${booking.purpose})`)
          .join(', ');
        
        throw new Error(
          `Time slot not available due to ${availability.conflicting_bookings.length} conflicting booking(s): ${conflictDetails}. Please choose a different time or check suggested slots.`
        );
      }

      // Calculate buffer times and duration
      const bufferTimes = this.addBufferTime(bookingData.start_time, bookingData.end_time);
      const duration = this.calculateDuration(bookingData.start_time, bookingData.end_time);

      // Create booking object - Always start as pending for admin approval
      const newBooking = {
        user_id: userId,
        hall_id: bookingData.hall_id,
        booking_date: bookingData.booking_date,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
        duration_minutes: duration,
        purpose: bookingData.purpose,
        description: bookingData.description || null,
        attendees_count: bookingData.attendees_count,
        equipment_needed: bookingData.equipment_needed || [],
        special_requirements: bookingData.special_requirements || null,
        status: 'pending' as const, // Start as pending for admin approval
        priority: bookingData.priority || 'medium',
        auto_approved: false, // Require admin approval
        buffer_start: bufferTimes.bufferStart,
        buffer_end: bufferTimes.bufferEnd,
        approved_at: null, // Will be set when admin approves
      };

      // Insert into database
      const { data, error } = await supabase
        .from('smart_bookings')
        .insert([newBooking])
        .select('*')
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to create booking');
      }

      // Fetch the complete booking details from the view
      const { data: completeBooking, error: viewFetchError } = await supabase
        .from('booking_details')
        .select('*')
        .eq('id', data.id)
        .single();

      if (viewFetchError) {
        console.error('Error fetching complete booking details:', viewFetchError);
        // Return the basic booking data if view fetch fails
        return data;
      }

      // Send booking confirmation email
      try {
        await emailService.sendBookingConfirmation(
          completeBooking.user_email,
          completeBooking.user_name,
          {
            id: completeBooking.id,
            hallName: completeBooking.hall_name,
            bookingDate: completeBooking.booking_date,
            startTime: completeBooking.start_time,
            endTime: completeBooking.end_time,
            purpose: completeBooking.purpose,
          }
        );
        console.log('✅ Booking confirmation email sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send booking confirmation email:', emailError);
        // Don't fail the booking creation if email fails
      }

      return completeBooking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  /**
   * Update an existing booking
   */
  async updateBooking(
    bookingId: string,
    updates: Partial<CreateBookingData>,
    userId: string
  ): Promise<SmartBooking> {
    try {
      // Get existing booking
      const { data: existingBooking, error: fetchError } = await supabase
        .from('smart_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError || !existingBooking) {
        throw new Error('Booking not found');
      }

      // Check if user can edit this booking
      if (existingBooking.user_id !== userId) {
        throw new Error('You can only edit your own bookings');
      }

      // Check if booking can be edited (not completed or cancelled)
      if (['completed', 'cancelled'].includes(existingBooking.status)) {
        throw new Error('Cannot edit completed or cancelled bookings');
      }

      let updatedBooking = { ...existingBooking };

      // If time or date is being changed, validate availability
      if (updates.start_time || updates.end_time || updates.booking_date) {
        const newStartTime = updates.start_time || existingBooking.start_time;
        const newEndTime = updates.end_time || existingBooking.end_time;
        const newDate = updates.booking_date || existingBooking.booking_date;

        const availability = await this.checkAvailability(
          existingBooking.hall_id,
          newDate,
          newStartTime,
          newEndTime,
          bookingId // Exclude current booking from conflict check
        );

        if (!availability.is_available) {
          throw new Error(
            `Time slot not available. ${availability.conflicting_bookings.length} conflicting booking(s) found.`
          );
        }

        // Recalculate buffer times and duration
        const bufferTimes = this.addBufferTime(newStartTime, newEndTime);
        const duration = this.calculateDuration(newStartTime, newEndTime);

        updatedBooking = {
          ...updatedBooking,
          booking_date: newDate,
          start_time: newStartTime,
          end_time: newEndTime,
          duration_minutes: duration,
          buffer_start: bufferTimes.bufferStart,
          buffer_end: bufferTimes.bufferEnd,
        };
      }

      // Apply other updates
      Object.keys(updates).forEach(key => {
        if (key !== 'booking_date' && key !== 'start_time' && key !== 'end_time') {
          (updatedBooking as any)[key] = (updates as any)[key];
        }
      });

      updatedBooking.updated_at = new Date().toISOString();

      // Update in database
      const { data, error } = await supabase
        .from('smart_bookings')
        .update(updatedBooking)
        .eq('id', bookingId)
        .select('*')
        .single();

      if (error) {
        console.error('Update error:', error);
        throw new Error('Failed to update booking');
      }

      // Fetch the complete booking details from the view
      const { data: completeBooking, error: updateViewFetchError } = await supabase
        .from('booking_details')
        .select('*')
        .eq('id', data.id)
        .single();

      if (updateViewFetchError) {
        console.error('Error fetching complete booking details:', updateViewFetchError);
        // Return the basic booking data if view fetch fails
        return data;
      }

      return completeBooking;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<void> {
    try {
      const { data: existingBooking, error: fetchError } = await supabase
        .from('smart_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchError || !existingBooking) {
        throw new Error('Booking not found');
      }

      // Check if user can cancel this booking
      if (existingBooking.user_id !== userId) {
        throw new Error('You can only cancel your own bookings');
      }

      // Check if booking can be cancelled
      if (['completed', 'cancelled'].includes(existingBooking.status)) {
        throw new Error('Booking is already completed or cancelled');
      }

      const { error } = await supabase
        .from('smart_bookings')
        .update({
          status: 'cancelled',
          admin_notes: reason || 'Cancelled by user',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Cancel error:', error);
        throw new Error('Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  /**
   * Get user's bookings using the optimized booking_details view
   */
  async getUserBookings(
    userId: string,
    status?: SmartBooking['status'],
    limit: number = 50
  ): Promise<SmartBooking[]> {
    try {
      let query = supabase
        .from('booking_details')
        .select('*')
        .eq('user_id', userId)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user bookings:', error);
        throw new Error('Failed to fetch bookings');
      }

      // The booking_details view already includes hall_name, user_name, user_email
      return data || [];
    } catch (error) {
      console.error('Error in getUserBookings:', error);
      throw error;
    }
  }

  /**
   * Get available time slots for a hall on a specific date
   */
  async getAvailableSlots(hallId: string, date: string): Promise<TimeSlotWithBuffer[]> {
    try {
      const existingBookings = await this.getBookingsForHallAndDate(hallId, date);
      const availableSlots: TimeSlotWithBuffer[] = [];

      for (const slot of this.TIME_SLOTS) {
        const hasConflict = existingBookings.some(booking =>
          this.hasTimeOverlap(slot.start, slot.end, booking.start_time, booking.end_time, true)
        );

        if (!hasConflict) {
          const bufferTimes = this.addBufferTime(slot.start, slot.end);
          const duration = this.calculateDuration(slot.start, slot.end);

          availableSlots.push({
            start_time: slot.start,
            end_time: slot.end,
            buffer_start: bufferTimes.bufferStart,
            buffer_end: bufferTimes.bufferEnd,
            is_available: true,
            conflicting_bookings: [],
            duration_minutes: duration,
          });
        }
      }

      return availableSlots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Get booking statistics using optimized database function
   */
  async getBookingStats(userId?: string) {
    try {
      // Use the optimized PostgreSQL function
      const { data: dbStats, error } = await supabase.rpc('get_smart_booking_statistics', {
        p_user_id: userId || null
      });

      if (error) {
        console.error('Error calling get_smart_booking_statistics:', error);
        // Fallback to manual calculation
        return await this.getBookingStatsManual(userId);
      }

      // Transform database result to expected format
      return {
        total: dbStats?.total_bookings || 0,
        today: dbStats?.today_bookings || 0,
        thisMonth: dbStats?.this_month_bookings || 0,
        pending: dbStats?.pending_bookings || 0,
        approved: dbStats?.approved_bookings || 0,
        cancelled: dbStats?.cancelled_bookings || 0,
        autoApproved: dbStats?.auto_approved_bookings || 0,
      };
    } catch (error) {
      console.error('Error getting booking stats:', error);
      // Fallback to manual calculation
      return await this.getBookingStatsManual(userId);
    }
  }

  /**
   * Manual fallback for getting booking statistics
   */
  private async getBookingStatsManual(userId?: string) {
    try {
      let baseQuery = supabase.from('smart_bookings').select('*');
      
      if (userId) {
        baseQuery = baseQuery.eq('user_id', userId);
      }

      const { data: allBookings, error } = await baseQuery;

      if (error) {
        throw new Error('Failed to fetch booking statistics');
      }

      const now = new Date();
      const today = this.formatDate(now);
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      const stats = {
        total: allBookings?.length || 0,
        today: allBookings?.filter(b => b.booking_date === today).length || 0,
        thisMonth: allBookings?.filter(b => {
          const bookingDate = this.parseDate(b.booking_date);
          return bookingDate.getMonth() === thisMonth && bookingDate.getFullYear() === thisYear;
        }).length || 0,
        pending: allBookings?.filter(b => b.status === 'pending').length || 0,
        approved: allBookings?.filter(b => b.status === 'approved').length || 0,
        cancelled: allBookings?.filter(b => b.status === 'cancelled').length || 0,
        autoApproved: allBookings?.filter(b => b.auto_approved).length || 0,
      };

      return stats;
    } catch (error) {
      console.error('Error in manual booking stats calculation:', error);
      // Return default stats in case of error
      return {
        total: 0,
        today: 0,
        thisMonth: 0,
        pending: 0,
        approved: 0,
        cancelled: 0,
        autoApproved: 0,
      };
    }
  }

  /**
   * Check if a booking should be marked as completed based on current time
   */
  isBookingCompleted(booking: SmartBooking): boolean {
    if (booking.status !== 'approved') {
      return false; // Only approved bookings can be completed
    }

    const now = new Date();
    const today = now.toLocaleDateString('en-GB').split('/').reverse().join(''); // DDMMYYYY format
    
    // Parse booking date (DDMMYYYY format)
    const bookingDate = booking.booking_date;
    const bookingDay = parseInt(bookingDate.substring(0, 2));
    const bookingMonth = parseInt(bookingDate.substring(2, 4));
    const bookingYear = parseInt(bookingDate.substring(4, 8));
    
    // Parse end time (HH:MM format)
    const [endHour, endMinute] = booking.end_time.split(':').map(Number);
    
    // Create booking end datetime
    const bookingEndTime = new Date(bookingYear, bookingMonth - 1, bookingDay, endHour, endMinute);
    
    // Check if current time is past booking end time
    return now > bookingEndTime;
  }

  /**
   * Update expired bookings to completed status
   */
  async updateExpiredBookings(): Promise<number> {
    try {
      // Check if user is authenticated before proceeding
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.log('🔄 No authenticated user, skipping expired booking check');
        return 0;
      }

      // Throttle the expired booking checks to prevent too frequent calls
      const now = Date.now();
      if (now - this.lastExpiredBookingCheck < this.EXPIRED_BOOKING_CHECK_INTERVAL) {
        console.log('🔄 Skipping expired booking check (throttled)');
        return 0;
      }
      this.lastExpiredBookingCheck = now;

      console.log('🔄 Checking for expired bookings to mark as completed...');
      console.log('🕐 Current time:', new Date().toLocaleString());
      
      // Get all approved bookings
      const { data: approvedBookings, error } = await supabase
        .from('booking_details')
        .select('*')
        .eq('status', 'approved');

      if (error) {
        console.error('Error fetching approved bookings:', error);
        return 0;
      }

      if (!approvedBookings || approvedBookings.length === 0) {
        console.log('🔄 No approved bookings found');
        return 0;
      }

      console.log(`🔄 Found ${approvedBookings.length} approved bookings to check`);

      // Find bookings that should be completed
      const expiredBookings = approvedBookings.filter(booking => {
        const isCompleted = this.isBookingCompleted(booking);
        console.log(`📋 Booking ${booking.id}: ${booking.booking_date} ${booking.end_time} - ${isCompleted ? 'EXPIRED' : 'ACTIVE'}`);
        return isCompleted;
      });
      
      if (expiredBookings.length === 0) {
        console.log('🔄 No expired bookings found');
        return 0;
      }

      console.log(`🔄 Found ${expiredBookings.length} expired bookings to mark as completed`);

      // Update expired bookings to completed status
      const updatePromises = expiredBookings.map(booking => 
        supabase
          .from('smart_bookings')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id)
      );

      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Some bookings failed to update:', errors);
      }

      const successCount = results.filter(result => !result.error).length;
      console.log(`✅ Successfully marked ${successCount} bookings as completed`);
      
      return successCount;
    } catch (error) {
      console.error('Error updating expired bookings:', error);
      return 0;
    }
  }

  /**
   * Get booking status with real-time completion check
   */
  getRealTimeStatus(booking: SmartBooking): SmartBooking['status'] {
    if (this.isBookingCompleted(booking)) {
      return 'completed';
    }
    return booking.status;
  }

  /**
   * Get user bookings with real-time status updates
   */
  async getUserBookingsWithRealTimeStatus(
    userId: string,
    status?: SmartBooking['status'],
    limit: number = 50
  ): Promise<SmartBooking[]> {
    try {
      // First update any expired bookings
      await this.updateExpiredBookings();
      
      // Then fetch the updated bookings
      return await this.getUserBookings(userId, status, limit);
    } catch (error) {
      console.error('Error in getUserBookingsWithRealTimeStatus:', error);
      // Fallback to regular getUserBookings
      return await this.getUserBookings(userId, status, limit);
    }
  }

  /**
   * Get user's booking statistics for the profile screen
   */
  async getUserBookingStats(userId: string): Promise<{
    totalBookings: number;
    thisMonthBookings: number;
    approvedBookings: number;
    pendingBookings: number;
    completedBookings: number;
    averageRating: number;
  }> {
    try {
      // Get all user bookings
      const { data: allBookings, error: allError } = await supabase
        .from('booking_details')
        .select('*')
        .eq('user_id', userId);

      if (allError) {
        console.error('Error fetching all bookings:', allError);
        throw allError;
      }

      // Get current month bookings
      const currentDate = new Date();
      const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
      const currentYear = currentDate.getFullYear();
      const currentMonthPattern = `${String(currentDate.getDate()).padStart(2, '0')}${currentMonth}${currentYear}`;
      
      // Filter bookings for current month (checking if booking_date starts with DDMM of current month)
      const currentMonthString = `${currentMonth}${currentYear}`;
      const thisMonthBookings = allBookings?.filter(booking => 
        booking.booking_date.endsWith(currentMonthString)
      ) || [];

      // Calculate statistics
      const totalBookings = allBookings?.length || 0;
      const approvedBookings = allBookings?.filter(b => b.status === 'approved').length || 0;
      const pendingBookings = allBookings?.filter(b => b.status === 'pending').length || 0;
      const completedBookings = allBookings?.filter(b => b.status === 'completed').length || 0;

      // For rating, we'll use a simple calculation based on approved/completed bookings
      // In a real app, you might have actual user ratings
      const successfulBookings = approvedBookings + completedBookings;
      const averageRating = totalBookings > 0 
        ? Math.min(5.0, 3.5 + (successfulBookings / totalBookings) * 1.5)
        : 0;

      return {
        totalBookings,
        thisMonthBookings: thisMonthBookings.length,
        approvedBookings,
        pendingBookings,
        completedBookings,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      };
    } catch (error) {
      console.error('Error getting user booking stats:', error);
      // Return default values on error
      return {
        totalBookings: 0,
        thisMonthBookings: 0,
        approvedBookings: 0,
        pendingBookings: 0,
        completedBookings: 0,
        averageRating: 0,
      };
    }
  }
}

export const smartBookingService = new SmartBookingService();
