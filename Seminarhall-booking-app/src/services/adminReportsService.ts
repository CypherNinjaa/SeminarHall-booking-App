import { supabase } from '../utils/supabaseSetup';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export interface ReportMetrics {
  total_bookings: number;
  total_halls: number;
  utilization_rate: number;
  popular_halls: HallUsage[];
  booking_trends: BookingTrend[];
  user_activity: UserActivity[];
  detailed_bookings: DetailedBooking[];
}

export interface HallUsage {
  hall_id: string;
  hall_name: string;
  bookings_count: number;
  total_hours: number;
  utilization_percentage: number;
}

export interface BookingTrend {
  period: string;
  bookings: number;
}

export interface UserActivity {
  user_id: string;
  user_name: string;
  department: string;
  total_bookings: number;
  total_hours: number;
}

export interface DetailedBooking {
  booking_id: string;
  hall_id: string;
  hall_name: string;
  hall_capacity: number;
  hall_location: string;
  hall_type: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  user_department: string;
  user_role: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  duration_hours: number;
  buffer_start: string;
  buffer_end: string;
  purpose: string;
  description: string;
  attendees_count: number;
  equipment_needed: string[];
  special_requirements: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  priority: 'low' | 'medium' | 'high';
  auto_approved: boolean;
  approved_by: string;
  approved_at: string;
  rejected_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  // Legacy fields for compatibility
  cancellation_reason?: string;
  actual_attendees?: number;
  feedback_rating?: number;
  feedback_comments?: string;
}

export type TimeRange = 'week' | 'month' | 'quarter' | 'year';

class AdminReportsService {
  /**
   * Get comprehensive metrics for the specified time range
   */
  async getMetrics(timeRange: TimeRange): Promise<ReportMetrics> {
    try {
      console.log(`[AdminReports] Getting metrics for time range: ${timeRange}`);
      const dateRange = this.getDateRange(timeRange);
      console.log(`[AdminReports] Date range: ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}`);
      
      const [
        totalBookings,
        totalHalls,
        utilizationRate,
        popularHalls,
        bookingTrends,
        userActivity,
        detailedBookings
      ] = await Promise.all([
        this.getTotalBookings(dateRange),
        this.getTotalHalls(),
        this.getUtilizationRate(dateRange),
        this.getPopularHalls(dateRange),
        this.getBookingTrends(dateRange, timeRange),
        this.getUserActivity(dateRange),
        this.getDetailedBookings(dateRange)
      ]);

      console.log(`[AdminReports] Metrics summary: ${totalBookings} bookings, ${totalHalls} halls, ${popularHalls.length} popular halls, ${userActivity.length} active users, ${detailedBookings.length} detailed bookings`);

      return {
        total_bookings: totalBookings,
        total_halls: totalHalls,
        utilization_rate: utilizationRate,
        popular_halls: popularHalls,
        booking_trends: bookingTrends,
        user_activity: userActivity,
        detailed_bookings: detailedBookings,
      };
    } catch (error) {
      console.error('[AdminReports] Error in getMetrics:', error);
      throw error;
    }
  }

