
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  color?: string;
  isPercentage?: boolean;
  isCurrency?: boolean;
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  isPercentage = false,
  isCurrency = false 
}: StatCardProps) => {
  const formatValue = () => {
    if (isCurrency) return `$${value.toFixed(2)}`;
    if (isPercentage) return `${value.toFixed(1)}%`;
    return value.toString();
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className={`text-2xl font-bold text-${color}-600`}>
              {formatValue()}
            </p>
          </div>
          <Icon className={`h-8 w-8 text-${color}-500`} />
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
