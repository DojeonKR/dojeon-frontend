import character from '../assets/character.png'
import './SplashPage.css'

function SplashPage() {
  return (
    <main className="splash-screen">
      <img
        src={character}
        alt="캐릭터"
        className="splash-character"
      />
      <h1 className="splash-title">Dojeon</h1>
    </main>
  )
}

export default SplashPage
