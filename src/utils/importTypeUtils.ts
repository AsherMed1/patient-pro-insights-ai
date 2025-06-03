
export const getTableName = (type: string) => {
  switch (type) {
    case 'appointments':
      return 'all_appointments';
    case 'calls':
      return 'all_calls';
    case 'leads':
      return 'new_leads';
    case 'ad_spend':
      return 'facebook_ad_spend';
    default:
      return null;
  }
};

export const getDisplayName = (type: string) => {
  switch (type) {
    case 'appointments':
      return 'Appointments';
    case 'calls':
      return 'Calls';
    case 'leads':
      return 'Leads';
    case 'ad_spend':
      return 'Ad Spend';
    default:
      return type;
  }
};

export const getEmoji = (type: string) => {
  switch (type) {
    case 'appointments':
      return '📅';
    case 'calls':
      return '📞';
    case 'leads':
      return '👤';
    case 'ad_spend':
      return '💰';
    default:
      return '📄';
  }
};
