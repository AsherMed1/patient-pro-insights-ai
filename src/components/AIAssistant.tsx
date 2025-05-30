
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Lightbulb, TrendingUp, BarChart3 } from 'lucide-react';

interface AIAssistantProps {
  clientId: string;
}

const AIAssistant = ({ clientId }: AIAssistantProps) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{id: number, type: 'user' | 'ai', content: string, timestamp: string}>>([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your AI assistant for Patient Pro Marketing data analysis. You can ask me questions about campaign performance, call center metrics, or account health. What would you like to know?',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const suggestedQueries = [
    "What was the show rate last month for this client?",
    "Which procedures had the highest CPA in Q2?",
    "Compare March and April appointment volume",
    "How many calls per appointment last month?",
    "What was the top-performing ad campaign in May?"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: 'user' as const,
      content: query,
      timestamp: new Date().toLocaleTimeString()
    };

    // Generate AI response based on query
    const aiResponse = generateAIResponse(query, clientId);
    const aiMessage = {
      id: messages.length + 2,
      type: 'ai' as const,
      content: aiResponse,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage, aiMessage]);
    setQuery('');
  };

  const generateAIResponse = (query: string, clientId: string) => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('show rate') || lowerQuery.includes('appointment rate')) {
      return `Based on the current data for this client, the show rate last month was 85.3%. This is above the industry average of 78% and represents a 3.2% improvement from the previous month. The high show rate indicates effective lead qualification and appointment scheduling processes.`;
    }
    
    if (lowerQuery.includes('cpa') || lowerQuery.includes('cost per appointment')) {
      return `The Cost Per Appointment (CPA) for this client is currently $173.26. This is performing well against the target of $180. The dermatology procedures show the highest CPA at $195, while consultation appointments have the lowest at $142. I recommend focusing budget allocation on consultation campaigns to improve overall efficiency.`;
    }
    
    if (lowerQuery.includes('calls') || lowerQuery.includes('call center')) {
      return `Call center performance shows 542 total dials with a 68.2% connect rate. On average, it takes 6.1 calls to book one appointment. Agent Rachel M. is performing exceptionally well with a 72.1% connect rate and 52 appointments booked. The team is exceeding industry benchmarks.`;
    }
    
    if (lowerQuery.includes('compare') || lowerQuery.includes('march') || lowerQuery.includes('april')) {
      return `Comparing March to April performance: March had 78 appointments vs April's 89 appointments (14% increase). Ad spend increased from $13,200 to $15,420 (17% increase), but CPL improved from $89.20 to $82.46. This indicates improved campaign optimization and better lead quality.`;
    }
    
    if (lowerQuery.includes('campaign') || lowerQuery.includes('ad') || lowerQuery.includes('performance')) {
      return `The top-performing campaign last month was "Acne Treatment Solutions" with a CPL of $67.80 and 23% of total leads. The "Anti-Aging Consultation" campaign had the highest conversion rate at 47% but lower volume. I recommend increasing budget allocation to the acne treatment campaign while optimizing the anti-aging campaign's targeting.`;
    }

    // Default response
    return `I'd be happy to help analyze that data! Based on your current client's performance metrics, I can provide detailed insights about campaign efficiency, call center operations, and account health. Could you please specify which particular metric or time period you'd like me to focus on? I have access to real-time data for leads, appointments, costs, and conversion rates.`;
  };

  const handleSuggestedQuery = (suggestion: string) => {
    setQuery(suggestion);
  };

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
            Ask questions about your client's performance data in natural language
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
              placeholder="Ask about campaign performance, call metrics, or account health..."
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
            Click on any question to get instant insights
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

      {/* Quick Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Quick Analytics</span>
          </CardTitle>
          <CardDescription>
            Pre-generated insights based on current data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-green-900">Performance Highlight</h4>
                <Badge variant="default" className="bg-green-600">Excellent</Badge>
              </div>
              <p className="text-sm text-green-800">
                Your show rate of 85.3% is 7.3 points above industry average. This indicates high-quality lead generation and effective appointment booking processes.
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-blue-900">Optimization Opportunity</h4>
                <Badge variant="secondary">Actionable</Badge>
              </div>
              <p className="text-sm text-blue-800">
                CPL decreased by 7.5% this month. Consider reallocating budget from underperforming campaigns to scale successful ones further.
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-yellow-900">Trend Alert</h4>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Monitor</Badge>
              </div>
              <p className="text-sm text-yellow-800">
                Call volume increased 15% but connect rate remained stable. Monitor for capacity constraints as lead volume grows.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAssistant;
