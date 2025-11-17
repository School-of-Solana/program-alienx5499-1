"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CornerDownLeft, Plane, Zap, Shield, FileText, HelpCircle, Lock } from "lucide-react";
import { Github, Heart, Twitter } from "lucide-react";
import Image from "next/image";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { SparklesCore } from "@/components/ui/sparkles";
import { useState, useEffect } from "react";

// Color palette for ASCII logo animation
const asciiColors = [
  'rgba(255, 255, 255, 0.9)',  // white
  'rgba(139, 92, 246, 0.9)',  // purple
  'rgba(236, 72, 153, 0.9)',  // pink
  'rgba(6, 182, 212, 0.9)',   // cyan
  'rgba(255, 255, 255, 0.9)',  // back to white
];

// ASCII Logo Component with Random Character Animation
function AnimatedAsciiLogo() {
  const baseAscii = `                                  ***                       
                          **    ***                         
                           ******                           
                                                            
                  ************************                  
                  **                    **                  
                  **  ***************   **                  
                  **  **         ****   **                  
                  **            **      **                  
                  **         ***        **                  
                  **       ***      **  **                  
                  **     ***        **  **                  
                   **  ***        ***  **                   
                    **    ***  ****   **                    
                      ***    **    ***                      
                         ***    ***                         
                            ****`;

  const charSet = "!@#$%^&*()~`_+-=[]{}|;:',.<>?/";
  const [asciiArt, setAsciiArt] = useState(baseAscii);
  const [colorIndex, setColorIndex] = useState(0);
  const [glowIntensity, setGlowIntensity] = useState(0.5);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const randomizeChars = () => {
      const lines = baseAscii.split('\n');
      const randomized = lines.map(line => {
        return line.split('').map(char => {
          // Randomize all non-space characters that form the logo
          if (char !== ' ') {
            // 30% chance to change to a random character from the set
            if (Math.random() < 0.3) {
              return charSet[Math.floor(Math.random() * charSet.length)];
            }
          }
          return char;
        }).join('');
      }).join('\n');
      setAsciiArt(randomized);
    };

    // Initial randomization
    randomizeChars();

    // Randomize every 300-800ms for dynamic effect
    const interval = setInterval(() => {
      randomizeChars();
    }, 300 + Math.random() * 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Smooth color transition every 2-4 seconds
    const colorInterval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % asciiColors.length);
    }, 2000 + Math.random() * 2000);

    return () => clearInterval(colorInterval);
  }, []);

  useEffect(() => {
    // Subtle pulse/glow animation
    const glowInterval = setInterval(() => {
      setGlowIntensity((prev) => {
        // Oscillate between 0.3 and 0.7
        return prev >= 0.7 ? 0.3 : prev + 0.05;
      });
    }, 100);

    return () => clearInterval(glowInterval);
  }, []);

  useEffect(() => {
    // Subtle scale pulse animation
    const scaleInterval = setInterval(() => {
      setScale((prev) => {
        // Oscillate between 0.98 and 1.02
        return prev >= 1.02 ? 0.98 : prev + 0.002;
      });
    }, 50);

    return () => clearInterval(scaleInterval);
  }, []);

  const currentColor = asciiColors[colorIndex];
  const [r, g, b] = currentColor.match(/\d+/g)?.slice(0, 3).map(Number) || [255, 255, 255];
  
  return (
    <pre 
      className="text-[10px] xl:text-[13px] font-mono whitespace-pre select-none" 
      style={{ 
        fontFamily: 'monospace', 
        letterSpacing: '0.15px', 
        lineHeight: '1.2',
        color: currentColor,
        transition: 'color 2.5s ease-in-out, transform 0.1s ease-out, filter 0.1s ease-out',
        transform: `scale(${scale})`,
        filter: `drop-shadow(0 0 ${glowIntensity * 8}px rgba(${r}, ${g}, ${b}, ${glowIntensity})) 
                 drop-shadow(0 0 ${glowIntensity * 4}px rgba(${r}, ${g}, ${b}, ${glowIntensity * 0.6}))`,
        textShadow: `0 0 ${glowIntensity * 6}px rgba(${r}, ${g}, ${b}, ${glowIntensity * 0.8})`
      }}
    >
      {asciiArt}
    </pre>
  );
}

