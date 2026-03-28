import './VerifySuccessPage.css'

interface VerifySuccessPageProps {
  onStartLearning: () => void
}

function VerifySuccessPage({ onStartLearning }: VerifySuccessPageProps) {
  return (
    <main className="verify-success-screen">
      <section className="verify-success-content">
        <div className="verify-success-circle" aria-hidden="true" />
        <h1 className="verify-success-title">Welcome to Dojeon!</h1>
        <p className="verify-success-description">
          Take on the challenge of learning
          <br />
          Korean, one step at a time.
        </p>
        <button type="button" className="verify-success-button" onClick={onStartLearning}>
          Start learning
        </button>
      </section>
    </main>
  )
}

export default VerifySuccessPage
