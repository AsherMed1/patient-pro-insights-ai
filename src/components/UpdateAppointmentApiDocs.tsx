
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Database, Edit } from 'lucide-react';

const UpdateAppointmentApiDocs = () => {
  const endpoint = "https://bhabbokbhnqioykjimix.supabase.co/functions/v1/update-appointment-status";
  
  const exampleJsonById = {
    "id": "78f689a7-fa9e-4ec4-ba20-cf894b615eb7",
    "showed": true,
    "confirmed": true,
    "agent": "Sarah Johnson",
    "status": "Showed"
  };

  const exampleJsonByGhlId = {
    "ghl_id": "emrCuta4qHhKfUNatSrI",
    "showed": false,
    "stage_booked": "No Show",
    "status": "No Show"
  };

  const exampleJsonByName = {
    "lead_name": "Sharon Wallace",
    "project_name": "Texas Vascular Institute",
    "confirmed": true,
    "confirmed_number": "+19164599423",
    "status": "Confirmed"
  };

  const statusUpdateExample = {
    "id": "78f689a7-fa9e-4ec4-ba20-cf894b615eb7",
    "status": "Showed",
    "showed": true,
    "procedure_ordered": true
  };

  const curlExampleById = `curl -X PUT "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(exampleJsonById, null, 2)}'`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>Update Appointment Status API Documentation</span>
          </CardTitle>
          <CardDescription>
            API endpoint for updating appointment status and related fields
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Endpoint Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Endpoint</span>
            </h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="default">PUT</Badge>
                <Badge variant="outline">PATCH</Badge>
                <code className="text-sm">{endpoint}</code>
              </div>
            </div>
          </div>

          {/* Identification Methods */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Appointment Identification</h3>
            <p className="text-sm text-gray-600">You can identify the appointment to update using one of these methods:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Method 1</Badge>
                <span className="text-sm font-mono">id</span>
                <span className="text-xs text-gray-500">(UUID)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Method 2</Badge>
                <span className="text-sm font-mono">ghl_id</span>
                <span className="text-xs text-gray-500">(GoHighLevel ID)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Method 3</Badge>
                <span className="text-sm font-mono">lead_name</span>
                <span className="text-xs text-gray-500">(+ optional project_name)</span>
              </div>
            </div>
          </div>

          {/* Status Values */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Status Values</h3>
            <p className="text-sm text-gray-600">Common status values you can use:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Badge variant="default">Showed</Badge>
              <Badge variant="destructive">No Show</Badge>
              <Badge variant="outline">Cancelled</Badge>
              <Badge variant="secondary">Rescheduled</Badge>
              <Badge variant="secondary">Confirmed</Badge>
              <Badge variant="outline">Welcome Call</Badge>
              <Badge variant="default">Won</Badge>
            </div>
          </div>

          {/* Updatable Fields */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Updatable Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">status</span>
                <span className="text-xs text-gray-500">(string)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">showed</span>
                <span className="text-xs text-gray-500">(boolean)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">confirmed</span>
                <span className="text-xs text-gray-500">(boolean)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">procedure_ordered</span>
                <span className="text-xs text-gray-500">(boolean)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">agent</span>
                <span className="text-xs text-gray-500">(string)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">agent_number</span>
                <span className="text-xs text-gray-500">(string)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">confirmed_number</span>
                <span className="text-xs text-gray-500">(string)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">stage_booked</span>
                <span className="text-xs text-gray-500">(string)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">date_of_appointment</span>
                <span className="text-xs text-gray-500">(date)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Optional</Badge>
                <span className="font-mono">requested_time</span>
                <span className="text-xs text-gray-500">(time)</span>
              </div>
            </div>
          </div>

          {/* Example JSON - By ID */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Code className="h-4 w-4" />
              <span>Example 1: Update by ID</span>
            </h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{JSON.stringify(exampleJsonById, null, 2)}</code>
              </pre>
            </div>
          </div>

          {/* Example JSON - By GHL ID */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Code className="h-4 w-4" />
              <span>Example 2: Update by GoHighLevel ID</span>
            </h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{JSON.stringify(exampleJsonByGhlId, null, 2)}</code>
              </pre>
            </div>
          </div>

          {/* Example JSON - By Name */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Code className="h-4 w-4" />
              <span>Example 3: Update by Lead Name</span>
            </h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{JSON.stringify(exampleJsonByName, null, 2)}</code>
              </pre>
            </div>
          </div>

          {/* Example JSON - Status Update */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Code className="h-4 w-4" />
              <span>Example 4: Complete Status Update</span>
            </h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{JSON.stringify(statusUpdateExample, null, 2)}</code>
              </pre>
            </div>
          </div>

          {/* cURL Example */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">cURL Example</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{curlExampleById}</code>
              </pre>
            </div>
          </div>

          {/* Response Format */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Response Format</h3>
            <div className="space-y-2">
              <h4 className="font-medium">Success (200):</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <pre className="text-sm">
{`{
  "success": true,
  "message": "Appointment status updated successfully",
  "data": {
    "id": "78f689a7-fa9e-4ec4-ba20-cf894b615eb7",
    "showed": true,
    "confirmed": true,
    "agent": "Sarah Johnson",
    "status": "Showed",
    "updated_at": "2024-01-15T14:30:00.000Z",
    ...
  },
  "updated_fields": ["showed", "confirmed", "agent", "status"]
}`}
                </pre>
              </div>
              
              <h4 className="font-medium">Error (400):</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <pre className="text-sm">
{`{
  "error": "Missing required identifier",
  "message": "Must provide either 'id' or 'ghl_id' or 'lead_name' to identify the appointment"
}`}
                </pre>
              </div>

              <h4 className="font-medium">Not Found (404):</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <pre className="text-sm">
{`{
  "error": "Appointment not found",
  "message": "No appointment found with the provided identifier"
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Common Use Cases */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Common Use Cases</h3>
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h5 className="font-medium text-blue-900">Mark appointment as showed:</h5>
                <code className="text-sm text-blue-800">{"{ \"id\": \"...\", \"status\": \"Showed\", \"showed\": true }"}</code>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <h5 className="font-medium text-red-900">Mark appointment as no-show:</h5>
                <code className="text-sm text-red-800">{"{ \"id\": \"...\", \"status\": \"No Show\", \"showed\": false }"}</code>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="font-medium text-green-900">Update procedure status:</h5>
                <code className="text-sm text-green-800">{"{ \"id\": \"...\", \"procedure_ordered\": true }"}</code>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <h5 className="font-medium text-purple-900">Assign agent:</h5>
                <code className="text-sm text-purple-800">{"{ \"id\": \"...\", \"agent\": \"John Smith\", \"agent_number\": \"+1234567890\" }"}</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateAppointmentApiDocs;
