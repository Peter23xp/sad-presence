import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  colorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendUp, colorClass = "text-black" }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-lg bg-gray-50 ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={trendUp ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {trend}
          </span>
          <span className="text-gray-400 ml-2">vs hier</span>
        </div>
      )}
    </div>
  );
};
