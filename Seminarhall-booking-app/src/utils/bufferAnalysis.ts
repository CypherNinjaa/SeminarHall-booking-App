// Test the buffer calculation issue
// Existing booking: 09:00 - 11:00
// New booking: 12:00 - 16:00

const BUFFER_TIME = 44;

function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function addBufferTime(startTime: string, endTime: string): { bufferStart: string; bufferEnd: string } {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  // Add buffer before start time (but not before 6:00 AM)
  const bufferStartMinutes = Math.max(360, startMinutes - BUFFER_TIME); // 360 = 6:00 AM
  // Add buffer after end time (but not after 11:00 PM)
  const bufferEndMinutes = Math.min(1380, endMinutes + BUFFER_TIME); // 1380 = 23:00 (11:00 PM)

  return {
    bufferStart: minutesToTime(bufferStartMinutes),
    bufferEnd: minutesToTime(bufferEndMinutes),
  };
}

// Test current issue
console.log('=== CURRENT ISSUE ANALYSIS ===');

// Existing booking
const existingStart = '09:00';
const existingEnd = '11:00';
const existingBuffer = addBufferTime(existingStart, existingEnd);
console.log(`Existing booking: ${existingStart} - ${existingEnd}`);
console.log(`Existing with buffer: ${existingBuffer.bufferStart} - ${existingBuffer.bufferEnd}`);

// New booking attempt
const newStart = '12:00';
const newEnd = '16:00';
const newBuffer = addBufferTime(newStart, newEnd);
console.log(`New booking: ${newStart} - ${newEnd}`);
console.log(`New with buffer: ${newBuffer.bufferStart} - ${newBuffer.bufferEnd}`);

// Check overlap
const existingEndMinutes = timeToMinutes(existingBuffer.bufferEnd); // 11:44 = 704 minutes
const newStartMinutes = timeToMinutes(newBuffer.bufferStart); // 11:16 = 676 minutes

console.log(`Existing ends at: ${existingBuffer.bufferEnd} (${existingEndMinutes} minutes)`);
console.log(`New starts at: ${newBuffer.bufferStart} (${newStartMinutes} minutes)`);
console.log(`Gap between bookings: ${newStartMinutes - existingEndMinutes} minutes`);
console.log(`Should conflict? ${newStartMinutes < existingEndMinutes ? 'YES' : 'NO'}`);

// The real gap between actual booking times
const actualGap = timeToMinutes(newStart) - timeToMinutes(existingEnd);
console.log(`\nActual gap between bookings: ${actualGap} minutes`);
console.log(`Required buffer: ${BUFFER_TIME} minutes`);
console.log(`Should be allowed? ${actualGap >= BUFFER_TIME ? 'YES' : 'NO'}`);

export { };
