import { useSession } from '../contexts/AuthContext'
import { useBills } from '../hooks/useBills'
import BillsHub from '../components/hubs/bills/BillsHub'

export default function BillsHubPage() {
  const { household } = useSession()
  const bills = useBills(household?.id ?? null)
  return <BillsHub {...bills} />
}
