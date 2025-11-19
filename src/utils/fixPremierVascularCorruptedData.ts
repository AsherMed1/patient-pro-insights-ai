import { supabase } from "@/integrations/supabase/client";

// Complete CSV data from Premier Vascular tracking sheet - 67 unique appointments (155 total with reschedules)
const CSV_APPOINTMENTS = [
  { firstName: "Michael", lastName: "Bridgers", apptDate: "9/2/2025 8:00 AM", dob: "1/12/1971", status: "Rescheduled", phone: "14788321261", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Willie", lastName: "Johnson", apptDate: "9/2/2025 3:00 PM", dob: "11/21/1962", status: "Rescheduled", phone: "14783610058", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Tresca", lastName: "Green", apptDate: "9/2/2025 3:40 PM", dob: "1/2/1972", status: "Showed", phone: "14782504472", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Patricia", lastName: "Smalling", apptDate: "9/2/2025 4:00 PM", dob: "8/1/1964", status: "Rescheduled", phone: "14783190409", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Gregory", lastName: "Lockett", apptDate: "9/3/2025 8:00 AM", dob: "10/25/1961", status: "Rescheduled", phone: "14789798788", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Tandra", lastName: "Floyd", apptDate: "9/3/2025 10:00 AM", dob: "5/13/1965", status: "Cancelled", phone: "14782589040", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Charlene", lastName: "Robertson", apptDate: "9/3/2025 4:00 PM", dob: "7/22/1965", status: "Showed", phone: "14782010800", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Cynthia", lastName: "Williams", apptDate: "9/4/2025 8:00 AM", dob: "3/24/1958", status: "Cancelled", phone: "14785497668", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Alan", lastName: "Curtis-Berger", apptDate: "9/4/2025 9:00 AM", dob: "11/1/1972", status: "Cancelled", phone: "19175011308", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Tamika", lastName: "Newsome", apptDate: "9/4/2025 10:00 AM", dob: "6/22/1978", status: "Cancelled", phone: "14787191022", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Shanna", lastName: "Robinson", apptDate: "9/6/2025 2:00 PM", dob: "6/4/1961", status: "Cancelled", phone: "14789562869", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Kimberly", lastName: "Dixon", apptDate: "9/8/2025 10:00 AM", dob: "6/24/1961", status: "No Show", phone: "14783032932", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Gregory", lastName: "Lockett", apptDate: "9/10/2025 8:00 AM", dob: "10/25/1961", status: "Showed", phone: "14789798788", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Michael", lastName: "Bridgers", apptDate: "9/16/2025 1:00 PM", dob: "1/12/1971", status: "No Show", phone: "14788321261", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Cynthia", lastName: "Williams", apptDate: "9/16/2025 4:00 PM", dob: "3/24/1958", status: "Showed", phone: "14785497668", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Willie", lastName: "Johnson", apptDate: "9/17/2025 10:00 AM", dob: "11/21/1962", status: "Showed", phone: "14783610058", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Carmel", lastName: "Woolcock", apptDate: "9/17/2025 2:00 PM", dob: "4/21/1974", status: "Cancelled", phone: "14785589970", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Conquista", lastName: "Smith", apptDate: "9/18/2025 8:00 AM", dob: "10/19/1958", status: "Showed", phone: "19124122255", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Evelyn", lastName: "Williams", apptDate: "9/23/2025 2:00 PM", dob: "12/29/1967", status: "Showed", phone: "14783133074", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Barbara", lastName: "Ross", apptDate: "9/24/2025 10:00 AM", dob: "10/29/1954", status: "Rescheduled", phone: "14783192858", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Brenda", lastName: "Brinson", apptDate: "9/25/2025 2:00 PM", dob: "11/4/1960", status: "Showed", phone: "14783194313", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Angela", lastName: "Trippe", apptDate: "9/29/2025 10:00 AM", dob: "12/10/1956", status: "Showed", phone: "14782189850", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Carol A.", lastName: "Colquitt", apptDate: "10/1/2025 3:00 PM", dob: "9/20/1958", status: "Cancelled", phone: "14789878776", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Beverly", lastName: "Toliver", apptDate: "10/2/2025 9:00 AM", dob: "2/17/1959", status: "Showed", phone: "14784753233", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Amy", lastName: "Smallwood", apptDate: "10/7/2025 9:00 AM", dob: "1/9/1963", status: "Showed", phone: "14782508266", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Brenda S.", lastName: "Thomas", apptDate: "10/14/2025 8:00 AM", dob: "11/10/1964", status: "No Show", phone: "14784766881", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Angela", lastName: "Brown", apptDate: "10/14/2025 9:00 AM", dob: "3/8/1961", status: "Showed", phone: "14785973111", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Barbara", lastName: "Harpe", apptDate: "10/15/2025 9:00 AM", dob: "8/21/1958", status: "No Show", phone: "14783198556", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Cortez L", lastName: "Reed", apptDate: "10/16/2025 2:00 PM", dob: "7/3/1959", status: "No Show", phone: "14786181062", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Brenda", lastName: "Campiglia-Maddox", apptDate: "10/20/2025 3:00 PM", dob: "4/30/1956", status: "Cancelled", phone: "14782872260", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Rosanne", lastName: "Hickson", apptDate: "10/21/2025 1:00 PM", dob: "11/20/1959", status: "Showed", phone: "14782076206", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Patricia", lastName: "Smalling", apptDate: "10/21/2025 2:00 PM", dob: "8/1/1964", status: "Showed", phone: "14783190409", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Pam", lastName: "Lofton", apptDate: "10/22/2025 8:00 AM", dob: "7/20/1957", status: "No Show", phone: "14788211145", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Linda", lastName: "Burgess", apptDate: "10/22/2025 9:00 AM", dob: "5/27/1957", status: "Cancelled", phone: "14782075433", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Tammy", lastName: "Newton", apptDate: "10/23/2025 9:00 AM", dob: "10/3/1961", status: "No Show", phone: "17709559226", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "David", lastName: "Ford", apptDate: "10/23/2025 11:00 AM", dob: "7/18/1956", status: "Cancelled", phone: "14782258006", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Kevin", lastName: "Duffy", apptDate: "10/24/2025 9:00 AM", dob: "", status: "Showed", phone: "14789469770", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Vera", lastName: "McCook", apptDate: "10/24/2025 3:00 PM", dob: "8/18/1958", status: "Showed", phone: "14788084433", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Brendon", lastName: "Banks", apptDate: "10/29/2025 10:00 AM", dob: "10/19/1958", status: "Cancelled", phone: "14787771103", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Cirie", lastName: "Hand", apptDate: "11/5/2025 8:00 AM", dob: "7/28/1962", status: "Cancelled", phone: "14782076215", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Barbara", lastName: "Ross", apptDate: "11/6/2025 9:00 AM", dob: "10/29/1954", status: "Showed", phone: "14783192858", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Ramona", lastName: "Taylor-Bradley", apptDate: "11/10/2025 10:00 AM", dob: "10/8/1962", status: "Cancelled", phone: "14785970800", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Theresa", lastName: "Parker", apptDate: "11/10/2025 1:00 PM", dob: "8/28/1958", status: "Showed", phone: "14782502018", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Christy", lastName: "Henry", apptDate: "11/17/2025 10:00 AM", dob: "11/13/1961", status: "Welcome Call", phone: "14782881771", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Brenda", lastName: "Tate", apptDate: "11/17/2025 2:00 PM", dob: "4/17/1966", status: "Welcome Call", phone: "14782522118", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Shanna", lastName: "Robinson", apptDate: "11/18/2025 3:00 PM", dob: "6/4/1961", status: "Welcome Call", phone: "14789562869", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Anitha", lastName: "McKenzie", apptDate: "11/25/2025 8:00 AM", dob: "8/7/1978", status: "confirmed", phone: "14786196660", calendar: "Request your PFE Consultation at Macon, GA" },
  { firstName: "Annette", lastName: "Henderson", apptDate: "11/26/2025 8:00 AM", dob: "7/24/1960", status: "confirmed", phone: "14788047405", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Alisa", lastName: "Gainous", apptDate: "12/2/2025 10:00 AM", dob: "3/31/1958", status: "Welcome Call", phone: "14787425566", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Chinaka", lastName: "Nwaiwu", apptDate: "12/3/2025 8:00 AM", dob: "10/12/1979", status: "confirmed", phone: "16788037388", calendar: "Request your UFE Consultation at Macon, GA" },
  { firstName: "Billy", lastName: "Reddick", apptDate: "12/3/2025 9:00 AM", dob: "11/17/1953", status: "confirmed", phone: "14782122008", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Brigitte", lastName: "Williams", apptDate: "12/3/2025 10:00 AM", dob: "4/23/1959", status: "Welcome Call", phone: "14787190901", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Brenda", lastName: "Maddox", apptDate: "12/8/2025 10:00 AM", dob: "4/30/1956", status: "Welcome Call", phone: "14782872260", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Carolyn", lastName: "Owens", apptDate: "12/9/2025 9:00 AM", dob: "4/12/1955", status: "Welcome Call", phone: "14785963036", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Star Shamaine", lastName: "Higgins", apptDate: "12/10/2025 2:00 PM", dob: "6/1/1963", status: "confirmed", phone: "16784677356", calendar: "Request your UFE Consultation at Macon, GA" },
  { firstName: "Tamika", lastName: "Newsome", apptDate: "12/15/2025 3:00 PM", dob: "6/22/1978", status: "Welcome Call", phone: "14787191022", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Tandra", lastName: "Floyd", apptDate: "12/16/2025 2:00 PM", dob: "5/13/1965", status: "Welcome Call", phone: "14782589040", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Audrey", lastName: "Jones", apptDate: "12/16/2025 3:00 PM", dob: "10/12/1970", status: "Welcome Call", phone: "14789531266", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Mary", lastName: "McConnell", apptDate: "12/17/2025 8:00 AM", dob: "10/31/1948", status: "Welcome Call", phone: "14782221007", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Michael", lastName: "Bridgers", apptDate: "12/18/2025 8:00 AM", dob: "1/12/1971", status: "Welcome Call", phone: "14788321261", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Willie", lastName: "Johnson", apptDate: "1/20/2026 2:00 PM", dob: "11/21/1962", status: "Welcome Call", phone: "14783610058", calendar: "Request your GAE Consultation at Macon, GA" },
  { firstName: "Brenda", lastName: "Tate", apptDate: "1/27/2026 1:00 PM", dob: "4/17/1966", status: "Welcome Call", phone: "14782522118", calendar: "Request your GAE Consultation at Macon, GA" },
];

// Robust date parser that explicitly handles M/D/YYYY format
function parseCSVDate(csvDate: string): { date: string; time: string } | null {
  if (!csvDate || csvDate.trim() === '') return null;
  
  try {
    // Parse "9/2/2025 8:00 AM" format
    const [datePart, timePart, meridiem] = csvDate.split(/\s+/);
    if (!datePart || !timePart || !meridiem) return null;
    
    const [month, day, year] = datePart.split('/').map(n => parseInt(n, 10));
    if (!month || !day || !year) return null;
    
    // Validate date components
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000) {
      console.warn(`Invalid date components: ${month}/${day}/${year}`);
      return null;
    }
    
    const [hour, minute] = timePart.split(':').map(n => parseInt(n, 10));
    if (hour === undefined || minute === undefined) return null;
    
    // Convert to 24-hour format
    let hour24 = hour;
    if (meridiem.toUpperCase() === 'PM' && hour !== 12) {
      hour24 = hour + 12;
    } else if (meridiem.toUpperCase() === 'AM' && hour === 12) {
      hour24 = 0;
    }
    
    // Format as YYYY-MM-DD
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Format time as HH:MM
    const time = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    return { date: isoDate, time };
  } catch (error) {
    console.error('Error parsing CSV date:', csvDate, error);
    return null;
  }
}

// Parse DOB in M/D/YYYY format to YYYY-MM-DD
function parseCSVDOB(dobStr: string): string | null {
  if (!dobStr || dobStr.trim() === '') return null;
  
  try {
    const [month, day, year] = dobStr.split('/').map(n => parseInt(n, 10));
    if (!month || !day || !year) return null;
    
    // Validate components
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      console.warn(`Invalid DOB components: ${month}/${day}/${year}`);
      return null;
    }
    
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  } catch (error) {
    console.error('Error parsing DOB:', dobStr, error);
    return null;
  }
}

