import {Route , BrowserRouter ,Routes} from 'react-router-dom'

import Signup from './pages/signup'
import LoginPage from './pages/login'
function App() {


  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/signup' element ={<Signup/>} />
          <Route path='/login' element ={<LoginPage/>} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
