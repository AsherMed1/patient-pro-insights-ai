import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useState } from 'react';

const AllCallsApiDocs = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Use the correct Supabase function URL
  const apiUrl = "https://bhabbokbhnqioykjimix.supabase.co/functions/v1/all-calls-api";

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const samplePayload = {
    lead_name: "Jane Smith",
    lead_phone_number: "+1234567890",
    project_name: "Medical Center Campaign",
    date: "2024-01-15",
    call_datetime: "2024-01-15T14:30:00Z",
    direction: "outbound",
    status: "lead_answered",
    duration_seconds: 180,
    agent: "John Agent",
    recording_url: "https://example.com/recording.mp3",
    call_summary: "Lead interested in procedure, scheduled follow-up"
  };

  const curlExample = `curl -X POST "${apiUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(samplePayload, null, 2)}'`;

  const jsExample = `// JavaScript/Node.js example
const response = await fetch('${apiUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${JSON.stringify(samplePayload, null, 2)})
});

const result = await response.json();
console.log(result);`;

  const pythonExample = `# Python example
import requests
import json

url = "${apiUrl}"
payload = ${JSON.stringify(samplePayload, null, 2)}

response = requests.post(url, json=payload)
result = response.json()
print(result)`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>All Calls API</span>
            <Badge variant="outline">POST</Badge>
          </CardTitle>
          <CardDescription>
            API endpoint for creating call records via JSON requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Endpoint URL:</h4>
            <div className="flex items-center space-x-2">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm flex-1">
                {apiUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(apiUrl, 'url')}
              >
                {copiedSection === 'url' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Required Fields:</h4>
            <ul className="text-sm space-y-1">
              <li><code className="bg-gray-100 px-1 rounded">lead_name</code> - Name of the lead (string)</li>
              <li><code className="bg-gray-100 px-1 rounded">lead_phone_number</code> - Phone number of the lead (string)</li>
              <li><code className="bg-gray-100 px-1 rounded">project_name</code> - Project or campaign name (string)</li>
              <li><code className="bg-gray-100 px-1 rounded">date</code> - Date in YYYY-MM-DD format (string)</li>
              <li><code className="bg-gray-100 px-1 rounded">call_datetime</code> - Call date and time in ISO 8601 format (string)</li>
              <li><code className="bg-gray-100 px-1 rounded">direction</code> - Call direction: "inbound" or "outbound" (string)</li>
              <li><code className="bg-gray-100 px-1 rounded">status</code> - Call status: any text value (string)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Optional Fields:</h4>
            <ul className="text-sm space-y-1">
              <li><code className="bg-gray-100 px-1 rounded">duration_seconds</code> - Call duration in seconds (integer, default: 0)</li>
              <li><code className="bg-gray-100 px-1 rounded">agent</code> - Agent name (string, optional)</li>
              <li><code className="bg-gray-100 px-1 rounded">recording_url</code> - URL to call recording (string, optional)</li>
              <li><code className="bg-gray-100 px-1 rounded">call_summary</code> - Summary of the call (string, optional)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample JSON Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              <code>{JSON.stringify(samplePayload, null, 2)}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(JSON.stringify(samplePayload, null, 2), 'payload')}
            >
              {copiedSection === 'payload' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">cURL</h4>
            <div className="relative">
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                <code>{curlExample}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(curlExample, 'curl')}
              >
                {copiedSection === 'curl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">JavaScript</h4>
            <div className="relative">
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                <code>{jsExample}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(jsExample, 'js')}
              >
                {copiedSection === 'js' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Python</h4>
            <div className="relative">
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                <code>{pythonExample}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(pythonExample, 'python')}
              >
                {copiedSection === 'python' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Success Response (201):</h4>
            <pre className="bg-green-50 p-4 rounded text-sm">
{`{
  "success": true,
  "message": "Call record created successfully",
  "data": {
    "id": "uuid-here",
    "lead_name": "Jane Smith",
    "lead_phone_number": "+1234567890",
    "project_name": "Medical Center Campaign",
    "date": "2024-01-15",
    "call_datetime": "2024-01-15T14:30:00Z",
    "direction": "outbound",
    "status": "lead_answered",
    "duration_seconds": 180,
    "agent": "John Agent",
    "recording_url": "https://example.com/recording.mp3",
    "call_summary": "Lead interested in procedure, scheduled follow-up",
    "created_at": "2024-01-15T14:30:00Z",
    "updated_at": "2024-01-15T14:30:00Z"
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">Error Response (400/500):</h4>
            <pre className="bg-red-50 p-4 rounded text-sm">
{`{
  "error": "Missing required fields. Required: lead_name, lead_phone_number, project_name, date, call_datetime, direction, status"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllCallsApiDocs;
