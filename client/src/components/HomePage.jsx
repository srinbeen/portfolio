import { useNavigate, Link } from "react-router-dom"

function HomePage() {
  
  return (
    <>
      <h1>Welcome to my website</h1>
      <Link to={'/collection'}><button>To my collection!</button></Link>
    </>
  )
}

export default HomePage