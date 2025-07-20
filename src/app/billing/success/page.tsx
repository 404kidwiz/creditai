'use client'

import { Suspense } from 'react'
import BillingSuccessClient from './BillingSuccessClient'

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BillingSuccessClient />
    </Suspense>
  )
}