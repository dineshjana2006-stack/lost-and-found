import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/layout/Navbar'
import Home         from './pages/Home'
import Explore      from './pages/Explore'
import ReportItem   from './pages/ReportItem'
import ItemDetails  from './pages/ItemDetails'
import MatchReport  from './pages/MatchReport'
import CaseStudies  from './pages/CaseStudies'
import NotFound     from './pages/NotFound'

export default function App() {
  const location = useLocation()
  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/"                              element={<Home />} />
          <Route path="/explore"                       element={<Explore />} />
          <Route path="/report"                        element={<ReportItem />} />
          <Route path="/lost/:id"                      element={<ItemDetails />} />
          <Route path="/found/:id"                     element={<ItemDetails />} />
          <Route path="/match-report/:lostId/:foundId" element={<MatchReport />} />
          <Route path="/case-studies"                  element={<CaseStudies />} />
          <Route path="*"                              element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}
