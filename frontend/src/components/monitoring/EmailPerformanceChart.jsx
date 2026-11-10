import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { demoTrends, demoMode } from "../../services/demoData.js";

const chartOptions = [
  { key: "delivery", label: "Delivery", color: "#3978e5" },
  { key: "engagement", label: "Opens & clicks", color: "#26a69a" },
  { key: "bounce", label: "Bounces", color: "#e47777" },
];

export default function EmailPerformanceChart({
  trends = [],
  metricsAvailable = false,
  eventWebhookReady = false,
}) {
  const chartData = demoMode ? demoTrends : metricsAvailable ? trends : [];

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-panel sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Email performance
          </h2>
          <p className="mt-1 text-[10px] text-muted">
            {demoMode
              ? "Illustrative seven-day trend · replace with provider event data"
              : metricsAvailable
                ? "Seven-day trend from Brevo events and the local send log"
                : eventWebhookReady
                  ? "Waiting for the first Brevo event"
                  : "Provider trend data is unavailable until the Brevo event webhook is configured"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chartOptions.map((option) => (
            <span
              className="rounded-md border border-line px-2 py-1 text-[9px] font-medium text-slate-600"
              key={option.key}
            >
              {option.label}
            </span>
          ))}
        </div>
      </div>
      {chartData.length > 0 ? (
      <div className="mt-4 h-[230px] w-full">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
          >
            <CartesianGrid stroke="#edf0f5" strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="day"
              tick={{ fill: "#8290a4", fontSize: 10 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              allowDecimals={false}
              tick={{ fill: "#8290a4", fontSize: 10 }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                border: "1px solid #e7ebf1",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 10, paddingTop: 6 }}
            />
            <Line
              dataKey="sent"
              name="Sent"
              stroke="#b2bfd2"
              strokeWidth={1.7}
              type="monotone"
              dot={false}
            />
            <Line
              dataKey="delivered"
              name="Delivered"
              stroke="#3978e5"
              strokeWidth={2}
              type="monotone"
              dot={false}
            />
            <Line
              dataKey="opened"
              name="Opens"
              stroke="#26a69a"
              strokeWidth={2}
              type="monotone"
              dot={false}
            />
            <Line
              dataKey="clicked"
              name="Clicks"
              stroke="#8067c7"
              strokeWidth={2}
              type="monotone"
              dot={false}
            />
            <Line
              dataKey="bounced"
              name="Bounces"
              stroke="#e47777"
              strokeWidth={1.7}
              type="monotone"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      ) : (
        <div className="mt-4 flex h-[230px] items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-500">
          No provider trend data available
        </div>
      )}
    </section>
  );
}
