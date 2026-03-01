import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'
import '../styles/header.css'

// assets
import signSvg from '../assets/sign.svg'

import ttSvg from '../assets/tt.svg'

export default function Header() {
  return (
    <header className="site-header">
      <nav className="header-nav">
        {/* logo that takes you to home */}
        <Link to="/" className="header-logo" aria-label="Home">
          <img src={ttSvg} alt="TumbleTracker logo" />
        </Link>

        {/* navigation links with sign background */}
        <div className="header-links">
          {/** Map */}
          <Link to="/map" className="header-tab" activeProps={{ className: 'active' }}>
            <div className="tab-sign-bg">
              <img src={signSvg} alt="" aria-hidden="true" />
              <span>Map</span>
            </div>
          </Link>

          {/** Upload Video */}
          <Link to="/upload" className="header-tab" activeProps={{ className: 'active' }}>
            <div className="tab-sign-bg">
              <img src={signSvg} alt="" aria-hidden="true" />
              <span>Upload</span>
            </div>
          </Link>

          {/** Generate Report */}
          <Link to="/report" className="header-tab" activeProps={{ className: 'active' }}>
            <div className="tab-sign-bg">
              <img src={signSvg} alt="" aria-hidden="true" />
              <span>Report</span>
            </div>
          </Link>
        </div>

        {/* right side theme toggle */}
        <div className="header-right">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}