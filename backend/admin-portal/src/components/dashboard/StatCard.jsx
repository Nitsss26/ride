import { Link } from "react-router-dom"
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react"

const StatCard = ({ title, value, icon, linkTo, highlight = false, change }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${highlight ? "border-l-4 border-yellow-500" : ""}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        {icon}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {change >= 0 ? "+" : ""}
                {change}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        {linkTo && (
          <Link to={linkTo} className="text-primary hover:text-primary-dark flex items-center text-sm">
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        )}
      </div>
    </div>
  )
}

export default StatCard
