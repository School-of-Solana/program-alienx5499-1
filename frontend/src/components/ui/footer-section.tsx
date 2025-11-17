"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react"

function Footerdemo() {

  return (
    <>
      {/* Black overlay behind the footer, fixed to bottom, matches footer size */}
      <div
        id="footer-black-overlay"
        style={{
          position: 'fixed',
          left: 0,
          bottom: 0,
          width: '100vw',
          height: 'auto',
          zIndex: 49,
          pointerEvents: 'none',
          background: 'black',
          opacity: 0.85,
          transition: 'height 0.2s',
        }}
      >
        {/* This overlay will be sized by JS to match the footer height if needed */}
      </div>
      <footer
        className="z-50 border-t text-white glass py-1"
        id="footer-section"
        style={{
          backdropFilter: 'blur(12px) saturate(180%)',
          background:
            'linear-gradient(90deg, rgba(30,64,175,0.25) 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.85) 85%, rgba(30,64,175,0.25) 100%)',
          border: '1px solid #ffffff20',
          boxShadow: '0 4px 32px 0 rgba(0,0,0,0.12)',
        }}
      >
        <div className="container mx-auto px-6 py-0 md:px-8 lg:px-16">
          <div className="grid gap-8 md:grid-cols-3 pt-4 pb-0 items-start">
            {/* ...existing code... */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
              <nav className="space-y-2 text-sm">
                <a href="#" className="block transition-colors hover:text-blue-400 text-gray-300">Home</a>
                <a href="#" className="block transition-colors hover:text-blue-400 text-gray-300">About Us</a>
                <a href="#" className="block transition-colors hover:text-blue-400 text-gray-300">Insurance Plans</a>
                <a href="#" className="block transition-colors hover:text-blue-400 text-gray-300">How It Works</a>
                <a href="#" className="block transition-colors hover:text-blue-400 text-gray-300">Contact</a>
              </nav>
            </div>
            {/* ...existing code... */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">Contact Us</h3>
              <address className="space-y-2 text-sm not-italic text-gray-300">
                <p>Flight Delay Insurance Platform</p>
                <p>Built on Solana Blockchain</p>
                <p>Support: support@zyura.app</p>
                <p>Email: hello@zyura.app</p>
              </address>
            </div>
            {/* ...existing code... */}
            <div className="relative">
              <h3 className="mb-4 text-lg font-semibold">Follow Us</h3>
              <div className="mb-2 flex space-x-4">
                {/* ...existing code... */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-full text-blue-400 border-blue-400 bg-black">
                        <Facebook className="h-4 w-4" />
                        <span className="sr-only">Facebook</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Follow us on Facebook</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {/* ...existing code... */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-full text-blue-400 border-blue-400 bg-black">
                        <Twitter className="h-4 w-4" />
                        <span className="sr-only">Twitter</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Follow us on Twitter</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {/* ...existing code... */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-full text-blue-400 border-blue-400 bg-black">
                        <Instagram className="h-4 w-4" />
                        <span className="sr-only">Instagram</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Follow us on Instagram</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {/* ...existing code... */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-full text-blue-400 border-blue-400 bg-black">
                        <Linkedin className="h-4 w-4" />
                        <span className="sr-only">LinkedIn</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Connect with us on LinkedIn</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-col items-center justify-between gap-2 border-t border-gray-800 pt-2 text-center md:flex-row">
            <p className="text-sm text-gray-300">© {new Date().getFullYear()} ZYURA. All rights reserved.</p>
            <nav className="flex gap-4 text-sm">
              <a href="#" className="transition-colors hover:text-blue-400 text-gray-300">Privacy Policy</a>
              <a href="#" className="transition-colors hover:text-blue-400 text-gray-300">Terms of Service</a>
              <a href="#" className="transition-colors hover:text-blue-400 text-gray-300">Cookie Settings</a>
            </nav>
          </div>
        </div>
      </footer>
    </>
  )
}

export { Footerdemo }