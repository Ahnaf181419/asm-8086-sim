import { Navigate } from 'react-router-dom'
import { LESSONS } from '../data/lessons'

// the index view has no content of its own — go straight to lesson 01
export default function LessonsPage() {
  return <Navigate to={`/lessons/${LESSONS[0].id}`} replace />
}
