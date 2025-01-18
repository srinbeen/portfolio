import { BrowserRouter, Route, Routes } from "react-router-dom"
import { useState } from 'react'
import CollectionPage from "./components/CollectionPage"
import HomePage from "./components/HomePage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={"/"} element={<HomePage />} />
        <Route path={"/collection"} element={<CollectionPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App