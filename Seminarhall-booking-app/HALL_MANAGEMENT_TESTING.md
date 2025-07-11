# Hall Management Feature Testing Guide

## Overview

This guide covers testing the comprehensive hall management system in the Seminar Hall Booking App.

## Prerequisites

### 1. Database Setup

Run these SQL scripts in your Supabase SQL Editor (in order):

1. **Fix COALESCE Error**: `database/fix_coalesce_type_error.sql`
2. **Hall Management Schema**: `database/hall_management_schema.sql`

### 2. User Setup

Ensure you have:

- At least one admin or super_admin user
- Test users with different roles (faculty, admin, super_admin)

## Features to Test

### 1. Navigation Flow

**Test**: Admin Dashboard → Add Hall

- Login as admin/super_admin
- Go to Admin Dashboard
- Click "Add Hall" quick action
- Should navigate directly to AddEditHall screen

**Test**: Hall Management → Add Hall

- Navigate to AdminTabs → Hall Management
- Click the "+" (Add) button
- Should navigate to AddEditHall screen

### 2. Add New Hall

#### Test Case 1: Basic Hall Creation

1. Navigate to AddEditHall screen
2. Fill in required fields:
   - Name: "Test Conference Room"
   - Capacity: "25"
   - Location: "Ground Floor"
3. Leave optional fields empty
4. Click Save
5. **Expected**: Success message, navigate back to hall list

#### Test Case 2: Complete Hall Creation

1. Navigate to AddEditHall screen
2. Fill in all fields:
   - Name: "Advanced Meeting Room"
   - Description: "State-of-the-art meeting facility"
   - Capacity: "40"
   - Location: "Second Floor, West Wing"
   - Building: "Academic Block"
   - Floor Number: "2"
3. Select equipment: Projector, Sound System, Whiteboard
4. Select amenities: Air Conditioning, WiFi, Parking
5. Toggle maintenance mode ON
6. Add maintenance notes: "Monthly maintenance scheduled"
7. Click Save
8. **Expected**: Success message, hall created with all details

#### Test Case 3: Validation Testing

1. Navigate to AddEditHall screen
2. Leave required fields empty
3. Try to save
4. **Expected**: Validation errors for required fields

5. Enter invalid data:
   - Capacity: "abc" or "0" or "1001"
   - Name: Less than 3 characters
6. **Expected**: Specific validation error messages

### 3. Edit Existing Hall

#### Test Case 1: Edit Hall Details

1. Navigate to Hall Management screen
2. Find a hall and click the edit (pencil) icon
3. **Expected**: AddEditHall screen opens with pre-filled data
4. Modify some fields (name, capacity, equipment)
5. Click Save
6. **Expected**: Success message, changes reflected in hall list

#### Test Case 2: Toggle Hall Status

1. Navigate to Hall Management screen
2. Click the status toggle for any hall
3. **Expected**: Confirmation dialog
4. Confirm the action
5. **Expected**: Hall status updated, success message

### 4. Hall Listing and Filtering

#### Test Case 1: View All Halls

1. Navigate to Hall Management screen
2. **Expected**: List of all halls with:
   - Hall image placeholder or actual image
   - Hall name, capacity, location
   - Status badge (Active/Inactive)
   - Equipment icons
   - Edit and status toggle buttons

#### Test Case 2: Search Functionality

1. Use search bar to search for hall name
2. **Expected**: Filtered results
3. Search for location
4. **Expected**: Halls matching location shown
5. Clear search
6. **Expected**: All halls shown again

#### Test Case 3: Filter by Status

1. Toggle "Active Only" filter
2. **Expected**: Only active halls shown
3. Toggle off
4. **Expected**: All halls shown

### 5. Data Persistence

#### Test Case 1: Data Consistency

1. Add a new hall
2. Navigate away and come back
3. **Expected**: New hall appears in list
4. Edit the hall
5. Navigate away and come back
6. **Expected**: Changes are preserved

#### Test Case 2: Real-time Updates

1. Open hall management on two devices/browsers
2. Add/edit hall on one
3. **Expected**: Changes appear on the other (may require refresh)

### 6. Error Handling

#### Test Case 1: Network Error Simulation

1. Disable internet connection
2. Try to save a hall
3. **Expected**: User-friendly error message
4. Re-enable connection and retry
5. **Expected**: Operation succeeds

#### Test Case 2: Permission Testing

1. Login as faculty user
2. Try to access Hall Management
3. **Expected**: Access denied or feature not available

### 7. Mobile Responsiveness

#### Test Case 1: Screen Sizes

1. Test on different screen sizes:
   - Phone (portrait/landscape)
   - Tablet
2. **Expected**: UI adapts properly, all elements accessible

#### Test Case 2: Keyboard Behavior

1. Use on-screen keyboard
2. **Expected**: Form scrolls appropriately, no fields hidden

### 8. Theme Support

#### Test Case 1: Dark/Light Mode

1. Switch between dark and light themes
2. **Expected**: All screens adapt properly
3. Check text readability
4. Check button/input visibility

## Common Issues and Solutions

### Issue 1: Navigation Error

**Error**: "Screen doesn't exist" or navigation fails
**Solution**: Ensure AddEditHall screen is properly registered in navigation

### Issue 2: Form Validation

**Error**: No validation errors shown
**Solution**: Check that error states are properly bound to UI

### Issue 3: Database Errors

**Error**: "COALESCE types cannot be matched"
**Solution**: Run the `fix_coalesce_type_error.sql` script

### Issue 4: Permission Errors

**Error**: "Access denied" when admin tries to create hall
**Solution**: Check RLS policies and user role assignments

## Performance Testing

### Load Testing

1. Create 50+ halls
2. Test scrolling performance
3. Test search performance
4. **Expected**: Smooth operation, no lag

### Memory Testing

1. Navigate between screens multiple times
2. **Expected**: No memory leaks, app remains responsive

## Accessibility Testing

1. Test with screen reader
2. Test keyboard navigation
3. Test color contrast
4. **Expected**: Accessible to users with disabilities

## Success Criteria

✅ **Basic Functionality**

- Can add new halls
- Can edit existing halls
- Can view hall list
- Can search and filter halls

✅ **Data Integrity**

- All data persists correctly
- Validation works properly
- No data loss during operations

✅ **User Experience**

- Intuitive navigation
- Clear error messages
- Responsive design
- Fast performance

✅ **Security**

- Proper permission checks
- Data validation
- Secure API calls

## Post-Testing

After successful testing:

1. Document any bugs found
2. Verify fixes work correctly
3. Test with real users
4. Gather feedback for improvements

## Support

If you encounter issues:

1. Check browser console for errors
2. Check network tab for failed requests
3. Verify database permissions
4. Check user role assignments
