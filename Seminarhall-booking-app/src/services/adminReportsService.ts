import { supabase } from '../utils/supabaseSetup';

export interface ReportMetrics {
  total_bookings: number;
  total_halls: number;
  utilization_rate: number;
  popular_halls: HallUsage[];
  booking_trends: BookingTrend[];
  user_activity: UserActivity[];
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

export type TimeRange = 'week' | 'month' | 'quarter' | 'year';

class AdminReportsService {
  /**
   * Get comprehensive metrics for the specified time range
   */
  async getMetrics(timeRange: TimeRange): Promise<ReportMetrics> {
    try {
      const dateRange = this.getDateRange(timeRange);
      
      const [
        totalBookings,
        totalHalls,
        utilizationRate,
        popularHalls,
        bookingTrends,
        userActivity
      ] = await Promise.all([
        this.getTotalBookings(dateRange),
        this.getTotalHalls(),
        this.getUtilizationRate(dateRange),
        this.getPopularHalls(dateRange),
        this.getBookingTrends(dateRange, timeRange),
        this.getUserActivity(dateRange)
      ]);

      return {
        total_bookings: totalBookings,
        total_halls: totalHalls,
        utilization_rate: utilizationRate,
        popular_halls: popularHalls,
        booking_trends: bookingTrends,
        user_activity: userActivity,
      };
    } catch (error) {
      console.error('Error in getMetrics:', error);
      throw error;
    }
  }

  /**
   * Export data as PDF
   */
  async exportDataAsPDF(timeRange: TimeRange): Promise<string> {
    try {
      // TODO: Implement PDF export using a library like react-native-pdf or similar
      // For now, we'll simulate the export process
      
      const metrics = await this.getMetrics(timeRange);
      
      // In a real implementation, you would:
      // 1. Format the data
      // 2. Generate PDF using a PDF library
      // 3. Save to device storage or share via email/cloud
      // 4. Return the file path or sharing URL
      
      console.log('Exporting PDF with metrics:', metrics);
      
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return 'pdf_export_success';
    } catch (error) {
      console.error('Error in exportDataAsPDF:', error);
      throw error;
    }
  }

  /**
   * Export data as Excel
   */
  async exportDataAsExcel(timeRange: TimeRange): Promise<string> {
    try {
      // TODO: Implement Excel export using a library like react-native-xlsx or similar
      // For now, we'll simulate the export process
      
      const metrics = await this.getMetrics(timeRange);
      
      // In a real implementation, you would:
      // 1. Format the data into Excel format
      // 2. Generate Excel file using a library
      // 3. Save to device storage or share via email/cloud
      // 4. Return the file path or sharing URL
      
      console.log('Exporting Excel with metrics:', metrics);
      
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return 'excel_export_success';
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
      const { count, error } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (error) {
        console.error('Error fetching total bookings:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getTotalBookings:', error);
      return 0;
    }
  }

  /**
   * Get total number of halls
   */
  private async getTotalHalls(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('halls')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching total halls:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getTotalHalls:', error);
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
        .from('bookings')
        .select('start_time, end_time, status')
        .eq('status', 'approved')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (error) {
        console.error('Error fetching bookings for utilization:', error);
        return 0;
      }

      // Simple calculation: assume 8 hours per day as max capacity
      const totalHours = bookings?.length ? bookings.length * 2 : 0; // Assuming avg 2 hours per booking
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
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          hall_id,
          halls:hall_id (
            name
          )
        `)
        .eq('status', 'approved')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (error) {
        console.error('Error fetching hall usage:', error);
        return [];
      }

      // Group by hall and calculate statistics
      const hallUsageMap = new Map<string, { name: string; count: number }>();
      
      data?.forEach(booking => {
        const hallId = booking.hall_id;
        const hallName = (booking.halls as any)?.[0]?.name || 'Unknown Hall';
        
        if (hallUsageMap.has(hallId)) {
          hallUsageMap.get(hallId)!.count++;
        } else {
          hallUsageMap.set(hallId, { name: hallName, count: 1 });
        }
      });

      // Convert to array and sort by usage
      return Array.from(hallUsageMap.entries())
        .map(([hallId, usage]) => ({
          hall_id: hallId,
          hall_name: usage.name,
          bookings_count: usage.count,
          total_hours: usage.count * 2, // Assuming 2 hours average per booking
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
        .from('bookings')
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
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('user_id')
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (error) {
        console.error('Error fetching user activity:', error);
        return [];
      }

      if (!bookings || bookings.length === 0) {
        return [];
      }

      // Get unique user IDs
      const userIds = [...new Set(bookings.map(b => b.user_id).filter(Boolean))];

      // Fetch user profiles data
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, department')
        .in('id', userIds);

      // Create user map
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Group by user and calculate statistics
      const userActivityMap = new Map<string, { name: string; department: string; count: number }>();
      
      bookings.forEach(booking => {
        const userId = booking.user_id;
        const profile = profilesMap.get(userId);
        const userName = profile?.name || 'Unknown User';
        const department = profile?.department || 'Unknown Department';
        
        if (userActivityMap.has(userId)) {
          userActivityMap.get(userId)!.count++;
        } else {
          userActivityMap.set(userId, { name: userName, department, count: 1 });
        }
      });

      // Convert to array and sort by activity
      return Array.from(userActivityMap.entries())
        .map(([userId, activity]) => ({
          user_id: userId,
          user_name: activity.name,
          department: activity.department,
          total_bookings: activity.count,
          total_hours: activity.count * 2, // Assuming 2 hours average per booking
        }))
        .sort((a, b) => b.total_bookings - a.total_bookings)
        .slice(0, 5); // Top 5 users
    } catch (error) {
      console.error('Error in getUserActivity:', error);
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
}

export const adminReportsService = new AdminReportsService();
