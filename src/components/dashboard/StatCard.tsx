
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  color?: string;
  isPercentage?: boolean;
  isCurrency?: boolean;
  isMinutes?: boolean;
  onClick?: () => void;
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  isPercentage = false,
  isCurrency = false,
  isMinutes = false,
  onClick 
}: StatCardProps) => {
  const formatValue = () => {
    if (isCurrency) return `$${value.toFixed(2)}`;
    if (isPercentage) return `${value.toFixed(1)}%`;
    if (isMinutes) return `${Math.round(value)} min`;
    return Math.round(value).toString();
  };

  return (
    <Card 
      className={`${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className={`text-2xl font-bold text-${color}-600`}>
              {formatValue()}
            </p>
            {onClick && (
              <p className="text-xs text-gray-500 mt-1">Click to view details</p>
            )}
          </div>
          <Icon className={`h-8 w-8 text-${color}-500`} />
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
