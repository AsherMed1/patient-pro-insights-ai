// One-time utility to sync Buffalo Vascular Care appointment statuses from CSV to database
// This file can be deleted after successful execution

export const statusUpdates = [
  { lead_name: "James Atkinson", date: "2025-10-30", csv_status: "Showed" },
  { lead_name: "Sam Tabone", date: "2025-10-31", csv_status: "Showed" },
  { lead_name: "Al Amanti", date: "2025-10-31", csv_status: "NoShow" },
  { lead_name: "Harry Deans", date: "2025-11-01", csv_status: "NoShow" },
  { lead_name: "Laura Petricca", date: "2025-11-01", csv_status: "Showed" },
  { lead_name: "Ellen Grucella", date: "2025-11-02", csv_status: "NoShow" },
  { lead_name: "Carl Mercuro", date: "2025-11-03", csv_status: "NoShow" },
  { lead_name: "Mr.Carl Mercuro", date: "2025-11-03", csv_status: "NoShow" },
  { lead_name: "David Doktor", date: "2025-11-03", csv_status: "NoShow" },
  { lead_name: "Roxane Amborski", date: "2025-11-04", csv_status: "Rescheduled" },
  { lead_name: "Joseph Schanne", date: "2025-11-05", csv_status: "Showed" },
  { lead_name: "Darrell Glover", date: "2025-11-05", csv_status: "Rescheduled" },
  { lead_name: "John Conti", date: "2025-11-06", csv_status: "Showed" },
  { lead_name: "Ronald Phillips", date: "2025-11-07", csv_status: "NoShow" },
  { lead_name: "Walter Kowalczyk", date: "2025-11-07", csv_status: "Showed" },
  { lead_name: "Jeanne Manzella", date: "2025-11-08", csv_status: "NoShow" },
  { lead_name: "Todd Prest", date: "2025-11-08", csv_status: "NoShow" },
  { lead_name: "Mary Perry", date: "2025-11-09", csv_status: "NoShow" },
  { lead_name: "Darrell Glover", date: "2025-11-13", csv_status: "Showed" },
  { lead_name: "Roxane Amborski", date: "2025-11-13", csv_status: "Showed" },
  { lead_name: "Sandra Capriotti", date: "2025-11-13", csv_status: "Showed" },
  { lead_name: "Judi Coyle", date: "2025-11-13", csv_status: "Showed" },
  { lead_name: "Tina Sheehan", date: "2025-11-14", csv_status: "NoShow" },
  { lead_name: "Carol Thering", date: "2025-11-14", csv_status: "NoShow" },
  { lead_name: "Donna Schubmehl", date: "2025-11-14", csv_status: "NoShow" },
  { lead_name: "Audrey Faiola", date: "2025-11-15", csv_status: "Showed" },
  { lead_name: "Marlene Tomamichel", date: "2025-11-15", csv_status: "NoShow" },
  { lead_name: "Pamela Maddigan", date: "2025-11-15", csv_status: "Showed" },
  { lead_name: "Kerry Breen", date: "2025-11-16", csv_status: "Showed" },
  { lead_name: "Beverly Gilbert", date: "2025-11-18", csv_status: "NoShow" },
  { lead_name: "Ewa Kasper", date: "2025-11-18", csv_status: "Showed" },
  { lead_name: "Kathleen Cooke", date: "2025-11-20", csv_status: "Showed" },
  { lead_name: "Lawrence DiCamillo", date: "2025-11-20", csv_status: "Showed" },
  { lead_name: "Robert Johnston", date: "2025-11-20", csv_status: "Showed" },
  { lead_name: "Virginia Laney", date: "2025-11-20", csv_status: "NoShow" },
  { lead_name: "Amy Tundo", date: "2025-11-21", csv_status: "Showed" },
  { lead_name: "Christine Biestek", date: "2025-11-22", csv_status: "NoShow" },
  { lead_name: "Lauren Decker", date: "2025-11-22", csv_status: "NoShow" },
  { lead_name: "Patricia Delano", date: "2025-11-23", csv_status: "NoShow" },
  { lead_name: "Eileen Osborn", date: "2025-11-23", csv_status: "Chart Created" },
  { lead_name: "Mary Kowalczyk", date: "2025-11-25", csv_status: "Showed" },
  { lead_name: "Suzie Faraci", date: "2025-11-25", csv_status: "Showed" },
  { lead_name: "Dawn Pollock", date: "2025-11-26", csv_status: "Cancelled" },
  { lead_name: "Joan Edwards", date: "2025-11-26", csv_status: "Welcome Call" },
  { lead_name: "Marlene Howard", date: "2025-11-27", csv_status: "Welcome Call" },
  { lead_name: "Mark Mazzaferro", date: "2025-12-02", csv_status: "Welcome Call" },
  { lead_name: "James Gathers", date: "2025-12-04", csv_status: "Scheduled" }
];

export async function syncBuffaloStatuses() {
  try {
    const response = await fetch(
      'https://bhabbokbhnqioykjimix.supabase.co/functions/v1/sync-buffalo-appointment-statuses',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statusUpdates })
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const results = await response.json();
    console.log('Sync Results:', results);
    return results;
  } catch (error) {
    console.error('Failed to sync statuses:', error);
    throw error;
  }
}
