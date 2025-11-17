'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, HelpCircle, ShieldCheck, FileText, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { Card, CardContent } from '@/components/ui/card';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon: React.ReactNode;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ZYURA Dashboard!',
    description: 'This interactive tutorial will guide you through the key features of the dashboard. Let\'s get started!',
    targetSelector: '#dashboard',
    position: 'bottom',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: 'buy-insurance-intro',
    title: 'Buy Insurance',
    description: 'Let\'s learn how to purchase flight delay insurance. First, click "Buy Policy" to open the form.',
    targetSelector: '#buy button',
    position: 'bottom',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    id: 'buy-insurance-product',
    title: 'Select Product',
    description: 'Choose an insurance product from the dropdown. Each product has different coverage and premium rates.',
    targetSelector: '#buy select:first-of-type',
    position: 'bottom',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    id: 'buy-insurance-pnr',
    title: 'Enter PNR (Optional)',
    description: 'Watch as we type a PNR code. When you enter a 6-character PNR, the system automatically fetches and fills your flight details!',
    targetSelector: '#buy input[placeholder*="6-character"], #buy input[placeholder*="PNR"]',
    position: 'bottom',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    id: 'buy-insurance-pnr-fetching',
    title: 'Fetching PNR Data...',
    description: 'The system is now fetching your flight details from the PNR. This happens automatically when you enter a valid 6-character code.',
    targetSelector: '#buy input[placeholder*="6-character"], #buy input[placeholder*="PNR"]',
    position: 'bottom',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    id: 'buy-insurance-pnr-result',
    title: 'PNR Data Fetched!',
    description: 'Great! The PNR was found and your flight details have been auto-filled. You can see the flight number, date, time, and passenger information below.',
    targetSelector: '#buy',
    position: 'right',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    id: 'buy-insurance-flight',
    title: 'Enter Flight Number',
    description: 'Enter your flight number (e.g., AI202, AP986). This identifies which flight you want to insure.',
    targetSelector: '#buy input[placeholder*="AI202"], #buy input[placeholder*="AP986"]',
    position: 'bottom',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    id: 'buy-insurance-date',
    title: 'Select Departure Date',
    description: 'Choose the date when your flight is scheduled to depart.',
    targetSelector: '#buy input[type="date"]',
    position: 'bottom',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    id: 'buy-insurance-time',
    title: 'Select Departure Time',
    description: 'Select the scheduled departure time for your flight from the dropdown.',
    targetSelector: '#buy select:nth-of-type(2)',
    position: 'bottom',
    icon: <ShieldCheck className="w-5 h-5" />,
  },
  {
    id: 'product-details',
    title: 'Product Details',
    description: 'View insurance product information including coverage amount, premium rate, and delay threshold. Select different products to compare.',
    targetSelector: '[data-tutorial="product-details"]',
    position: 'left',
    icon: <Info className="w-5 h-5" />,
  },
  {
    id: 'my-policies',
    title: 'My Policies',
    description: 'View all your purchased insurance policies here. Click on any policy card to see detailed information including status, coverage, and payout details.',
    targetSelector: '#policies',
    position: 'right',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 'how-it-works',
    title: 'How It Works',
    description: 'This section explains the insurance process: select product → pay premium → receive NFT → get automatic payouts for delays.',
    targetSelector: '[data-tutorial="how-it-works"]',
    position: 'left',
    icon: <HelpCircle className="w-5 h-5" />,
  },
];

interface InteractiveTutorialProps {
  onComplete?: () => void;
  // Form handlers for Buy Insurance step
  formHandlers?: {
    setShowBuyForm: (show: boolean) => void;
    setPnr: (value: string) => void;
    setFlightNumber: (value: string) => void;
    setDepartureDate: (value: string) => void;
    setDepartureTime: (value: string) => void;
    setProductId: (value: string) => void;
    clearForm: () => void;
  };
}

