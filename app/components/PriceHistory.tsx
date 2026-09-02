"use client";

type PriceHistoryProps = {
  history: {
    month: string;
    price: number;
  }[];
};

export default function PriceHistory({
  history,
}: PriceHistoryProps) {
  const prices = history.map((item) => item.price);

  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);

  const chartWidth = 700;
  const chartHeight = 260;
  const padding = 45;

  const points = history.map((item, index) => {
    const x =
      history.length === 1
        ? chartWidth / 2
        : padding +
          (index / (history.length - 1)) *
            (chartWidth - padding * 2);

    const range = maxPrice - minPrice || 1;

    const y =
      padding +
      ((maxPrice - item.price) / range) *
        (chartHeight - padding * 2);

    return {
      ...item,
      x,
      y,
    };
  });

  const path = points
    .map((point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `L ${point.x} ${point.y}`
    )
    .join(" ");

  return (
    <div className="mt-10 rounded-3xl bg-white p-8 shadow">
      <h2 className="text-2xl font-bold text-gray-900">
        📈 Price History
      </h2>

      <p className="mt-2 text-gray-500">
        Track how the price has changed over time.
      </p>

      {/* Chart */}
      <div className="mt-8 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-72 w-full min-w-[600px]"
        >
          {/* Horizontal guide lines */}
          <line
            x1={padding}
            y1={padding}
            x2={chartWidth - padding}
            y2={padding}
            stroke="#e5e7eb"
          />

          <line
            x1={padding}
            y1={chartHeight / 2}
            x2={chartWidth - padding}
            y2={chartHeight / 2}
            stroke="#e5e7eb"
          />

          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="#e5e7eb"
          />

          {/* Price line */}
          <path
            d={path}
            fill="none"
            stroke="#2563eb"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((point) => (
            <g key={point.month}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill="white"
                stroke="#2563eb"
                strokeWidth="4"
              />

              <text
                x={point.x}
                y={point.y - 14}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill="#111827"
              >
                ₹{point.price.toLocaleString("en-IN")}
              </text>

              <text
                x={point.x}
                y={chartHeight - 15}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {point.month}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Monthly Prices */}
      <div className="mt-8 space-y-4">
        {history.map((item) => (
          <div
            key={item.month}
            className="flex items-center justify-between rounded-xl border p-4"
          >
            <span className="font-medium text-gray-600">
              {item.month}
            </span>

            <span className="text-xl font-bold text-blue-600">
              ₹{item.price.toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}