// Top Footer Section with CTA
function FooterCTA() {
  return (
    <div className="relative w-full h-[20rem] rounded-[1.25rem] border-[0.75px] border-gray-800 p-2 md:rounded-[1.5rem] md:p-3">
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={3}
      />
      <footer className="relative overflow-hidden rounded-xl border-[0.75px] border-gray-800 bg-black w-full h-full">
        {/* Animated Background gradient with purple/pink/cyan */}
        <div className="absolute inset-0 w-full h-full">
          <motion.div
            className="absolute top-0 left-0 h-[400px] w-[400px] rounded-full opacity-30 blur-[120px]"
            style={{
              background: `radial-gradient(circle at center, #8b5cf6, transparent 70%)`,
            }}
            animate={{
              x: [0, 30, 0],
              y: [0, 20, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute right-0 bottom-0 h-[300px] w-[300px] rounded-full opacity-20 blur-[100px]"
            style={{
              background: `radial-gradient(circle at center, #ec4899, transparent 70%)`,
            }}
            animate={{
              x: [0, -20, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[200px] w-[200px] rounded-full opacity-15 blur-[80px]"
            style={{
              background: `radial-gradient(circle at center, #06b6d4, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
        </div>

        {/* Sparkles effect */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <SparklesCore
            id="footer-sparkles"
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={100}
            className="absolute inset-0 w-full h-full"
            particleColor="#8b5cf6"
          />
        </div>

        {/* Logo positioned in top right */}
        <div className="absolute right-0 xl:right-0 md:flex hidden top-4 xl:top-6 bottom-4 xl:bottom-6 left-auto items-center justify-center p-2 xl:p-3">
          <div className="flex items-center justify-center h-full">
            <AnimatedAsciiLogo />
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-start px-4 md:px-8 pt-2 pb-4 justify-between sm:justify-center h-full">
          <div className="relative flex flex-col items-start justify-start">
            <p className="max-w-lg mt-3 tracking-tight font-semibold text-xl md:text-3xl text-left bg-clip-text text-transparent bg-gradient-to-b from-white via-purple-200 to-pink-200">
              Ready to experience instant, automated flight delay protection?
            </p>
            <p className="text-sm pt-3 text-neutral-300 max-w-xl text-left">
              Get instant USDC payouts when your flight is delayed. No claims forms, no adjusters—just transparent, community-governed protection powered by Solana smart contracts.
            </p>
          </div>
          <motion.div
            className="w-full flex flex-row md:gap-4 gap-2 flex-wrap md:justify-start justify-center items-stretch md:items-start mt-6"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          >
            <Button
              className="w-full md:w-52 h-12 text-white relative isolate inline-flex items-center justify-center overflow-hidden rounded-md px-3 text-left text-sm font-medium bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-500 hover:via-pink-500 hover:to-cyan-500 transition-all duration-300 shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/70"
              asChild
            >
              <Link className="flex group items-center gap-2" href="#contact">
                <span>Get Started</span>
                <Badge className="bg-white/20 p-1 text-white transition-all duration-200 ease-in-out group-hover:shadow-xl shadow-background/70">
                  <CornerDownLeft className="size-4" />
                </Badge>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full md:w-52 h-12 text-white border-purple-500/50 bg-black/50 hover:bg-purple-500/10 hover:border-purple-500 hover:text-white relative isolate inline-flex items-center justify-center overflow-hidden rounded-md px-3 text-left text-sm font-medium transition-all duration-300 [&>a]:text-white [&>a:hover]:text-white"
              asChild
            >
              <Link
                className="flex group items-center gap-2 text-white hover:text-white"
                href="https://github.com/alienx5499/ZYURA"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="text-white group-hover:text-white z-10">Github</span>
                <Badge className="bg-purple-500/30 text-white border-purple-500/50 transition-all duration-200 group-hover:shadow-xl group-hover:bg-purple-500/50 shadow-white/70 z-10">
                  <Github className="size-4" />
                </Badge>
              </Link>
            </Button>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}

// Main Footer Component
export function ZyuraFooter() {
  return (
    <div className="relative w-full rounded-3xl border-[0.75px] border-gray-800 p-2">
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={3}
      />
      <footer className="relative overflow-hidden rounded-3xl border-[0.75px] border-gray-800 bg-black w-full">
        <div className="p-4">
          <FooterCTA />
        </div>
        <div className="pt-12 pb-2 md:pb-12 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Top Section */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, staggerChildren: 0.1 }}
            >
              {/* Logo and Description */}
              <div className="lg:col-span-1">
                <div className="flex items-start mb-4">
                  <Image
                    src="/logo.svg"
                    alt="ZYURA Logo"
                    width={360}
                    height={72}
                    className="h-[72px] w-auto object-contain object-left"
                    style={{
                      display: 'block',
                      objectFit: 'contain',
                      objectPosition: 'left center'
                    }}
                  />
                </div>
                <p className="text-sm text-neutral-300 mb-4 leading-relaxed">
                  Instant, fair, community-owned flight delay insurance on Solana.
                  Get automated USDC payouts when delays occur.
                </p>
                <div className="flex gap-2">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-neutral-400 hover:text-white hover:bg-purple-500/10 border border-transparent hover:border-purple-500/50 transition-all"
                    >
                      <Link
                        href="https://github.com/alienx5499/ZYURA"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="h-4 w-4" />
                      </Link>
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-neutral-400 hover:text-white hover:bg-pink-500/10 border border-transparent hover:border-pink-500/50 transition-all"
                    >
                      <Link
                        href="https://x.com/zyura"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Twitter className="h-4 w-4" />
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Product */}
              <div>
                <h4 className="font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 flex items-center gap-2">
                  <Plane className="h-4 w-4 text-purple-400" />
                  Product
                </h4>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link
                      href="/#about"
                      scroll={true}
                      className="text-neutral-400 hover:text-purple-400 transition-colors duration-200 inline-block relative group"
                    >
                      About ZYURA
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-purple-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#features"
                      scroll={true}
                      className="text-neutral-400 hover:text-purple-400 transition-colors duration-200 inline-block relative group"
                    >
                      Features
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-purple-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#policies"
                      scroll={true}
                      className="text-neutral-400 hover:text-purple-400 transition-colors duration-200 inline-block relative group"
                    >
                      Active Policies
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-purple-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#contact"
                      scroll={true}
                      className="text-neutral-400 hover:text-purple-400 transition-colors duration-200 inline-block relative group"
                    >
                      Contact Us
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-purple-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h4 className="font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-cyan-400 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-pink-400" />
                  Resources
                </h4>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link
                      href="https://github.com/alienx5499/ZYURA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-pink-400 transition-colors duration-200 inline-block relative group"
                    >
                      Documentation
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-pink-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="https://github.com/alienx5499/ZYURA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-pink-400 transition-colors duration-200 inline-block relative group"
                    >
                      GitHub Repository
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-pink-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="https://github.com/alienx5499/ZYURA/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-pink-400 transition-colors duration-200 inline-block relative group"
                    >
                      Report Issue
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-pink-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="text-neutral-400 hover:text-pink-400 transition-colors duration-200 inline-block relative group"
                    >
                      FAQ
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-pink-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-cyan-400" />
                  Legal
                </h4>
                <ul className="space-y-3 text-sm">
                  <li>
                    <Link
                      href="#"
                      className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 inline-block relative group"
                    >
                      Privacy Policy
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-cyan-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 inline-block relative group"
                    >
                      Terms of Service
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-cyan-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 inline-block relative group"
                    >
                      Cookie Policy
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-cyan-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="https://github.com/alienx5499/ZYURA/blob/main/LICENSE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 inline-block relative group"
                    >
                      License
                      <span className="absolute left-0 bottom-0 w-0 h-px bg-cyan-400 transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Bottom Section */}
            <div className="border-t border-gray-800/50 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex flex-col md:flex-row items-center gap-4 mb-4 md:mb-0">
                  <p className="text-sm text-neutral-400">
                    © {new Date().getFullYear()} ZYURA. Made with{" "}
                    <Heart className="inline h-3 w-3 text-pink-500 fill-current animate-pulse" />{" "}
                    for travelers who deserve instant protection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