  /**
   * Export data as PDF
   */
  async exportDataAsPDF(timeRange: TimeRange): Promise<string> {
    try {
      const metrics = await this.getMetrics(timeRange);
      
      // Create PDF content as HTML (simulated)
      const htmlContent = this.generateHTMLReport(metrics, timeRange);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `seminar-hall-report-${timeRange}-${timestamp}.html`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      // Write HTML content to file
      await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: 'Share Report',
        });
      } else {
        Alert.alert(
          'Export Complete',
          `Report saved to: ${fileUri}`,
          [{ text: 'OK', style: 'default' }]
        );
      }
      
      return fileUri;
    } catch (error) {
      console.error('Error in exportDataAsPDF:', error);
      throw error;
    }
  }

  /**
   * Export data as Excel (CSV format)
   */
  async exportDataAsExcel(timeRange: TimeRange): Promise<string> {
    try {
      const metrics = await this.getMetrics(timeRange);
      
      // Create CSV content
      const csvContent = this.generateCSVReport(metrics, timeRange);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `seminar-hall-data-${timeRange}-${timestamp}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      // Write CSV content to file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Share Data',
        });
      } else {
        Alert.alert(
          'Export Complete',
          `Data saved to: ${fileUri}`,
          [{ text: 'OK', style: 'default' }]
        );
      }
      
      return fileUri;
    } catch (error) {
      console.error('Error in exportDataAsExcel:', error);
      throw error;
    }
  }

  /**
   * Get date range for the specified time period
   */
  private getDateRange(timeRange: TimeRange): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Get total bookings for the date range
   */
  private async getTotalBookings(dateRange: { startDate: Date; endDate: Date }): Promise<number> {
    try {
      console.log(`[AdminReports] Getting total bookings from ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}`);
      
      const { count, error } = await supabase
        .from('smart_bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (error) {
        console.error('[AdminReports] Error fetching total bookings:', error);
        return 0;
      }

      console.log(`[AdminReports] Total bookings count: ${count || 0}`);
      return count || 0;
    } catch (error) {
      console.error('[AdminReports] Error in getTotalBookings:', error);
      return 0;
    }
  }

  /**
   * Get total number of halls
   */
  private async getTotalHalls(): Promise<number> {
    try {
      console.log('[AdminReports] Getting total halls count');
      
      const { count, error } = await supabase
        .from('halls')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (error) {
        console.error('[AdminReports] Error fetching total halls:', error);
        return 0;
      }

      console.log(`[AdminReports] Total halls count: ${count || 0}`);
      return count || 0;
    } catch (error) {
      console.error('[AdminReports] Error in getTotalHalls:', error);
      return 0;
    }
  }

  /**
   * Calculate utilization rate
   */
  private async getUtilizationRate(dateRange: { startDate: Date; endDate: Date }): Promise<number> {
    try {
      // This is a simplified calculation
      // In a real implementation, you'd calculate based on actual hall capacity and booking hours
      
      const { data: bookings, error } = await supabase
        .from('smart_bookings')
        .select('start_time, end_time, status, duration_minutes')
        .eq('status', 'approved')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (error) {
        console.error('Error fetching bookings for utilization:', error);
        return 0;
      }

      // Calculate based on actual duration in minutes
      const totalMinutes = bookings?.reduce((sum, booking) => sum + (booking.duration_minutes || 120), 0) || 0;
      const totalHours = totalMinutes / 60;
      const maxPossibleHours = 8 * 30; // 30 days * 8 hours
      
      return Math.min((totalHours / maxPossibleHours) * 100, 100);
    } catch (error) {
      console.error('Error in getUtilizationRate:', error);
      return 0;
    }
  }

  /**
   * Get popular halls with usage statistics
   */
  private async getPopularHalls(dateRange: { startDate: Date; endDate: Date }): Promise<HallUsage[]> {
    try {
      // Get smart_bookings data without relationships
      const { data: bookings, error: bookingsError } = await supabase
        .from('smart_bookings')
        .select('hall_id, duration_minutes')
        .eq('status', 'approved')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (bookingsError) {
        console.error('Error fetching hall usage:', bookingsError);
        return [];
      }

      if (!bookings || bookings.length === 0) {
        return [];
      }

      // Get unique hall IDs
      const hallIds = [...new Set(bookings.map(b => b.hall_id).filter(Boolean))];

      // Fetch halls data
      const { data: halls } = await supabase
        .from('halls')
        .select('id, name')
        .in('id', hallIds);

      // Create halls map
      const hallsMap = new Map(halls?.map(h => [h.id, h]) || []);

      // Group by hall and calculate statistics
      const hallUsageMap = new Map<string, { name: string; count: number; totalMinutes: number }>();
      
      bookings.forEach(booking => {
        const hallId = booking.hall_id;
        const hall = hallsMap.get(hallId);
        const hallName = hall?.name || 'Unknown Hall';
        const duration = booking.duration_minutes || 120; // Default 2 hours
        
        if (hallUsageMap.has(hallId)) {
          const existing = hallUsageMap.get(hallId)!;
          existing.count++;
          existing.totalMinutes += duration;
        } else {
          hallUsageMap.set(hallId, { name: hallName, count: 1, totalMinutes: duration });
        }
      });

      // Convert to array and sort by usage
      return Array.from(hallUsageMap.entries())
        .map(([hallId, usage]) => ({
          hall_id: hallId,
          hall_name: usage.name,
          bookings_count: usage.count,
          total_hours: Math.round(usage.totalMinutes / 60 * 10) / 10, // Round to 1 decimal
          utilization_percentage: Math.min((usage.count / 30) * 100, 100), // Max 30 bookings per month
        }))
        .sort((a, b) => b.bookings_count - a.bookings_count)
        .slice(0, 5); // Top 5 halls
    } catch (error) {
      console.error('Error in getPopularHalls:', error);
      return [];
    }
  }

  /**
   * Get booking trends over time
   */
  private async getBookingTrends(
    dateRange: { startDate: Date; endDate: Date },
    timeRange: TimeRange
  ): Promise<BookingTrend[]> {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd group by specific time periods and calculate trends
      
      const { data, error } = await supabase
        .from('smart_bookings')
        .select('created_at')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching booking trends:', error);
        return [];
      }

      // Group bookings by time period
      const trends: BookingTrend[] = [];
      const periodLength = timeRange === 'week' ? 1 : timeRange === 'month' ? 7 : 30;
      
      for (let i = 0; i < 4; i++) {
        const periodStart = new Date(dateRange.startDate);
        periodStart.setDate(periodStart.getDate() + (i * periodLength));
        
        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + periodLength);
        
        const periodBookings = data?.filter(booking => {
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= periodStart && bookingDate < periodEnd;
        }) || [];

        trends.push({
          period: this.formatPeriodLabel(periodStart, timeRange, i + 1),
          bookings: periodBookings.length,
        });
      }

      return trends;
    } catch (error) {
      console.error('Error in getBookingTrends:', error);
      return [];
    }
  }

  /**
   * Get user activity statistics
   */
  private async getUserActivity(dateRange: { startDate: Date; endDate: Date }): Promise<UserActivity[]> {
    try {
      console.log(`[AdminReports] Getting user activity from ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}`);
      
      // Get smart_bookings data without relationships
      const { data: bookings, error: bookingsError } = await supabase
        .from('smart_bookings')
        .select('user_id, duration_minutes')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (bookingsError) {
        console.error('[AdminReports] Error fetching user activity:', bookingsError);
        return [];
      }

      console.log(`[AdminReports] Found ${bookings?.length || 0} bookings for user activity`);

      if (!bookings || bookings.length === 0) {
        console.log('[AdminReports] No bookings found for user activity');
        return [];
      }

      // Get unique user IDs
      const userIds = [...new Set(bookings.map(b => b.user_id).filter(Boolean))];
      console.log(`[AdminReports] Found ${userIds.length} unique users`);

      // Fetch user profiles data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, department')
        .in('id', userIds);

      if (profilesError) {
        console.error('[AdminReports] Error fetching profiles:', profilesError);
      }

      console.log(`[AdminReports] Found ${profiles?.length || 0} profiles`);

      // Create user map
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Group by user and calculate statistics
      const userActivityMap = new Map<string, { name: string; department: string; count: number; totalMinutes: number }>();
      
      bookings.forEach(booking => {
        const userId = booking.user_id;
        const profile = profilesMap.get(userId);
        const userName = profile?.name || 'Unknown User';
        const department = profile?.department || 'Unknown Department';
        const duration = booking.duration_minutes || 120; // Default 2 hours
        
        if (userActivityMap.has(userId)) {
          const existing = userActivityMap.get(userId)!;
          existing.count++;
          existing.totalMinutes += duration;
        } else {
          userActivityMap.set(userId, { name: userName, department, count: 1, totalMinutes: duration });
        }
      });

      console.log(`[AdminReports] Processed user activity for ${userActivityMap.size} users`);

      // Convert to array and sort by activity
      const result = Array.from(userActivityMap.entries())
        .map(([userId, activity]) => ({
          user_id: userId,
          user_name: activity.name,
          department: activity.department,
          total_bookings: activity.count,
          total_hours: Math.round(activity.totalMinutes / 60 * 10) / 10, // Round to 1 decimal
        }))
        .sort((a, b) => b.total_bookings - a.total_bookings)
        .slice(0, 5); // Top 5 users

      console.log(`[AdminReports] Returning ${result.length} top users`);
      return result;
    } catch (error) {
      console.error('[AdminReports] Error in getUserActivity:', error);
      return [];
    }
  }

  /**
   * Get detailed bookings for comprehensive analysis
   */
  private async getDetailedBookings(dateRange: { startDate: Date; endDate: Date }): Promise<DetailedBooking[]> {
    try {
      console.log(`[AdminReports] Getting detailed bookings from ${dateRange.startDate.toISOString().split('T')[0]} to ${dateRange.endDate.toISOString().split('T')[0]}`);
      
      // First, get smart_bookings data without relationships
      const { data: bookings, error: bookingsError } = await supabase
        .from('smart_bookings')
        .select(`
          id,
          hall_id,
          user_id,
          booking_date,
          start_time,
          end_time,
          duration_minutes,
          buffer_start,
          buffer_end,
          purpose,
          description,
          attendees_count,
          equipment_needed,
          special_requirements,
          status,
          priority,
          auto_approved,
          approved_by,
          approved_at,
          rejected_reason,
          admin_notes,
          created_at,
          updated_at
        `)
        .gte('booking_date', dateRange.startDate.toISOString().split('T')[0])
        .lte('booking_date', dateRange.endDate.toISOString().split('T')[0])
        .order('booking_date', { ascending: false });

      if (bookingsError) {
        console.error('[AdminReports] Error fetching bookings:', bookingsError);
        return [];
      }

      console.log(`[AdminReports] Found ${bookings?.length || 0} detailed bookings`);

      if (!bookings || bookings.length === 0) {
        console.log('[AdminReports] No bookings found for detailed analysis');
        return [];
      }

      // Get unique hall IDs and user IDs
      const hallIds = [...new Set(bookings.map(b => b.hall_id).filter(Boolean))];
      const userIds = [...new Set(bookings.map(b => b.user_id).filter(Boolean))];
      const approverIds = [...new Set(bookings.map(b => b.approved_by).filter(Boolean))];

      console.log(`[AdminReports] Processing ${hallIds.length} halls, ${userIds.length} users, ${approverIds.length} approvers`);

      // Fetch halls data
      const { data: halls, error: hallsError } = await supabase
        .from('halls')
        .select('id, name, capacity, location, type')
        .in('id', hallIds);

      if (hallsError) {
        console.error('[AdminReports] Error fetching halls:', hallsError);
      }

      // Fetch profiles data for users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, department, role')
        .in('id', userIds);

      if (profilesError) {
        console.error('[AdminReports] Error fetching profiles:', profilesError);
      }

      // Fetch approver profiles
      const { data: approvers, error: approversError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', approverIds);

      if (approversError) {
        console.error('[AdminReports] Error fetching approvers:', approversError);
      }

      console.log(`[AdminReports] Found ${halls?.length || 0} halls, ${profiles?.length || 0} profiles, ${approvers?.length || 0} approvers`);

      // Create lookup maps
      const hallsMap = new Map(halls?.map(h => [h.id, h]) || []);
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const approversMap = new Map(approvers?.map(a => [a.id, a]) || []);

      // Transform data to match DetailedBooking interface
      const result = bookings.map((booking: any) => {
        const hall = hallsMap.get(booking.hall_id);
        const profile = profilesMap.get(booking.user_id);
        const approver = approversMap.get(booking.approved_by);
        const durationHours = (booking.duration_minutes || 120) / 60; // Convert minutes to hours

        return {
          booking_id: booking.id,
          hall_id: booking.hall_id,
          hall_name: hall?.name || 'Unknown Hall',
          hall_capacity: hall?.capacity || 0,
          hall_location: hall?.location || 'Unknown Location',
          hall_type: hall?.type || 'Unknown Type',
          user_id: booking.user_id,
          user_name: profile?.name || 'Unknown User',
          user_email: profile?.email || 'Unknown Email',
          user_phone: profile?.phone || 'Unknown Phone',
          user_department: profile?.department || 'Unknown Department',
          user_role: profile?.role || 'Unknown Role',
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          duration_minutes: booking.duration_minutes || 120,
          duration_hours: Number(durationHours.toFixed(2)),
          buffer_start: booking.buffer_start || booking.start_time,
          buffer_end: booking.buffer_end || booking.end_time,
          purpose: booking.purpose || 'No purpose specified',
          description: booking.description || 'No description provided',
          attendees_count: booking.attendees_count || 0,
          equipment_needed: booking.equipment_needed || [],
          special_requirements: booking.special_requirements || 'None',
          status: booking.status,
          priority: booking.priority || 'medium',
          auto_approved: booking.auto_approved || false,
          approved_by: approver?.name || (booking.auto_approved ? 'Auto-approved' : 'Pending'),
          approved_at: booking.approved_at || booking.created_at,
          rejected_reason: booking.rejected_reason,
          admin_notes: booking.admin_notes,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          // Legacy compatibility fields
          cancellation_reason: booking.rejected_reason,
          actual_attendees: booking.attendees_count,
          feedback_rating: undefined,
          feedback_comments: booking.admin_notes,
        } as DetailedBooking;
      });

      console.log(`[AdminReports] Returning ${result.length} detailed bookings`);
      return result;
    } catch (error) {
      console.error('[AdminReports] Error in getDetailedBookings:', error);
      return [];
    }
  }

  /**
   * Format period label for trends
   */
  private formatPeriodLabel(date: Date, timeRange: TimeRange, periodNumber: number): string {
    switch (timeRange) {
      case 'week':
        return `Day ${periodNumber}`;
      case 'month':
        return `Week ${periodNumber}`;
      case 'quarter':
        return `Month ${periodNumber}`;
      case 'year':
        return `Q${periodNumber}`;
      default:
        return `Period ${periodNumber}`;
    }
  }

  /**
   * Generate HTML report content
   */
  private generateHTMLReport(metrics: ReportMetrics, timeRange: TimeRange): string {
    const currentDate = new Date().toLocaleDateString();
    const timeRangeLabel = timeRange.charAt(0).toUpperCase() + timeRange.slice(1);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seminar Hall Report - ${timeRangeLabel}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .metric-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
        .metric-label { color: #666; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .footer { margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Seminar Hall Analytics Report</h1>
        <p>Period: ${timeRangeLabel} | Generated: ${currentDate}</p>
    </div>

    <div class="metrics">
        <div class="metric-card">
            <div class="metric-value">${metrics.total_bookings}</div>
            <div class="metric-label">Total Bookings</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${metrics.total_halls}</div>
            <div class="metric-label">Active Halls</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${metrics.utilization_rate}%</div>
            <div class="metric-label">Utilization Rate</div>
        </div>
    </div>

    <div class="section">
        <h2>🏛️ Popular Halls</h2>
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Hall Name</th>
                    <th>Bookings</th>
                    <th>Total Hours</th>
                    <th>Utilization %</th>
                </tr>
            </thead>
            <tbody>
                ${metrics.popular_halls.map((hall, index) => `
                    <tr>
                        <td>#${index + 1}</td>
                        <td>${hall.hall_name}</td>
                        <td>${hall.bookings_count}</td>
                        <td>${hall.total_hours}</td>
                        <td>${hall.utilization_percentage.toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>👥 Top Users</h2>
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>User Name</th>
                    <th>Department</th>
                    <th>Total Bookings</th>
                    <th>Total Hours</th>
                </tr>
            </thead>
            <tbody>
                ${metrics.user_activity.map((user, index) => `
                    <tr>
                        <td>#${index + 1}</td>
                        <td>${user.user_name}</td>
                        <td>${user.department}</td>
                        <td>${user.total_bookings}</td>
                        <td>${user.total_hours}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>📋 Detailed Booking Records</h2>
        <p style="color: #666; margin-bottom: 15px;">Complete booking information for data analysis</p>
        <table>
            <thead>
                <tr>
                    <th>Booking ID</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Hall</th>
                    <th>Location</th>
                    <th>Capacity</th>
                    <th>Booked By</th>
                    <th>Department</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Purpose</th>
                    <th>Attendees</th>
                    <th>Status</th>
                    <th>Equipment</th>
                    <th>Special Requirements</th>
                    <th>Approved By</th>
                    <th>Created At</th>
                </tr>
            </thead>
            <tbody>
                ${metrics.detailed_bookings.map((booking) => `
                    <tr>
                        <td>${booking.booking_id.substring(0, 8)}...</td>
                        <td>${new Date(booking.booking_date).toLocaleDateString()}</td>
                        <td>${booking.start_time} - ${booking.end_time}</td>
                        <td>${booking.duration_hours}h</td>
                        <td>${booking.hall_name}</td>
                        <td>${booking.hall_location}</td>
                        <td>${booking.hall_capacity}</td>
                        <td>${booking.user_name}</td>
                        <td>${booking.user_department}</td>
                        <td>${booking.user_email}</td>
                        <td>${booking.user_phone}</td>
                        <td>${booking.purpose.length > 50 ? booking.purpose.substring(0, 50) + '...' : booking.purpose}</td>
                        <td>${booking.attendees_count}</td>
                        <td><span style="
                            padding: 2px 8px; 
                            border-radius: 12px; 
                            font-size: 12px; 
                            background: ${booking.status === 'approved' ? '#d1fae5' : booking.status === 'pending' ? '#fef3c7' : booking.status === 'cancelled' ? '#fee2e2' : booking.status === 'rejected' ? '#fee2e2' : '#f3f4f6'}; 
                            color: ${booking.status === 'approved' ? '#059669' : booking.status === 'pending' ? '#d97706' : booking.status === 'cancelled' ? '#dc2626' : booking.status === 'rejected' ? '#dc2626' : '#374151'};
                        ">${booking.status.toUpperCase()}</span></td>
                        <td>${Array.isArray(booking.equipment_needed) ? booking.equipment_needed.join(', ') : booking.equipment_needed}</td>
                        <td>${booking.special_requirements}</td>
                        <td>${booking.approved_by}</td>
                        <td>${new Date(booking.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p style="color: #666; font-size: 12px; margin-top: 15px;">
            📊 Total Records: ${metrics.detailed_bookings.length} | 
            Approved: ${metrics.detailed_bookings.filter(b => b.status === 'approved').length} | 
            Pending: ${metrics.detailed_bookings.filter(b => b.status === 'pending').length} | 
            Cancelled: ${metrics.detailed_bookings.filter(b => b.status === 'cancelled').length}
        </p>
    </div>

    <div class="footer">
        <p>📈 This report was generated automatically by the Seminar Hall Booking System.</p>
        <p>For questions or support, please contact the system administrator.</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate CSV report content
   */
  private generateCSVReport(metrics: ReportMetrics, timeRange: TimeRange): string {
    const currentDate = new Date().toLocaleDateString();
    const timeRangeLabel = timeRange.charAt(0).toUpperCase() + timeRange.slice(1);
    
    let csvContent = '';
    
    // Header
    csvContent += `Seminar Hall Analytics Report\n`;
    csvContent += `Period: ${timeRangeLabel}\n`;
    csvContent += `Generated: ${currentDate}\n\n`;
    
    // Summary Metrics
    csvContent += `SUMMARY METRICS\n`;
    csvContent += `Metric,Value\n`;
    csvContent += `Total Bookings,${metrics.total_bookings}\n`;
    csvContent += `Active Halls,${metrics.total_halls}\n`;
    csvContent += `Utilization Rate,${metrics.utilization_rate}%\n\n`;
    
    // Popular Halls
    csvContent += `POPULAR HALLS\n`;
    csvContent += `Rank,Hall Name,Bookings Count,Total Hours,Utilization %\n`;
    metrics.popular_halls.forEach((hall, index) => {
      csvContent += `${index + 1},${hall.hall_name},${hall.bookings_count},${hall.total_hours},${hall.utilization_percentage.toFixed(1)}%\n`;
    });
    csvContent += `\n`;
    
    // User Activity
    csvContent += `TOP USERS\n`;
    csvContent += `Rank,User Name,Department,Total Bookings,Total Hours\n`;
    metrics.user_activity.forEach((user, index) => {
      csvContent += `${index + 1},${user.user_name},${user.department},${user.total_bookings},${user.total_hours}\n`;
    });
    csvContent += `\n`;
    
    // Booking Trends
    csvContent += `BOOKING TRENDS\n`;
    csvContent += `Period,Bookings\n`;
    metrics.booking_trends.forEach((trend) => {
      csvContent += `${trend.period},${trend.bookings}\n`;
    });
    csvContent += `\n`;
    
    // Detailed Bookings - Main data for analysis
    csvContent += `DETAILED BOOKING RECORDS\n`;
    csvContent += `Booking ID,Date,Start Time,End Time,Duration (Hours),Hall Name,Hall Location,Hall Type,Hall Capacity,User Name,User Email,User Phone,User Department,User Role,Purpose,Attendees Count,Actual Attendees,Equipment Requested,Special Requirements,Status,Created At,Updated At,Approved By,Approved At,Cancellation Reason,Feedback Rating,Feedback Comments\n`;
    
    metrics.detailed_bookings.forEach((booking) => {
      // Escape commas in text fields
      const escapeCsvField = (field: any) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      const equipmentStr = Array.isArray(booking.equipment_needed) 
        ? booking.equipment_needed.join('; ') 
        : booking.equipment_needed || '';
      
      csvContent += `${escapeCsvField(booking.booking_id)},`;
      csvContent += `${escapeCsvField(booking.booking_date)},`;
      csvContent += `${escapeCsvField(booking.start_time)},`;
      csvContent += `${escapeCsvField(booking.end_time)},`;
      csvContent += `${escapeCsvField(booking.duration_hours)},`;
      csvContent += `${escapeCsvField(booking.hall_name)},`;
      csvContent += `${escapeCsvField(booking.hall_location)},`;
      csvContent += `${escapeCsvField(booking.hall_type)},`;
      csvContent += `${escapeCsvField(booking.hall_capacity)},`;
      csvContent += `${escapeCsvField(booking.user_name)},`;
      csvContent += `${escapeCsvField(booking.user_email)},`;
      csvContent += `${escapeCsvField(booking.user_phone)},`;
      csvContent += `${escapeCsvField(booking.user_department)},`;
      csvContent += `${escapeCsvField(booking.user_role)},`;
      csvContent += `${escapeCsvField(booking.purpose)},`;
      csvContent += `${escapeCsvField(booking.attendees_count)},`;
      csvContent += `${escapeCsvField(booking.actual_attendees || '')},`;
      csvContent += `${escapeCsvField(equipmentStr)},`;
      csvContent += `${escapeCsvField(booking.special_requirements)},`;
      csvContent += `${escapeCsvField(booking.status)},`;
      csvContent += `${escapeCsvField(booking.created_at)},`;
      csvContent += `${escapeCsvField(booking.updated_at)},`;
      csvContent += `${escapeCsvField(booking.approved_by)},`;
      csvContent += `${escapeCsvField(booking.approved_at)},`;
      csvContent += `${escapeCsvField(booking.cancellation_reason || '')},`;
      csvContent += `${escapeCsvField(booking.feedback_rating || '')},`;
      csvContent += `${escapeCsvField(booking.feedback_comments || '')}\n`;
    });
    
    return csvContent;
  }

  /**
   * Debug method to check database contents
   */
  async debugDatabaseContents(): Promise<void> {
    try {
      console.log('[DEBUG] Checking database contents...');
      
      // Check smart_bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('smart_bookings')
        .select('id, user_id, hall_id, booking_date, status, created_at')
        .limit(5);
      
      console.log('[DEBUG] Smart bookings sample:', bookings);
      if (bookingsError) console.error('[DEBUG] Bookings error:', bookingsError);
      
      // Check halls
      const { data: halls, error: hallsError } = await supabase
        .from('halls')
        .select('id, name, is_active')
        .limit(5);
      
      console.log('[DEBUG] Halls sample:', halls);
      if (hallsError) console.error('[DEBUG] Halls error:', hallsError);
      
      // Check profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, role, is_active')
        .limit(5);
      
      console.log('[DEBUG] Profiles sample:', profiles);
      if (profilesError) console.error('[DEBUG] Profiles error:', profilesError);
      
      // Count totals
      const { count: bookingsCount } = await supabase
        .from('smart_bookings')
        .select('*', { count: 'exact', head: true });
      
      const { count: hallsCount } = await supabase
        .from('halls')
        .select('*', { count: 'exact', head: true });
      
      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      console.log('[DEBUG] Total counts:', {
        bookings: bookingsCount,
        halls: hallsCount,
        profiles: profilesCount
      });
      
    } catch (error) {
      console.error('[DEBUG] Error checking database:', error);
    }
  }
}

export const adminReportsService = new AdminReportsService();
