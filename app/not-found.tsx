import ErrorLayout from '@/components/error/ErrorLayout'

export default function NotFound() {
  return (
    <ErrorLayout
      status={404}
      title="Page not found"
      message="That page doesn't exist, or it moved."
      actions={[{ label: 'Back to start', href: '/' }]}
    />
  )
}
