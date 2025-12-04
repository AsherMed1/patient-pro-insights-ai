// GoHighLevel API Client for fetching contact details and insurance cards

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

interface GHLCustomField {
  id: string;
  key: string;
  field_value: string | string[];
}

interface GHLContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  customFields?: GHLCustomField[];
}

interface GHLContactResponse {
  contact: GHLContact;
}

// Common custom field keys that might contain insurance card photos
const INSURANCE_CARD_FIELD_KEYS = [
  'insurance_card',
  'insurance_photo',
  'insurance_id_card',
  'front_of_insurance_card',
  'insurance_card_front',
  'insurance_card_image',
  'insurance_image',
  'insurance_card_photo',
  'card_front',
  'insurance_front'
];

/**
 * Fetch contact details from GoHighLevel API
 */
export async function fetchGHLContact(
  contactId: string,
  apiKey: string
): Promise<GHLContact | null> {
  try {
    console.log(`Fetching GHL contact: ${contactId}`);
    
    const response = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GHL API error (${response.status}):`, errorText);
      return null;
    }

    const data: GHLContactResponse = await response.json();
    console.log(`Successfully fetched GHL contact: ${contactId}`);
    
    return data.contact;
  } catch (error) {
    console.error('Error fetching GHL contact:', error);
    return null;
  }
}

/**
 * Extract URL from JSON format or plain string
 * Handles GHL file upload format: {"uuid": {"url": "https://...", ...}}
 */
function extractUrlFromValue(value: any): string | null {
  if (!value) return null;
  
  // If it's already a URL string
  if (typeof value === 'string' && value.startsWith('http')) {
    return value;
  }
  
  // If it's a JSON string, try to parse and extract URL
  if (typeof value === 'string' && value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value);
      // GHL format: {"uuid": {"url": "https://...", ...}}
      for (const key in parsed) {
        if (parsed[key]?.url && typeof parsed[key].url === 'string') {
          return parsed[key].url;
        }
      }
    } catch (e) {
      // Not valid JSON, ignore
    }
  }
  
  // If it's already an object with nested url
  if (typeof value === 'object' && value !== null) {
    for (const key in value) {
      if (value[key]?.url && typeof value[key].url === 'string') {
        return value[key].url;
      }
    }
  }
  
  return null;
}

/**
 * Extract insurance card URL from contact's custom fields
 * Checks multiple possible field names
 */
export function extractInsuranceCardUrl(contact: GHLContact): string | null {
  if (!contact.customFields || contact.customFields.length === 0) {
    console.log('No custom fields found in contact');
    return null;
  }

  // First, try exact matches with known field keys
  for (const fieldKey of INSURANCE_CARD_FIELD_KEYS) {
    const field = contact.customFields.find(
      f => f.key && f.key.toLowerCase() === fieldKey.toLowerCase()
    );
    
    if (field && field.field_value) {
      const value = Array.isArray(field.field_value) 
        ? field.field_value[0] 
        : field.field_value;
      
      const extractedUrl = extractUrlFromValue(value);
      if (extractedUrl) {
        console.log(`Found insurance card URL in field "${field.key}": ${extractedUrl}`);
        return extractedUrl;
      }
    }
  }

  // If no exact match, look for any field containing "insurance" and "card" with a URL value
  const insuranceField = contact.customFields.find(f => {
    if (!f.key) return false;
    const key = f.key.toLowerCase();
    const hasInsurance = key.includes('insurance');
    const hasCard = key.includes('card') || key.includes('photo') || key.includes('image') || key.includes('upload');
    const value = Array.isArray(f.field_value) ? f.field_value[0] : f.field_value;
    const url = extractUrlFromValue(value);
    
    return hasInsurance && hasCard && url;
  });

  if (insuranceField) {
    const value = Array.isArray(insuranceField.field_value) 
      ? insuranceField.field_value[0] 
      : insuranceField.field_value;
    const extractedUrl = extractUrlFromValue(value);
    if (extractedUrl) {
      console.log(`Found insurance card URL in field "${insuranceField.key}": ${extractedUrl}`);
      return extractedUrl;
    }
  }

  console.log('No insurance card URL found in custom fields');
  return null;
}

/**
 * Fetch insurance card URL for a contact
 */
export async function fetchInsuranceCardUrl(
  contactId: string,
  apiKey: string
): Promise<string | null> {
  const contact = await fetchGHLContact(contactId, apiKey);
  
  if (!contact) {
    return null;
  }

  return extractInsuranceCardUrl(contact);
}
