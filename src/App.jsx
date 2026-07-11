import React, { Suspense, lazy } from 'react'
import LandingPage from './components/LandingPage'
import MathBackground from './components/MathBackground'
import './App.css'

const BackToTop = lazy(() => import('./components/BackToTop'))

export default function App() {
  return (
    <div className="app">
      <MathBackground />
      <a className="skip-link" href="#main-content">跳转到主内容</a>
      <LandingPage />
      <Suspense fallback={null}>
        <BackToTop />
      </Suspense>
    </div>
  )
}
