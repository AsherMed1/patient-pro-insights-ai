
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  agent_number: string;
  agent_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const AgentManager = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAgent, setNewAgent] = useState({
    agent_number: '',
    agent_name: '',
    active: true
  });
  const [editAgent, setEditAgent] = useState({
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

  const addAgent = async () => {
    if (!newAgent.agent_number.trim() || !newAgent.agent_name.trim()) {
      toast({
        title: "Error",
        description: "Agent number and name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('agents')
        .insert([{
          agent_number: newAgent.agent_number.trim(),
          agent_name: newAgent.agent_name.trim(),
          active: newAgent.active
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent added successfully",
      });

      setNewAgent({ agent_number: '', agent_name: '', active: true });
      fetchAgents();
    } catch (error: any) {
      console.error('Error adding agent:', error);
      toast({
        title: "Error",
        description: error.message.includes('unique') ? "Agent number already exists" : "Failed to add agent",
        variant: "destructive",
      });
    }
  };

  const updateAgent = async (id: string) => {
    if (!editAgent.agent_number.trim() || !editAgent.agent_name.trim()) {
      toast({
        title: "Error",
        description: "Agent number and name are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('agents')
        .update({
          agent_number: editAgent.agent_number.trim(),
          agent_name: editAgent.agent_name.trim(),
          active: editAgent.active
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent updated successfully",
      });

      setEditingId(null);
      fetchAgents();
    } catch (error: any) {
      console.error('Error updating agent:', error);
      toast({
        title: "Error",
        description: error.message.includes('unique') ? "Agent number already exists" : "Failed to update agent",
        variant: "destructive",
      });
    }
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agent deleted successfully",
      });

      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive",
      });
    }
  };

  const startEdit = (agent: Agent) => {
    setEditingId(agent.id);
    setEditAgent({
      agent_number: agent.agent_number,
      agent_name: agent.agent_name,
      active: agent.active
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAgent({ agent_number: '', agent_name: '', active: true });
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
          <CardTitle>Add New Agent</CardTitle>
          <CardDescription>Create a new agent with number, name, and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="agent-number">Agent Number</Label>
              <Input
                id="agent-number"
                placeholder="e.g., A001"
                value={newAgent.agent_number}
                onChange={(e) => setNewAgent({ ...newAgent, agent_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                placeholder="e.g., John Doe"
                value={newAgent.agent_name}
                onChange={(e) => setNewAgent({ ...newAgent, agent_name: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="agent-active"
                checked={newAgent.active}
                onCheckedChange={(checked) => setNewAgent({ ...newAgent, active: checked })}
              />
              <Label htmlFor="agent-active">Active</Label>
            </div>
            <div className="flex items-end">
              <Button onClick={addAgent} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Agent
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Agents ({agents.length})</CardTitle>
          <CardDescription>Manage your call center agents</CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No agents found. Add your first agent above.</p>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                  {editingId === agent.id ? (
                    <div className="flex items-center space-x-4 flex-1">
                      <Input
                        placeholder="Agent Number"
                        value={editAgent.agent_number}
                        onChange={(e) => setEditAgent({ ...editAgent, agent_number: e.target.value })}
                        className="w-32"
                      />
                      <Input
                        placeholder="Agent Name"
                        value={editAgent.agent_name}
                        onChange={(e) => setEditAgent({ ...editAgent, agent_name: e.target.value })}
                        className="flex-1"
                      />
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editAgent.active}
                          onCheckedChange={(checked) => setEditAgent({ ...editAgent, active: checked })}
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => updateAgent(agent.id)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline" className="font-mono">
                          {agent.agent_number}
                        </Badge>
                        <span className="font-medium">{agent.agent_name}</span>
                        <Badge variant={agent.active ? "default" : "secondary"}>
                          {agent.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(agent)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteAgent(agent.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
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
