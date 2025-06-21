
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface LoadingSkeletonProps {
  title: string;
  description: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ title, description }) => (
  <Card className="w-full">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <CardTitle className="text-lg">{title}</CardTitle>
      </div>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </CardContent>
  </Card>
);
