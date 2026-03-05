interface DeliveryPoint {
  id: string
  lat: number
  lng: number
}

function distance(a: DeliveryPoint, b: DeliveryPoint) {

  const dx = a.lat - b.lat
  const dy = a.lng - b.lng

  return Math.sqrt(dx * dx + dy * dy)

}

export function optimizeRoute(
  start: DeliveryPoint,
  points: DeliveryPoint[]
): DeliveryPoint[] {

  if (!points || points.length === 0) {
    return []
  }

  const remaining = [...points]
  const route: DeliveryPoint[] = []

  let current = start

  while (remaining.length > 0) {

    let closestIndex = 0
    let closestDistance = distance(current, remaining[0])

    for (let i = 1; i < remaining.length; i++) {

      const d = distance(current, remaining[i])

      if (d < closestDistance) {
        closestDistance = d
        closestIndex = i
      }

    }

    const next = remaining.splice(closestIndex, 1)[0]

    route.push(next)

    current = next

  }

  return route

}