export const fixPremierVascularCorruptedData = async () => {
  console.log('🔧 Starting comprehensive Premier Vascular data fix...');
  
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  
  for (const csvAppt of CSV_APPOINTMENTS) {
    const fullName = `${csvAppt.firstName} ${csvAppt.lastName}`;
    const parsedDate = parseCSVDate(csvAppt.apptDate);
    const parsedDOB = parseCSVDOB(csvAppt.dob);
    
    if (!parsedDate) {
      console.warn(`⚠️ Could not parse appointment date for ${fullName}: ${csvAppt.apptDate}`);
      errorCount++;
      errors.push(`${fullName}: Invalid appointment date`);
      continue;
    }
    
    try {
      // Find matching appointment by name, calendar, and approximate date
      const { data: existingAppts, error: fetchError } = await supabase
        .from('all_appointments')
        .select('*')
        .eq('project_name', 'Premier Vascular')
        .ilike('lead_name', fullName)
        .eq('calendar_name', csvAppt.calendar)
        .order('date_of_appointment', { ascending: false });
      
      if (fetchError) {
        console.error(`❌ Error fetching appointment for ${fullName}:`, fetchError);
        errorCount++;
        errors.push(`${fullName}: Database fetch error`);
        continue;
      }
      
      if (!existingAppts || existingAppts.length === 0) {
        console.warn(`⚠️ No appointment found for ${fullName} in ${csvAppt.calendar}`);
        errorCount++;
        errors.push(`${fullName}: No matching appointment found`);
        continue;
      }
      
      // Find the appointment matching this specific date, or use the most recent one
      let targetAppt = existingAppts.find(a => a.date_of_appointment === parsedDate.date);
      if (!targetAppt) {
        targetAppt = existingAppts[0]; // Use most recent
      }
      
      // Update with correct data from CSV
      const updates: any = {
        date_of_appointment: parsedDate.date,
        requested_time: parsedDate.time,
        status: csvAppt.status,
        lead_phone_number: csvAppt.phone,
        updated_at: new Date().toISOString()
      };
      
      if (parsedDOB) {
        updates.dob = parsedDOB;
      }
      
      const { error: updateError } = await supabase
        .from('all_appointments')
        .update(updates)
        .eq('id', targetAppt.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${fullName}:`, updateError);
        errorCount++;
        errors.push(`${fullName}: Update error`);
      } else {
        console.log(`✅ Fixed: ${fullName} - ${parsedDate.date} ${parsedDate.time}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Exception fixing ${fullName}:`, error);
      errorCount++;
      errors.push(`${fullName}: Exception`);
    }
  }
  
  console.log('\n📊 Fix Summary:');
  console.log(`✅ Successfully fixed: ${successCount} appointments`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️ Errors encountered:');
    errors.forEach(err => console.log(`  - ${err}`));
  }
  
  return { success: successCount, errors: errorCount, errorDetails: errors };
};
