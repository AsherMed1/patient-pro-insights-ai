
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Database, Send } from 'lucide-react';

const AllAppointmentsApiDocs = () => {
  const endpoint = "https://bhabbokbhnqioykjimix.supabase.co/functions/v1/all-appointments-api";
  
  const exampleJson = {
    "date_appointment_created": "2024-01-15",
    "lead_name": "John Doe",
    "project_name": "Dental Care",
    "date_of_appointment": "2024-01-20",
    "lead_email": "john.doe@example.com",
    "lead_phone_number": "+1234567890",
    "dob": "06-25-1988",
    "calendar_name": "Dr. Smith Calendar",
    "requested_time": "10:30:00",
    "stage_booked": "consultation",
    "showed": true,
    "confirmed": true,
    "agent": "Sarah Johnson",
    "agent_number": "+1987654321",
    "ghl_id": "ghl_123456",
    "confirmed_number": "+1555123456"
  };

  const curlExample = `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(exampleJson, null, 2)}'`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>All Appointments API Documentation</span>
          </CardTitle>
          <CardDescription>
            API endpoint for adding appointment data to the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Endpoint Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>Endpoint</span>
            </h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="default">POST</Badge>
                <code className="text-sm">{endpoint}</code>
              </div>
            </div>
          </div>

          {/* Required Fields */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Required Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Required</Badge>
                <span className="text-sm font-mono">date_appointment_created</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Required</Badge>
                <span className="text-sm font-mono">lead_name</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Required</Badge>
                <span className="text-sm font-mono">project_name</span>
              </div>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Optional Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">date_of_appointment</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">lead_email</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">lead_phone_number</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">dob (MM-DD-YYYY)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">calendar_name</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">requested_time</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">stage_booked</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">showed</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">confirmed</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">agent</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">agent_number</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">ghl_id</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">confirmed_number</span>
              </div>
            </div>
          </div>

          {/* Example JSON */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Code className="h-4 w-4" />
              <span>Example JSON</span>
            </h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{JSON.stringify(exampleJson, null, 2)}</code>
              </pre>
            </div>
          </div>

          {/* cURL Example */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">cURL Example</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{curlExample}</code>
              </pre>
            </div>
          </div>

          {/* Response Format */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Response Format</h3>
            <div className="space-y-2">
              <h4 className="font-medium">Success (201):</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <pre className="text-sm">
{`{
  "success": true,
  "message": "Appointment created successfully",
  "data": {
    "id": "uuid-generated-id",
    "date_appointment_created": "2024-01-15",
    "lead_name": "John Doe",
    "project_name": "Dental Care",
    ...
  }
}`}
                </pre>
              </div>
              
              <h4 className="font-medium">Error (400):</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <pre className="text-sm">
{`{
  "error": "Missing required fields",
  "missing": ["lead_name"],
  "required": ["date_appointment_created", "lead_name", "project_name"]
}`}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllAppointmentsApiDocs;
