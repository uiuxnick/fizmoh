import React from 'react'
import { createRoot } from 'react-dom/client'
import { SupportTicketsPanel } from '../../src/components/platform/support-tickets-panel'
createRoot(document.getElementById('root')!).render(<SupportTicketsPanel liveOnly />)
