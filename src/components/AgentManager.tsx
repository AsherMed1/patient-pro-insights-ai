
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

interface Agent {
  id: string;
  agent_number: string;
  agent_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentManagerProps {
  viewOnly?: boolean;
}

const AgentManager = ({ viewOnly = false }: AgentManagerProps) => {
  const { isAdmin } = useRole();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    agent_number: '',
    agent_name: '',
    active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('agent_number');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agent_number.trim() || !formData.agent_name.trim()) {
      toast({
        title: "Error",
        description: "Agent number and name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingAgent) {
        const { error } = await supabase
          .from('agents')
          .update({
            agent_number: formData.agent_number,
            agent_name: formData.agent_name,
            active: formData.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAgent.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Agent updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('agents')
          .insert([{
            agent_number: formData.agent_number,
            agent_name: formData.agent_name,
            active: formData.active
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Agent created successfully",
        });
      }

      setFormData({ agent_number: '', agent_name: '', active: true });
      setEditingAgent(null);
      setShowForm(false);
      fetchAgents();
    } catch (error: any) {
      console.error('Error saving agent:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save agent",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      agent_number: agent.agent_number,
      agent_name: agent.agent_name,
      active: agent.active
    });
    setShowForm(true);
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent deleted successfully",
      });

      fetchAgents();
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete agent",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ agent_number: '', agent_name: '', active: true });
    setEditingAgent(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Management</CardTitle>
          <CardDescription>Loading agents...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Agents ({agents.length})</CardTitle>
          <CardDescription>
            Manage call center agents
            {viewOnly && " (View Only - Records managed via API)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!viewOnly && (
            <div className="mb-6">
              <Button 
                onClick={() => setShowForm(!showForm)}
                className="mb-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Agent
              </Button>

              {showForm && (
                <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="agent_number">Agent Number</Label>
                      <Input
                        id="agent_number"
                        value={formData.agent_number}
                        onChange={(e) => setFormData({...formData, agent_number: e.target.value})}
                        placeholder="e.g., 001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="agent_name">Agent Name</Label>
                      <Input
                        id="agent_name"
                        value={formData.agent_name}
                        onChange={(e) => setFormData({...formData, agent_name: e.target.value})}
                        placeholder="e.g., John Doe"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit">
                      {editingAgent ? 'Update Agent' : 'Create Agent'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {agents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No agents found.</p>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className="font-mono">
                      {agent.agent_number}
                    </Badge>
                    <span className="font-medium">{agent.agent_name}</span>
                    <Badge variant={agent.active ? "default" : "secondary"}>
                      {agent.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {!viewOnly && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(agent)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {isAdmin() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(agent.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentManager;
