import { Navigate, Route, Routes } from 'react-router'
import { WeekView } from '@/routes/week-view'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WeekView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
