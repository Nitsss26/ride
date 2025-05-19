"use client"

import { useEffect, useRef } from "react"
import Chart from "chart.js/auto"

const RevenueChart = ({ data, period }) => {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext("2d")

    // Format data for chart
    const labels = data.map((item) => {
      if (period === "week") {
        // For week, show day of week
        const date = new Date(item.date)
        return date.toLocaleDateString(undefined, { weekday: "short" })
      } else if (period === "month") {
        // For month, show day of month
        const date = new Date(item.date)
        return date.getDate()
      } else if (period === "year") {
        // For year, show month
        const date = new Date(item.date + "-01") // Add day for proper parsing
        return date.toLocaleDateString(undefined, { month: "short" })
      }
      return item.date
    })

    const revenueData = data.map((item) => item.amount)

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Revenue",
            data: revenueData,
            borderColor: "#E31937", // primary color
            backgroundColor: "rgba(227, 25, 55, 0.1)",
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#E31937",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#fff",
            bodyColor: "#fff",
            borderColor: "rgba(255, 255, 255, 0.2)",
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context) =>
                `Revenue: $${context.raw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: period === "month" ? 10 : 6,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              callback: (value) => "$" + value.toLocaleString(),
            },
          },
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, period])

  return (
    <div className="h-80">
      <canvas ref={chartRef}></canvas>
    </div>
  )
}

export default RevenueChart
