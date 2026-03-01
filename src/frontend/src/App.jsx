import {Route , BrowserRouter ,Routes} from 'react-router-dom'

import Signup from './pages/signup'
import LoginPage from './pages/login'
import Shopee from './pages/shopee'
function App() {


  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/signup' element ={<Signup/>} />
          <Route path='/login' element ={<LoginPage/>} />
          <Route path='/home' element ={<Shopee/>} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