export function InteractiveTutorial({ onComplete, formHandlers }: InteractiveTutorialProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const exampleDataFilled = useRef(false);
  const pnrTypingInProgress = useRef(false);
  const pnrFetched = useRef(false);

  // Check localStorage and auto-start tutorial for first-time users
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const tutorialCompleted = localStorage.getItem('zyura-tutorial-completed');
    if (!tutorialCompleted) {
      // Auto-start tutorial after a short delay to let page load
      const timer = setTimeout(() => {
        setIsActive(true);
        setCurrentStep(0);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Fill example data for buy insurance steps
  useEffect(() => {
    if (!isActive || !formHandlers) return;

    const step = tutorialSteps[currentStep];
    const isBuyInsuranceStep = step?.id?.startsWith('buy-insurance');

    if (isBuyInsuranceStep) {
      // Open the form if not already open
      if (step.id === 'buy-insurance-intro') {
        setTimeout(() => {
          formHandlers.setShowBuyForm(true);
        }, 300);
      }

      // Handle PNR step specially with typing animation
      if (step.id === 'buy-insurance-pnr' && !pnrTypingInProgress.current) {
        pnrTypingInProgress.current = true;
        const typePnr = async () => {
          const pnrCode = 'ABC123';
          // Clear PNR first
          formHandlers.setPnr('');
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Type PNR character by character
          for (let i = 0; i < pnrCode.length; i++) {
            formHandlers.setPnr(pnrCode.slice(0, i + 1));
            await new Promise(resolve => setTimeout(resolve, 150)); // Typing speed
          }
          
          // Wait a bit then auto-advance to fetching step
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Find fetching step index and move to it
          const fetchingStepIndex = tutorialSteps.findIndex(s => s.id === 'buy-insurance-pnr-fetching');
          if (fetchingStepIndex !== -1) {
            setCurrentStep(fetchingStepIndex);
          }
          
          // Wait for fetch to complete (check for fetched passenger or status change)
          let fetchComplete = false;
          let attempts = 0;
          const maxAttempts = 30; // 15 seconds max wait
          
          while (!fetchComplete && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
            
            // Check if fetch completed by looking for passenger info or status
            const buySection = document.querySelector('#buy');
            const helperText = buySection?.textContent || '';
            const hasPassengerDetails = buySection?.querySelector('[class*="Passenger"]') || 
                                       buySection?.textContent?.includes('Passenger Details');
            
            if (helperText.includes('PNR found') || helperText.includes('auto-filled') || hasPassengerDetails) {
              fetchComplete = true;
              pnrFetched.current = true;
              
              // Auto-advance to result step after passenger details animation
              const resultStepIndex = tutorialSteps.findIndex(s => s.id === 'buy-insurance-pnr-result');
              if (resultStepIndex !== -1) {
                setTimeout(() => {
                  setCurrentStep(resultStepIndex);
                  // Force update of rect after step change
                  setTimeout(() => {
                    const buySection = document.querySelector('#buy');
                    if (buySection) {
                      const rect = buySection.getBoundingClientRect();
                      setTargetRect(rect);
                    }
                  }, 700); // Wait for animation to complete
                }, 500);
              }
              break;
            }
          }
          
          // If fetch didn't complete after waiting, still show result
          if (!fetchComplete) {
            // Fill manually if fetch didn't work
            formHandlers.setFlightNumber('AI202');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            formHandlers.setDepartureDate(tomorrow.toISOString().split('T')[0]);
            formHandlers.setDepartureTime('14:30');
            
            // Still move to result step
            const resultStepIndex = tutorialSteps.findIndex(s => s.id === 'buy-insurance-pnr-result');
            if (resultStepIndex !== -1) {
              setTimeout(() => {
                setCurrentStep(resultStepIndex);
              }, 1000);
            }
          }
        };
        
        typePnr();
      }
      
      // Fill example data progressively for other steps
      if (!exampleDataFilled.current && !step.id?.startsWith('buy-insurance-pnr')) {
        const fillData = async () => {
          // Wait a bit for form to open
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Set product ID first (if products available)
          const productSelect = document.querySelector('#buy select:first-of-type') as HTMLSelectElement;
          if (productSelect && productSelect.options.length > 1) {
            formHandlers.setProductId(productSelect.options[1].value);
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          // Only fill if PNR wasn't used (which auto-fills)
          if (!pnrFetched.current) {
            formHandlers.setFlightNumber('AI202');
            await new Promise(resolve => setTimeout(resolve, 400));
            
            // Set date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            formHandlers.setDepartureDate(tomorrow.toISOString().split('T')[0]);
            await new Promise(resolve => setTimeout(resolve, 400));
            
            formHandlers.setDepartureTime('14:30');
          }
          
          exampleDataFilled.current = true;
        };
        
        fillData();
      }
    } else {
      // Clear example data when leaving buy insurance steps
      if (exampleDataFilled.current && formHandlers) {
        formHandlers.clearForm();
        exampleDataFilled.current = false;
      }
    }
  }, [currentStep, isActive, formHandlers]);

  // Update target rect when step changes or on scroll/resize
  useEffect(() => {
    if (!isActive) return;

    const updateRect = () => {
      const step = tutorialSteps[currentStep];
      if (!step) {
        setTargetRect(null);
        return;
      }
      
      // For buy-insurance-pnr-result, target the Passenger Details section specifically
      if (step.id === 'buy-insurance-pnr-result') {
        const buySection = document.querySelector('#buy');
        if (buySection) {
          // Wait a bit for passenger details to animate in
          setTimeout(() => {
            // Try to find the Passenger Details section first
            const passengerSection = buySection.querySelector('[class*="Passenger"], [class*="passenger"]')?.closest('div') ||
                                     Array.from(buySection.querySelectorAll('div')).find(div => 
                                       div.textContent?.includes('Passenger Details')
                                     );
            
            if (passengerSection) {
              const rect = passengerSection.getBoundingClientRect();
              setTargetRect(rect);
              passengerSection.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center',
              });
            } else {
              // Fallback to entire buy section
              const rect = buySection.getBoundingClientRect();
              setTargetRect(rect);
              buySection.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center',
              });
            }
          }, 600); // Wait for animation to complete
          return;
        }
      }
      
      // For buy-insurance-intro, target the button
      let selector = step.targetSelector;
      if (step.id === 'buy-insurance-intro') {
        // Try to find the Buy Policy button
        const buySection = document.querySelector('#buy');
        if (buySection) {
          const button = buySection.querySelector('button');
          if (button) {
            const rect = button.getBoundingClientRect();
            setTargetRect(rect);
            return;
          }
        }
      }
      
      // For buy-insurance-time, find the departure time select specifically
      if (step.id === 'buy-insurance-time') {
        const buySection = document.querySelector('#buy');
        if (buySection) {
          // Find all labels and selects
          const labels = Array.from(buySection.querySelectorAll('label'));
          const departureTimeLabel = labels.find(label => 
            label.textContent?.includes('Departure Time')
          );
          
          if (departureTimeLabel) {
            // Find the select that's a sibling or in the same container
            const parent = departureTimeLabel.parentElement;
            const select = parent?.querySelector('select');
            if (select) {
              const rect = select.getBoundingClientRect();
              setTargetRect(rect);
              setTimeout(() => {
                select.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                  inline: 'center',
                });
              }, 100);
              return;
            }
          }
          
          // Fallback: find the second select (after product select)
          const selects = Array.from(buySection.querySelectorAll('select'));
          if (selects.length >= 2) {
            const rect = selects[1].getBoundingClientRect();
            setTargetRect(rect);
            setTimeout(() => {
              selects[1].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center',
              });
            }, 100);
            return;
          }
        }
      }
      
      const targetElement = document.querySelector(selector);
      if (!targetElement) {
        setTargetRect(null);
        return;
      }
      
      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll element into view with a delay to ensure smooth animation
      setTimeout(() => {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }, 100);
    };

    updateRect();

    const handleResize = () => updateRect();
    const handleScroll = () => updateRect();
    
    // Also watch for DOM changes (like Passenger Details appearing)
    const observer = new MutationObserver(() => {
      // Debounce updates
      clearTimeout((window as any).tutorialUpdateTimeout);
      (window as any).tutorialUpdateTimeout = setTimeout(() => {
        updateRect();
      }, 100);
    });

    // Observe the buy section for changes
    const buySection = document.querySelector('#buy');
    if (buySection) {
      observer.observe(buySection, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      observer.disconnect();
      clearTimeout((window as any).tutorialUpdateTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isActive, currentStep]);

  const startTutorial = () => {
    exampleDataFilled.current = false;
    pnrTypingInProgress.current = false;
    pnrFetched.current = false;
    setIsActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      let nextStepIndex = currentStep + 1;
      
      // Special handling for PNR steps - typing animation handles transitions
      const currentStepData = tutorialSteps[currentStep];
      if (currentStepData?.id === 'buy-insurance-pnr-fetching' || currentStepData?.id === 'buy-insurance-pnr-result') {
        // Allow manual navigation from fetching/result steps
        // The typing animation will handle auto-advance
      }
      
      // Skip steps where target element doesn't exist or if PNR was fetched (skip flight/date steps)
      while (nextStepIndex < tutorialSteps.length) {
        const nextStep = tutorialSteps[nextStepIndex];
        
        // Skip flight number and date steps if PNR was fetched (fields are auto-filled)
        if (pnrFetched.current && (nextStep.id === 'buy-insurance-flight' || nextStep.id === 'buy-insurance-date')) {
          nextStepIndex++;
          continue;
        }
        
        const targetElement = document.querySelector(nextStep.targetSelector);
        if (targetElement || nextStep.id === 'welcome' || nextStep.id === 'buy-insurance-pnr-fetching' || nextStep.id === 'buy-insurance-pnr-result') {
          setCurrentStep(nextStepIndex);
          break;
        }
        nextStepIndex++;
      }
      // If we've skipped all remaining steps, complete tutorial
      if (nextStepIndex >= tutorialSteps.length) {
        completeTutorial();
      }
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      let prevStepIndex = currentStep - 1;
      
      // Skip flight number and date steps if PNR was fetched (fields are auto-filled)
      while (prevStepIndex >= 0) {
        const prevStep = tutorialSteps[prevStepIndex];
        
        // Skip flight number and date steps if PNR was fetched
        if (pnrFetched.current && (prevStep.id === 'buy-insurance-flight' || prevStep.id === 'buy-insurance-date')) {
          prevStepIndex--;
          continue;
        }
        
        setCurrentStep(prevStepIndex);
        break;
      }
    }
  };

  const completeTutorial = () => {
    // Clear example data if filled
    if (exampleDataFilled.current && formHandlers) {
      formHandlers.clearForm();
      exampleDataFilled.current = false;
    }
    pnrTypingInProgress.current = false;
    pnrFetched.current = false;
    setIsActive(false);
    setCurrentStep(0);
    onComplete?.();
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('zyura-tutorial-completed', 'true');
    }
  };

  const skipTutorial = () => {
    completeTutorial();
  };

  const currentStepData = tutorialSteps[currentStep];

  // In dev mode, show the Start Tutorial button for testing
  const isDevMode = process.env.NODE_ENV === 'development';

  if (!isActive) {
    // Show button only in dev mode
    if (isDevMode) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={startTutorial}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Start Tutorial</span>
          </Button>
        </motion.div>
      );
    }
    return null;
  }

  // Calculate tooltip position based on step position preference
  const getTooltipStyle = () => {
    const step = tutorialSteps[currentStep];
    if (!step) return { top: '50%', left: '50%' };

    const targetElement = document.querySelector(step.targetSelector);
    if (!targetElement) {
      // Center if element not found
      return { 
        top: `${window.innerHeight / 2 - 100}px`, 
        left: `${window.innerWidth / 2 - 160}px` 
      };
    }

    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = 360; // Slightly wider for better readability
    const tooltipHeight = 240; // More accurate height estimate
    const spacing = 40; // Increased spacing to avoid overlap

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'top':
        top = rect.top - tooltipHeight - spacing;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + spacing;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        // Position to the left of the element, vertically centered
        // Ensure it's well to the left with good spacing
        left = rect.left - tooltipWidth - spacing;
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        // Only move to right if absolutely necessary (not enough space on left)
        if (left < 20) {
          left = rect.right + spacing;
        }
        break;
      case 'right':
        // Position to the right of the element, vertically centered
        // Ensure it's well to the right with good spacing
        left = rect.right + spacing;
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        // Only move to left if absolutely necessary (not enough space on right)
        if (left + tooltipWidth > window.innerWidth - 20) {
          left = rect.left - tooltipWidth - spacing;
        }
        break;
      case 'center':
        top = window.innerHeight / 2 - tooltipHeight / 2;
        left = window.innerWidth / 2 - tooltipWidth / 2;
        break;
    }

    // Ensure tooltip stays within viewport (but preserve left/right preference)
    if (step.position === 'left' && left < 20) {
      // If forced to move right, at least keep it away from the element
      left = Math.max(20, rect.right + spacing);
    } else if (step.position === 'right') {
      // For right position, ensure it stays on the right side
      if (left + tooltipWidth > window.innerWidth - 20) {
        // If not enough space on right, move to left but keep good spacing
        left = Math.max(20, rect.left - tooltipWidth - spacing);
      }
      // Ensure minimum spacing from element even if adjusted
      if (left < rect.right + spacing && left + tooltipWidth > rect.left - spacing) {
        // If it would overlap, force it to the right side with minimum spacing
        left = rect.right + spacing;
        // If still doesn't fit, move to left
        if (left + tooltipWidth > window.innerWidth - 20) {
          left = rect.left - tooltipWidth - spacing;
        }
      }
    } else {
      // For other positions (top, bottom, center), apply normal constraints
      if (left < 20) left = 20;
      if (left + tooltipWidth > window.innerWidth - 20) {
        left = window.innerWidth - tooltipWidth - 20;
      }
    }
    
    // Vertical constraints
    if (top < 20) top = 20;
    if (top + tooltipHeight > window.innerHeight - 20) {
      top = window.innerHeight - tooltipHeight - 20;
    }

    return { top: `${top}px`, left: `${left}px` };
  };


  return (
    <>
      {/* Overlay with rectangular cutout using 4 sections */}
      {targetRect ? (
        <>
          {/* Top overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9998] pointer-events-auto bg-black/85"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: `${Math.max(0, targetRect.top - 8)}px`,
            }}
          />
          {/* Bottom overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9998] pointer-events-auto bg-black/85"
            style={{
              top: `${targetRect.bottom + 8}px`,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Left overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9998] pointer-events-auto bg-black/85"
            style={{
              top: `${Math.max(0, targetRect.top - 8)}px`,
              left: 0,
              width: `${Math.max(0, targetRect.left - 8)}px`,
              height: `${targetRect.height + 16}px`,
            }}
          />
          {/* Right overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9998] pointer-events-auto bg-black/85"
            style={{
              top: `${Math.max(0, targetRect.top - 8)}px`,
              left: `${targetRect.right + 8}px`,
              right: 0,
              height: `${targetRect.height + 16}px`,
            }}
          />
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] pointer-events-auto bg-black/85"
        />
      )}

      {/* Highlight container with glowing effect */}
      {targetRect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: `${targetRect.top - 12}px`,
            left: `${targetRect.left - 12}px`,
            width: `${targetRect.width + 24}px`,
            height: `${targetRect.height + 24}px`,
          }}
        >
          <div className="relative w-full h-full rounded-[1.25rem] md:rounded-3xl">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="absolute inset-0 rounded-[1.25rem] md:rounded-3xl border-[0.75px] border-indigo-500/50" />
          </div>
        </motion.div>
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed z-[10000] pointer-events-auto"
          style={getTooltipStyle()}
        >
          <div className="relative rounded-[1.25rem] border-[0.75px] border-gray-800 p-2 md:rounded-3xl md:p-3">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <Card className="relative overflow-hidden rounded-xl border-[0.75px] border-gray-800 bg-black w-[360px]">
              <CardContent className="p-6 md:p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {currentStepData.icon}
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {currentStepData.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Step {currentStep + 1} of {tutorialSteps.length}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={skipTutorial}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                  {currentStepData.description}
                </p>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-3">
                  <Button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-gray-700 bg-transparent text-white hover:bg-gray-800 hover:text-white hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    onClick={nextStep}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
                    size="sm"
                  >
                    {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                    {currentStep < tutorialSteps.length - 1 && (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

