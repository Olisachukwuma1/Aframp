import { redirect } from 'next/navigation'

// The landing page now lives at the root so it is the first thing a visitor
// sees. This path is kept so existing links to /landing don't 404.
export default function LandingPage() {
  redirect('/')
}
