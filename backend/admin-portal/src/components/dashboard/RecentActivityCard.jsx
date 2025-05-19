import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"

const RecentActivityCard = ({ title, items, icon, renderItem, linkTo, linkText }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          {icon}
          <h2 className="text-lg font-semibold ml-2">{title}</h2>
        </div>
      </div>

      <div className="p-4">
        {items.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">{items.map(renderItem)}</div>
        )}
      </div>

      {linkTo && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <Link to={linkTo} className="text-primary hover:text-primary-dark flex items-center justify-center text-sm">
            {linkText} <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      )}
    </div>
  )
}

export default RecentActivityCard
