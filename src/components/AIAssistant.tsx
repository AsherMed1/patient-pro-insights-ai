import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Lightbulb, TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatTimeInCentralTime } from '@/utils/dateTimeUtils';

interface AIAssistantProps {
  clientId: string;
}

interface DatabaseStats {
  totalDials: number;
  totalAppointments: number;
  totalAgents: number;
  averageCallDuration: number;
  totalProjects: number;
  totalNewLeads: number;
  connectRate: number;
  showRate: number;
}

const AIAssistant = ({ clientId }: AIAssistantProps) => {
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Array<{id: number, type: 'user' | 'ai', content: string, timestamp: string}>>([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your AI assistant for Patient Pro Marketing data analysis. I can provide insights about your call center performance, appointment metrics, and agent statistics. What would you like to know?',
      timestamp: formatTimeInCentralTime(new Date())
    }
  ]);

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  const fetchDatabaseStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all required data in parallel
      const [callsResult, appointmentsResult, agentsResult, projectsResult, leadsResult] = await Promise.all([
        supabase.from('all_calls').select('duration_seconds, status'),
        supabase.from('all_appointments').select('showed, confirmed'),
        supabase.from('agents').select('id').eq('active', true),
        supabase.from('projects').select('id'),
        supabase.from('new_leads').select('id')
      ]);

      const calls = callsResult.data || [];
      const appointments = appointmentsResult.data || [];
      const agents = agentsResult.data || [];
      const projects = projectsResult.data || [];
      const leads = leadsResult.data || [];

      // Calculate statistics
      const totalDials = calls.length;
      const answeredCalls = calls.filter(call => 
        call.status === 'answered' || call.status === 'connected' || call.status === 'pickup'
      ).length;
      const connectRate = totalDials > 0 ? (answeredCalls / totalDials) * 100 : 0;
      
      const totalCallDuration = calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
      const averageCallDuration = calls.length > 0 ? totalCallDuration / calls.length / 60 : 0;
      
      const showedAppointments = appointments.filter(apt => apt.showed).length;
      const totalCompletedAppointments = appointments.filter(apt => apt.showed !== null).length;
      const showRate = totalCompletedAppointments > 0 ? (showedAppointments / totalCompletedAppointments) * 100 : 0;

      setStats({
        totalDials,
        totalAppointments: appointments.length,
        totalAgents: agents.length,
        averageCallDuration,
        totalProjects: projects.length,
        totalNewLeads: leads.length,
        connectRate,
        showRate
      });
    } catch (error) {
      console.error('Error fetching database stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQueries = [
    "What is our current show rate?",
    "How many total calls have we made?",
    "What's our average call duration?",
    "How many active agents do we have?",
    "What's our call connect rate?"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !stats) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: 'user' as const,
      content: query,
      timestamp: formatTimeInCentralTime(new Date())
    };

    // Generate AI response based on real data
    const aiResponse = generateAIResponse(query, stats);
    const aiMessage = {
      id: messages.length + 2,
      type: 'ai' as const,
      content: aiResponse,
      timestamp: formatTimeInCentralTime(new Date())
    };

    setMessages(prev => [...prev, userMessage, aiMessage]);
    setQuery('');
  };

  const generateAIResponse = (query: string, stats: DatabaseStats) => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('show rate') || lowerQuery.includes('appointment rate')) {
      return `Based on your current data, the show rate is ${stats.showRate.toFixed(1)}%. You have ${stats.totalAppointments} total appointments in the system. ${stats.showRate > 75 ? 'This is a strong show rate!' : 'There may be room for improvement in appointment follow-up.'}`;
    }
    
    if (lowerQuery.includes('calls') || lowerQuery.includes('dials')) {
      return `You have made ${stats.totalDials.toLocaleString()} total calls with a connect rate of ${stats.connectRate.toFixed(1)}%. ${stats.connectRate > 60 ? 'Your connect rate is performing well!' : 'Consider optimizing call timing and strategies to improve connect rates.'}`;
    }
    
    if (lowerQuery.includes('duration') || lowerQuery.includes('call time')) {
      return `Your average call duration is ${stats.averageCallDuration.toFixed(1)} minutes. ${stats.averageCallDuration > 3 ? 'This indicates good engagement with prospects.' : 'Consider strategies to increase conversation length for better qualification.'}`;
    }
    
    if (lowerQuery.includes('agents') || lowerQuery.includes('team')) {
      return `You currently have ${stats.totalAgents} active agents. With ${stats.totalDials} total calls, that's an average of ${Math.round(stats.totalDials / Math.max(stats.totalAgents, 1))} calls per agent. ${stats.totalAgents > 0 ? 'Your team is actively making calls!' : 'Consider adding more agents to increase call volume.'}`;
    }
    
    if (lowerQuery.includes('connect rate') || lowerQuery.includes('pickup')) {
      return `Your current connect rate is ${stats.connectRate.toFixed(1)}%. Industry average is typically 15-25%, so ${stats.connectRate > 25 ? 'you\'re performing exceptionally well!' : stats.connectRate > 15 ? 'you\'re within industry standards.' : 'there\'s opportunity to improve call timing and strategies.'}`;
    }

    if (lowerQuery.includes('projects') || lowerQuery.includes('clients')) {
      return `You have ${stats.totalProjects} active projects and ${stats.totalNewLeads} new leads in the system. This gives you an average of ${Math.round(stats.totalNewLeads / Math.max(stats.totalProjects, 1))} leads per project.`;
    }

    // Default response with comprehensive stats
    return `Here's a summary of your current performance: ${stats.totalDials.toLocaleString()} total calls made with a ${stats.connectRate.toFixed(1)}% connect rate, ${stats.totalAppointments} appointments booked with a ${stats.showRate.toFixed(1)}% show rate, ${stats.totalAgents} active agents, and an average call duration of ${stats.averageCallDuration.toFixed(1)} minutes. ${stats.totalProjects} active projects with ${stats.totalNewLeads} new leads. Is there a specific metric you'd like me to analyze further?`;
  };

  const handleSuggestedQuery = (suggestion: string) => {
    setQuery(suggestion);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <span>Loading your data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Assistant Interface */}
      <Card className="h-96">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>AI Data Assistant</span>
          </CardTitle>
          <CardDescription>
            Ask questions about your real call center performance data (Times in Central Time Zone)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col h-full">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <span className={`text-xs ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your call center performance, show rates, or agent metrics..."
              className="flex-1"
            />
            <Button type="submit" size="sm">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Suggested Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5" />
            <span>Suggested Questions</span>
          </CardTitle>
          <CardDescription>
            Click on any question to get instant insights from your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestedQueries.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 text-left justify-start hover:bg-blue-50 hover:border-blue-300"
                onClick={() => handleSuggestedQuery(suggestion)}
              >
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-1 rounded">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm">{suggestion}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Analytics Summary */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Live Data Summary</span>
            </CardTitle>
            <CardDescription>
              Current statistics from your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalDials.toLocaleString()}</div>
                <div className="text-sm text-blue-800">Total Calls</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.connectRate.toFixed(1)}%</div>
                <div className="text-sm text-green-800">Connect Rate</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.totalAppointments}</div>
                <div className="text-sm text-purple-800">Appointments</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.showRate.toFixed(1)}%</div>
                <div className="text-sm text-orange-800">Show Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIAssistant;
