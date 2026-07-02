export default function StatCard({
  title,
  value,
  icon,
  trendText,
  trendIcon,
  variant = 'primary'
}) {
  const variantStyles = {
    primary: {
      hoverBorder: 'hover:border-primary/50',
      iconBg: 'bg-primary-container/10',
      iconText: 'text-primary',
      trendText: 'text-secondary',
      trendIcon: 'trending_up'
    },
    secondary: {
      hoverBorder: 'hover:border-secondary/50',
      iconBg: 'bg-secondary-container/20',
      iconText: 'text-secondary',
      trendText: 'text-secondary',
      trendIcon: 'trending_up'
    },
    error: {
      hoverBorder: 'hover:border-error/50',
      iconBg: 'bg-error-container/30',
      iconText: 'text-error',
      trendText: 'text-error',
      trendIcon: 'warning'
    }
  }

  const style = variantStyles[variant] || variantStyles.primary

  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col transition-colors shadow-sm relative overflow-hidden ${style.hoverBorder}`}
    >
      {variant === 'error' && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
      )}
      <div className="flex justify-between items-start mb-sm relative z-10">
        <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-sm ${style.iconBg} rounded-full`}>
          <span className={`material-symbols-outlined ${style.iconText}`}>{icon}</span>
        </div>
      </div>
      <div className="font-headline-md text-headline-md text-on-surface mb-xs relative z-10 tabular-nums">
        {value}
      </div>
      {(trendText || trendIcon) && (
        <div
          className={`flex items-center gap-xs font-label-sm text-label-sm relative z-10 ${style.trendText}`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {trendIcon || style.trendIcon}
          </span>
          <span>{trendText}</span>
        </div>
      )}
    </div>
  )
}
