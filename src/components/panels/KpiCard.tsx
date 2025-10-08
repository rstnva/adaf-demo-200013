import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: "up" | "down" | "neutral"
}

export function KpiCard({ title, value, subtitle, trend = "neutral" }: KpiCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case "up": return "text-green-500"
      case "down": return "text-red-500"
      default: return "text-muted-foreground"
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className={`text-xs ${getTrendColor()}`}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  )
}