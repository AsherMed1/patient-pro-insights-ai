import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, MessageCircle, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { formatDateInCentralTime } from '@/utils/dateTimeUtils';

interface AccountHealthDashboardProps {
  clientId: string;
}

const AccountHealthDashboard = ({ clientId }: AccountHealthDashboardProps) => {
  // Mock account health data
  const healthData = {
    'client-1': {
      lastTouchpoint: '2024-05-28',
      strategyCallDate: '2024-05-15',
      tasksCompleted: 87,
      retentionScore: 9.2,
      feedbackNotes: 'Very satisfied with campaign performance. Requesting additional service packages.',
      communicationFrequency: 'Weekly',
      accountStatus: 'Excellent',
      upcomingTasks: 4,
      overdueTasks: 0
    },
    'client-2': {
      lastTouchpoint: '2024-05-26',
      strategyCallDate: '2024-05-10',
      tasksCompleted: 76,
      retentionScore: 8.1,
      feedbackNotes: 'Happy with leads quality, some concerns about cost efficiency.',
      communicationFrequency: 'Bi-weekly',
      accountStatus: 'Good',
      upcomingTasks: 2,
      overdueTasks: 1
    },
    'client-3': {
      lastTouchpoint: '2024-05-29',
      strategyCallDate: '2024-05-20',
      tasksCompleted: 94,
      retentionScore: 9.8,
      feedbackNotes: 'Extremely pleased with ROI and team responsiveness.',
      communicationFrequency: 'Weekly',
      accountStatus: 'Excellent',
      upcomingTasks: 3,
      overdueTasks: 0
    },
    'client-4': {
      lastTouchpoint: '2024-05-22',
      strategyCallDate: '2024-05-05',
      tasksCompleted: 62,
      retentionScore: 6.8,
      feedbackNotes: 'Requesting more detailed reporting and faster response times.',
      communicationFrequency: 'Monthly',
      accountStatus: 'Needs Attention',
      upcomingTasks: 6,
      overdueTasks: 3
    }
  };

  const data = healthData[clientId as keyof typeof healthData] || healthData['client-1'];

  const formatDate = (dateString: string) => {
    return formatDateInCentralTime(dateString);
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-500';
      case 'Good': return 'bg-blue-500';
      case 'Needs Attention': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Excellent': return 'default';
      case 'Good': return 'secondary';
      case 'Needs Attention': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={`text-white ${getStatusColor(data.accountStatus)}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Account Status</CardTitle>
            <TrendingUp className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.accountStatus}</div>
            <p className="text-xs opacity-90 mt-1">Overall health</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Retention Score</CardTitle>
            <CheckCircle className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.retentionScore}/10</div>
            <Progress value={data.retentionScore * 10} className="mt-2 bg-purple-400" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Task Completion</CardTitle>
            <CheckCircle className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tasksCompleted}%</div>
            <Progress value={data.tasksCompleted} className="mt-2 bg-pink-400" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Communication</CardTitle>
            <MessageCircle className="h-4 w-4 opacity-90" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.communicationFrequency}</div>
            <p className="text-xs opacity-90 mt-1">Touch frequency</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Latest touchpoints and interactions (Central Time Zone)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Last Touchpoint</h4>
                  <p className="text-sm text-gray-600">{formatDate(data.lastTouchpoint)}</p>
                </div>
                <Badge variant="outline">
                  {getDaysAgo(data.lastTouchpoint)} days ago
                </Badge>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Strategy Call</h4>
                  <p className="text-sm text-gray-600">{formatDate(data.strategyCallDate)}</p>
                </div>
                <Badge variant="outline">
                  {getDaysAgo(data.strategyCallDate)} days ago
                </Badge>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Next Strategy Call</h4>
                  <p className="text-sm text-gray-600">Due in 7 days</p>
                </div>
                <Badge variant="default">Scheduled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Task Management</span>
            </CardTitle>
            <CardDescription>Current task status and priorities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Completed Tasks</h4>
                  <p className="text-sm text-gray-600">This month</p>
                </div>
                <span className="text-2xl font-bold text-green-600">{data.tasksCompleted}%</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Upcoming Tasks</h4>
                  <p className="text-sm text-gray-600">Next 7 days</p>
                </div>
                <Badge variant="default">{data.upcomingTasks}</Badge>
              </div>
              
              {data.overdueTasks > 0 && (
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div>
                      <h4 className="font-medium text-red-900">Overdue Tasks</h4>
                      <p className="text-sm text-red-600">Requires attention</p>
                    </div>
                  </div>
                  <Badge variant="destructive">{data.overdueTasks}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Client Feedback & Notes</span>
          </CardTitle>
          <CardDescription>Latest feedback and account manager notes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Recent Feedback</h4>
            <p className="text-gray-700 italic">"{data.feedbackNotes}"</p>
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-500">Last updated: {formatDate(data.lastTouchpoint)}</span>
              <Badge variant={getStatusVariant(data.accountStatus)}>
                {data.accountStatus}
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Account Manager Notes</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Regular check-ins maintaining strong relationship</li>
              <li>• Client shows high engagement with monthly reports</li>
              <li>• Potential for service expansion based on current satisfaction</li>
              <li>• Recommend maintaining current communication cadence</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountHealthDashboard;
