import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Menu, X, User, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { LiquidButton } from "./liquid-glass-button"
import { Logo } from "./logo"
import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"

const Navbar1 = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('')
  const { connected, publicKey, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const profileRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const isNavigatingRef = useRef(false) // Track if we're navigating via click

  const toggleMenu = () => setIsOpen(!isOpen)
  const toggleProfile = () => setIsProfileOpen(!isProfileOpen)
  
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString())
      toast.success("Wallet address copied to clipboard!", {
        description: publicKey.toString()
      })
    }
  }

  // Close profile dropdown when clicking outside
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    if (isProfileOpen) {
      if (typeof document !== 'undefined') {
        document.addEventListener('mousedown', handleClickOutside)
      }
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isProfileOpen])

  // Track active section on dashboard
  useEffect(() => {
    if (pathname === '/dashboard') {
      const handleScroll = () => {
        const sections = ['dashboard', 'buy', 'policies'];
        const scrollPosition = window.scrollY + 150; // Offset for navbar

        for (let i = sections.length - 1; i >= 0; i--) {
          const section = document.getElementById(sections[i]);
          if (section) {
            const offsetTop = section.offsetTop;
            if (scrollPosition >= offsetTop) {
              setActiveSection(sections[i]);
              break;
            }
          }
        }
      };

      window.addEventListener('scroll', handleScroll);
      handleScroll(); // Check on mount

      return () => window.removeEventListener('scroll', handleScroll);
    } else if (pathname === '/') {
      // Track active section on home page
      const handleScroll = () => {
        // Don't update active section if we're navigating via click
        if (isNavigatingRef.current) {
          return;
        }
        
        const sections = ['hero', 'about', 'policies', 'features', 'contact'];
        const scrollPosition = window.scrollY;
        const offset = 200; // Offset for navbar and padding

        let currentSection = 'hero';

        // Check sections from bottom to top to find the most recent one we've entered
        for (let i = sections.length - 1; i >= 0; i--) {
          const sectionName = sections[i];
          const section = document.querySelector(`[data-section="${sectionName}"]`) || 
                         document.getElementById(sectionName) ||
                         document.querySelector(`#${sectionName}`);
          
          if (section) {
            const rect = (section as HTMLElement).getBoundingClientRect();
            const sectionTop = window.scrollY + rect.top;
            
            // If we've scrolled past this section's top (with offset), this is the active section
            if (scrollPosition + offset >= sectionTop) {
              currentSection = sectionName;
              break; // Found the most recent section, stop checking
            }
          }
        }

        // Special case: if at very top, always show hero
        if (scrollPosition < 50) {
          currentSection = 'hero';
        }

        setActiveSection(currentSection);
      };

      window.addEventListener('scroll', handleScroll);
      // Initialize with hero if no hash
      if (!window.location.hash) {
        setActiveSection('hero');
      }
      handleScroll(); // Check on mount

      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [pathname])

  // Handle hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const dashboardSections = ['dashboard', 'buy', 'policies'];
      const homeSections = ['hero', 'about', 'policies', 'features', 'contact'];
      
      if (pathname === '/dashboard' && dashboardSections.includes(hash)) {
        setActiveSection(hash);
      } else if (pathname === '/' && homeSections.includes(hash)) {
        setActiveSection(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check on mount

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [pathname])

  const navItems = (() => {
    // Home page
    if (pathname === '/') {
      const base = [
        { name: 'Home', path: '/', section: 'hero' },
        { name: 'About', path: '/', section: 'about' },
        { name: 'Policies', path: '/', section: 'policies' },
        { name: 'Features', path: '/', section: 'features' },
        { name: 'Contact', path: '/', section: 'contact' },
      ]
      if (connected && publicKey) {
        base.push({ name: 'Dashboard', path: '/dashboard', section: 'dashboard' })
      }
      return base
    }
    // Dashboard/other pages
    if (connected && publicKey) {
      return [
        { name: 'Home', path: '/', section: 'hero' },
        { name: 'Dashboard', path: '/dashboard', section: 'dashboard' },
        { name: 'My Policies', path: '/dashboard', section: 'policies' },
        { name: 'Buy Policies', path: '/dashboard', section: 'buy' },
      ]
    }
    return [
      { name: 'Home', path: '/', section: 'hero' },
    ]
  })()

  const handleNavClick = (item: { name: string; path: string; section: string }) => {
    // Always send Home to '/'
    if (item.name === 'Home') {
      if (pathname === '/') {
        // Already on home: smoothly scroll to top
        isNavigatingRef.current = true;
        setActiveSection('hero');
        
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        
        // Update URL hash
        window.history.pushState(null, '', '/');
        
        // Allow scroll handler to resume after scroll completes
        setTimeout(() => {
          isNavigatingRef.current = false;
          setActiveSection('hero');
        }, 800);
      } else {
        // Navigate to home, then scroll to top after page loads
        router.push('/');
        // Wait for navigation to complete, then scroll smoothly
        setTimeout(() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }, 100);
      }
      setIsOpen(false)
      return
    }

    // If the link targets Home sections
    if (item.path === '/') {
      if (pathname !== '/') {
        // Navigate to home with hash; home page can handle scrolling
        router.push(`/#${item.section}`)
      } else {
        // Already on home: smooth scroll to section
        // Try multiple ways to find the section
        let element = document.querySelector(`[data-section="${item.section}"]`);
        if (!element) {
          element = document.getElementById(item.section);
        }
        if (!element) {
          element = document.querySelector(`#${item.section}`);
        }
        
        if (element) {
          const offset = 120; // Navbar height + padding
          const rect = (element as HTMLElement).getBoundingClientRect();
          const elementPosition = rect.top + window.pageYOffset;
          const offsetPosition = elementPosition - offset;

          // Set active section immediately and prevent scroll handler from overriding
          setActiveSection(item.section);
          isNavigatingRef.current = true;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          
          // Update URL hash
          window.history.pushState(null, '', `#${item.section}`);
          
          // Allow scroll handler to resume after scroll completes
          setTimeout(() => {
            isNavigatingRef.current = false;
            // Ensure active section is still correct after scroll
            setActiveSection(item.section);
          }, 800);
        } else {
          // Fallback: try scrolling after a small delay to ensure DOM is ready
          setTimeout(() => {
            const fallbackElement = document.querySelector(`[data-section="${item.section}"]`) ||
                                   document.getElementById(item.section) ||
                                   document.querySelector(`#${item.section}`);
            if (fallbackElement) {
              const offset = 120;
              const rect = (fallbackElement as HTMLElement).getBoundingClientRect();
              const elementPosition = rect.top + window.pageYOffset;
              const offsetPosition = elementPosition - offset;
              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });
              window.history.pushState(null, '', `#${item.section}`);
              setActiveSection(item.section);
            }
          }, 100);
        }
      }
      setIsOpen(false)
      return
    }

    // Dashboard navigation: if already on dashboard, scroll to subsection
    if (item.path === '/dashboard') {
      if (pathname === '/dashboard') {
        const element =
          document.querySelector(`[data-section="${item.section}"]`) ||
          document.getElementById(item.section) ||
          document.querySelector(`#${item.section}`)
        if (element) {
          const offset = 120; // Navbar height + padding
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          
          // Update URL hash
          window.history.pushState(null, '', `#${item.section}`);
          setActiveSection(item.section);
          setIsOpen(false)
          return
        }
      }
      router.push(`/dashboard#${item.section}`)
      setIsOpen(false)
      return
    }

    // Otherwise, go to the item's path
    router.push(item.path)
    setIsOpen(false)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center w-full py-6 px-4">
      <div className="flex items-center justify-between px-6 py-3 bg-white rounded-full shadow-lg relative border border-gray-200 navbar-white" style={{ width: '768px', height: '58px' }}>
        <div className="flex items-center flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0"
          >
            <button 
              onClick={() => {
                if (pathname === '/') {
                  // Already on home: smoothly scroll to top
                  isNavigatingRef.current = true;
                  setActiveSection('hero');
                  
                  window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                  });
                  
                  window.history.pushState(null, '', '/');
                  
                  setTimeout(() => {
                    isNavigatingRef.current = false;
                    setActiveSection('hero');
                  }, 800);
                } else {
                  // Navigate to home, then scroll to top after page loads
                  router.push('/');
                  setTimeout(() => {
                    window.scrollTo({
                      top: 0,
                      behavior: 'smooth'
                    });
                  }, 100);
                }
              }} 
              className="flex items-center flex-shrink-0"
            >
              <Logo size={35} variant="dark" />
            </button>
          </motion.div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <button
                onClick={() => handleNavClick(item)}
                className={`text-sm transition-colors font-medium relative ${
                  ((pathname === '/' && item.section === activeSection) || 
                   (pathname === '/dashboard' && item.name === 'Dashboard' && activeSection === 'dashboard') ||
                   (pathname === '/dashboard' && item.section === activeSection))
                    ? 'text-purple-600'
                    : 'text-black hover:text-purple-600'
                }`}
              >
                {item.name}
                {((pathname === '/' && item.section === activeSection) ||
                  (pathname === '/dashboard' && item.section === activeSection) ||
                  (pathname === '/dashboard' && item.name === 'Dashboard' && activeSection === 'dashboard')) && (
                  <motion.span
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-purple-600 rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            </motion.div>
          ))}
        </nav>

        {/* Desktop Auth Button */}
        <motion.div
          className="hidden md:block relative"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {connected && publicKey ? (
            <div className="relative" ref={profileRef}>
              <LiquidButton
                onClick={toggleProfile}
                size="sm"
                className="px-5 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-mono text-xs">{formatAddress(publicKey.toString())}</span>
                </div>
              </LiquidButton>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50"
                  >
                    {/* Account Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            Wallet Connected
                          </div>
                          <div className="text-xs text-gray-500 font-mono">{formatAddress(publicKey.toString())}</div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="px-2 py-2 space-y-1">
                      <button
                        onClick={() => {
                          router.push('/dashboard')
                          setIsProfileOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Dashboard
                      </button>
                      <button
                        onClick={copyAddress}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Address
                      </button>
                    </div>

                    {/* Disconnect */}
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={() => {
                          disconnect();
                          setIsProfileOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <LiquidButton 
              size="sm" 
              className="px-5 py-2 text-sm text-purple-600"
              onClick={() => setVisible(true)}
            >
              Connect Wallet
            </LiquidButton>
          )}
        </motion.div>

        {/* Mobile Menu Button */}
        <motion.button className="md:hidden flex items-center" onClick={toggleMenu} whileTap={{ scale: 0.9 }}>
          <Menu className="h-6 w-6 text-gray-900" />
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 mt-2 mx-4 bg-white rounded-xl shadow-lg border border-gray-200 py-4 z-50 md:hidden"
          >
            <div className="px-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Menu</h3>
                <button onClick={toggleMenu} className="p-1">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-2">
                {navItems.map((item, index) => (
                  <motion.button
                    key={item.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => handleNavClick(item)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      ((pathname === '/' && item.section === activeSection) || 
                       (pathname === '/dashboard' && item.name === 'Dashboard' && activeSection === 'dashboard') ||
                       (pathname === '/dashboard' && item.section === activeSection))
                        ? 'bg-purple-50 text-purple-600 font-medium'
                        : 'text-black hover:bg-purple-50 hover:text-purple-600'
                    }`}
                  >
                    {item.name}
                  </motion.button>
                ))}
              </div>

              {/* Mobile Auth Section */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                {connected && publicKey ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 rounded-lg border border-gray-200">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 font-mono">
                        {formatAddress(publicKey.toString())}
                      </span>
                    </div>
                    <LiquidButton 
                      size="lg" 
                      className="w-full px-5 py-3 text-base"
                      onClick={() => {
                        router.push('/dashboard')
                        toggleMenu();
                      }}
                    >
                      Dashboard
                    </LiquidButton>
                    <LiquidButton 
                      size="lg" 
                      className="w-full px-5 py-3 text-base"
                      onClick={() => {
                        disconnect();
                        toggleMenu();
                      }}
                    >
                      Disconnect
                    </LiquidButton>
                  </div>
                ) : (
                  <LiquidButton 
                    size="lg" 
                    className="w-full px-5 py-3 text-base text-purple-600"
                    onClick={() => {
                      setVisible(true);
                      toggleMenu();
                    }}
                  >
                    Connect Wallet
                  </LiquidButton>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Wallet modal is provided by WalletModalProvider at root */}
    </div>
  )
}

export { Navbar1 }