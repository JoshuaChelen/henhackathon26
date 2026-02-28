import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/map/client')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/map/client"!</div>
}
