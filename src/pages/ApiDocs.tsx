
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AllAppointmentsApiDocs from "@/components/AllAppointmentsApiDocs";
import AllCallsApiDocs from "@/components/AllCallsApiDocs";
import NewLeadApiDocs from "@/components/NewLeadApiDocs";
import UpdateAppointmentApiDocs from "@/components/UpdateAppointmentApiDocs";

const ApiDocs = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">API Documentation</h1>
          <p className="text-xl text-gray-600">Complete API reference for all endpoints</p>
        </div>

        <Tabs defaultValue="appointments-api" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appointments-api">Create Appointments</TabsTrigger>
            <TabsTrigger value="update-appointments-api">Update Appointments</TabsTrigger>
            <TabsTrigger value="calls-api">Calls API</TabsTrigger>
            <TabsTrigger value="leads-api">New Leads API</TabsTrigger>
          </TabsList>
          <TabsContent value="appointments-api">
            <AllAppointmentsApiDocs />
          </TabsContent>
          <TabsContent value="update-appointments-api">
            <UpdateAppointmentApiDocs />
          </TabsContent>
          <TabsContent value="calls-api">
            <AllCallsApiDocs />
          </TabsContent>
          <TabsContent value="leads-api">
            <NewLeadApiDocs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApiDocs;
