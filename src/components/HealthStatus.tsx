interface HealthStatusProps {
  status: 'loading' | 'online' | 'offline'
}

export function HealthStatus({ status }: HealthStatusProps) {
  return (
    <div
      className={`health-status health-status--${status}`}
      aria-label={
        status === 'loading'
          ? 'Проверка'
          : status === 'online'
            ? 'Онлайн'
            : 'Офлайн'
      }
    >
      <span className="health-status__dot" aria-hidden="true" />
    </div>
  )
}
