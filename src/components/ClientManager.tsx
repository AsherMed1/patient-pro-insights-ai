
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';

interface Client {
  id: string;
  client_id: string;
  name: string;
  gohighlevel_api_key: string;
  created_at: string;
}

const ClientManager = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    client_id: '',
    name: '',
    gohighlevel_api_key: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.client_id || !newClient.name || !newClient.gohighlevel_api_key) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .insert([newClient]);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Client added successfully",
      });
      
      setNewClient({ client_id: '', name: '', gohighlevel_api_key: '' });
      setIsAdding(false);
      fetchClients();
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add client",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This will also delete all associated data.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      
      fetchClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <span>Loading clients...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Client Management</span>
          <Button 
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Client</span>
          </Button>
        </CardTitle>
        <CardDescription>
          Manage your clients and their GoHighLevel API connections. Adding a new client here makes it immediately available for data sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Client Form */}
        {isAdding && (
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="client_id">Client ID</Label>
                  <Input
                    id="client_id"
                    placeholder="e.g., new-client-name"
                    value={newClient.client_id}
                    onChange={(e) => setNewClient({...newClient, client_id: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique identifier (lowercase, hyphens only)</p>
                </div>
                <div>
                  <Label htmlFor="name">Client Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., New Medical Center"
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="gohighlevel_api_key">GoHighLevel API Key</Label>
                  <Input
                    id="gohighlevel_api_key"
                    type="password"
                    placeholder="e.g., ghl_abc123..."
                    value={newClient.gohighlevel_api_key}
                    onChange={(e) => setNewClient({...newClient, gohighlevel_api_key: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">From your GoHighLevel account settings</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleAddClient} className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Save Client</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAdding(false);
                    setNewClient({ client_id: '', name: '', gohighlevel_api_key: '' });
                  }}
                  className="flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Clients */}
        <div className="space-y-3">
          {clients.map((client) => (
            <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div>
                    <h4 className="font-medium">{client.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {client.client_id}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Added {new Date(client.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  API Key: {client.gohighlevel_api_key ? '*********************' + client.gohighlevel_api_key.slice(-4) : 'Not set'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingId(client.id)}
                  className="flex items-center space-x-1"
                >
                  <Edit className="h-3 w-3" />
                  <span>Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteClient(client.id)}
                  className="flex items-center space-x-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {clients.length === 0 && !isAdding && (
          <div className="text-center py-8 text-gray-500">
            <p>No clients configured yet.</p>
            <p className="text-sm">Add your first client to get started!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientManager;
