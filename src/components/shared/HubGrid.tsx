/**
 * HubGrid — responsive 2-column (up to 4-column on large screens) grid
 * for Sub-Hub cards inside any hub page.
 *
 * Children must be SubHubCard elements. HubGrid has no knowledge of hub data.
 * Edit mode state is injected via EditModeContext, not through the children prop.
 */

interface HubGridProps {
  children: React.ReactNode
}

export default function HubGrid({ children }: HubGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
      {children}
    </div>
  )
}
