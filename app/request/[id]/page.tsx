import { RequestPageClient } from '@/components/request/request-page-client'

interface PageProps {
  params: {
    id: string
  }
}

export default function RequestPage({ params }: PageProps) {
  return <RequestPageClient requestId={params.id} />
}
