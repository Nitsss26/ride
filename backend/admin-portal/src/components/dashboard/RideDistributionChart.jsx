"use client"

import { useEffect, useRef } from "react"
import Chart from "chart.js/auto"

const RideDistributionChart = ({ data }) => {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext("2d")

    // Format data for chart
    const labels = data.map((item) => item.status.charAt(0).toUpperCase() + item.status.slice(1))
    const counts = data.map((item) => item.count)
    const colors = [
      "rgba(34, 197, 94, 0.8)", // green-500
      "rgba(239, 68, 68, 0.8)", // red-500
      "rgba(59, 130, 246, 0.8)", // blue-500
    ]

    chartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: counts,
            backgroundColor: colors,
            borderColor: "#ffffff",
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#fff",
            bodyColor: "#fff",
            borderColor: "rgba(255, 255, 255, 0.2)",
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context) =>
                `${context.label}: ${context.raw.toLocaleString()} (${((context.raw / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`,
            },
          },
        },
        cutout: "65%",
        animation: {
          animateScale: true,
          animateRotate: true,
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data])

  return (
    <div className="h-64">
      <canvas ref={chartRef}></canvas>
    </div>
  )
}

export default RideDistributionChart
