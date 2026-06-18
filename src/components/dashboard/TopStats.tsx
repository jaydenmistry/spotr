"use client";

import { Car, DollarSign, TrendingUp } from "lucide-react";
import { formatSignedCurrency, getVehicleAnalytics } from "@/lib/vehicleAnalytics";

interface Lead {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  price: number | null;
  miles: number | null;
  stage: string;
  createdAt: string;
}

export default function TopStats({ leads }: { leads: Lead[] }) {
  const acquiredLeads = leads.filter((l) => l.stage === "Acquired");
  const acquiredValue = acquiredLeads.reduce((sum, l) => sum + (l.price || 0), 0);

  const pipelineLeads = leads.filter((l) => !["Acquired", "Lost"].includes(l.stage));
  const pipelineValue = pipelineLeads.reduce((sum, l) => sum + (l.price || 0), 0);
  const projectedMovement = pipelineLeads.reduce(
    (sum, lead) => sum + getVehicleAnalytics(lead).projectedChangeDollars,
    0
  );

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newThisWeek = leads.filter((l) => new Date(l.createdAt) > oneWeekAgo).length;

  const stats = [
    {
      name: "Acquired Value",
      value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(acquiredValue),
      icon: DollarSign,
      subtext: `${acquiredLeads.length} vehicles acquired`,
    },
    {
      name: "Pipeline Value",
      value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(pipelineValue),
      icon: TrendingUp,
      subtext: `${pipelineLeads.length} active leads`,
    },
    {
      name: "New This Week",
      value: newThisWeek.toString(),
      icon: Car,
      subtext: "Fresh leads imported",
    },
    {
      name: "Projected Movement",
      value: formatSignedCurrency(projectedMovement),
      icon: TrendingUp,
      subtext: "12-month value outlook",
    },
  ];

  return (
    <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.name}
          className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-orange-50 p-3">
              <item.icon className="h-6 w-6 text-orange-600" aria-hidden="true" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dt className="truncate text-sm font-medium text-gray-500">
                {item.name}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {item.value}
                </div>
              </dd>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
            {item.subtext}
          </div>
        </div>
      ))}
    </div>
  );
}
