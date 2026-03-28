import { useState } from 'react'
import './App.css'
import SplashPage from './pages/SplashPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

function App() {
  const [screen, setScreen] = useState<'splash' | 'login' | 'signup'>('login')

  return (
    <div className="app-root">
      {screen === 'splash' ? (
        <SplashPage />
      ) : screen === 'signup' ? (
        <SignupPage onBack={() => setScreen('login')} />
      ) : (
        <LoginPage onSignUp={() => setScreen('signup')} />
      )}
    </div>
  )
}

export default App
