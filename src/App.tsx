import { useState } from 'react'
import './App.css'
import SplashPage from './pages/SplashPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import VerifySuccessPage from './pages/VerifySuccessPage'
import HomePage from './pages/HomePage'

function App() {
  const [screen, setScreen] = useState<
    'splash' | 'login' | 'signup' | 'verify-email' | 'verify-success'
    | 'home'
  >('login')
  const [signupEmail, setSignupEmail] = useState('')

  return (
    <div className="app-root">
      {screen === 'splash' ? (
        <SplashPage />
      ) : screen === 'signup' ? (
        <SignupPage
          onBack={() => setScreen('login')}
          onSignupSuccess={(email) => {
            setSignupEmail(email)
            setScreen('verify-email')
          }}
        />
      ) : screen === 'verify-email' ? (
        <VerifyEmailPage
          email={signupEmail}
          onBack={() => setScreen('signup')}
          onVerifySuccess={() => setScreen('verify-success')}
        />
      ) : screen === 'verify-success' ? (
        <VerifySuccessPage onStartLearning={() => setScreen('home')} />
      ) : screen === 'home' ? (
        <HomePage />
      ) : (
        <LoginPage
          onSignUp={() => setScreen('signup')}
          onLogin={() => setScreen('home')}
        />
      )}
    </div>
  )
}

export default App
