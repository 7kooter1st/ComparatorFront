interface HealthStatusProps {
  status: 'loading' | 'online' | 'offline'
  serviceName?: string
}

export function HealthStatus({ status, serviceName }: HealthStatusProps) {
  const label =
    status === 'loading'
      ? 'Проверка сервера…'
      : status === 'online'
        ? serviceName ?? 'Сервер доступен'
        : 'Сервер недоступен'

  return (
    <div className={`health-status health-status--${status}`}>
      <span className="health-status__dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
