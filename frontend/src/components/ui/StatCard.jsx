import Card from './Card'

function StatCard({ title, value, icon: Icon, subtitle, trend }) {
  return (
    <Card className="hover:scale-105 transition-transform duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <p className="text-white text-3xl font-bold mb-1">{value}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-lg bg-blue-500/20">
            <Icon className="w-6 h-6 text-blue-400" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <span className={`text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="text-gray-500 text-sm ml-2">vs last period</span>
        </div>
      )}
    </Card>
  )
}

export default StatCard
