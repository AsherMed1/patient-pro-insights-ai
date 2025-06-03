
import React from 'react';

const ImportGuidelines = () => {
  return (
    <div className="text-sm text-gray-600 space-y-2">
      <p><strong>Required fields:</strong> date_appointment_created, project_name, lead_name</p>
      <p><strong>Date format:</strong> YYYY-MM-DD</p>
      <p><strong>Time format:</strong> HH:MM:SS</p>
      <p><strong>Boolean fields:</strong> Use 'true'/'false' or '1'/'0'</p>
    </div>
  );
};

export default ImportGuidelines;
