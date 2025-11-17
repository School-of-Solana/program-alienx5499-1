"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, MessageCircle, Phone, MapPin } from "lucide-react";

const ContactSection = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Your message has been sent! We'll get back to you shortly.");
    (e.target as HTMLFormElement).reset();
  };

  const contactMethods = [
    {
      icon: <Mail className="h-6 w-6 text-cyan-400" />,
      title: "Email Support",
      description: "Get help via email",
      contact: "support@zyura.app",
      action: "mailto:support@zyura.app"
    },
    {
      icon: <MessageCircle className="h-6 w-6 text-purple-400" />,
      title: "Live Chat",
      description: "Chat with our team",
      contact: "Available 24/7",
      action: "#"
    },
    {
      icon: <Phone className="h-6 w-6 text-green-400" />,
      title: "Phone Support",
      description: "Call us directly",
      contact: "+1 (555) 123-4567",
      action: "tel:+15551234567"
    },
    {
      icon: <MapPin className="h-6 w-6 text-orange-400" />,
      title: "Office Location",
      description: "Visit our headquarters",
      contact: "San Francisco, CA",
      action: "#"
    }
  ];

  return (
    <section id="contact" className="w-full py-20 px-4 bg-black">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Get in Touch
          </h2>
          <p className="text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto">
            Have questions about ZYURA? We&apos;re here to help you get instant, automated flight delay protection.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Contact Methods */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-6">Contact Methods</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contactMethods.map((method, index) => (
                <div
                  key={index}
                  className="relative p-6 rounded-xl bg-black/50 border border-white/10 backdrop-blur-md [box-shadow:0_0_0_1px_rgba(255,255,255,.06),0_10px_30px_rgba(0,0,0,.45)] transition-all duration-300 hover:border-white/20 group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-purple-900/20 opacity-50 group-hover:opacity-80 transition-opacity rounded-xl" />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      {method.icon}
                      <h4 className="text-lg font-semibold text-white">{method.title}</h4>
                    </div>
                    <p className="text-neutral-300 text-sm mb-2">{method.description}</p>
                    <p className="text-white font-medium">{method.contact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div className="relative overflow-hidden rounded-xl bg-black/50 border border-white/10 backdrop-blur-md [box-shadow:0_0_0_1px_rgba(255,255,255,.06),0_10px_30px_rgba(0,0,0,.45)] transition-all duration-300 hover:border-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-cyan-900/30 opacity-50" />
            <div className="relative p-6">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-2xl text-purple-300">Send us a Message</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-neutral-200">Name</Label>
                      <Input 
                        id="name" 
                        placeholder="Your Name" 
                        required 
                        className="bg-gray-800/50 border-gray-600/50 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-neutral-200">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="your.email@example.com" 
                        required 
                        className="bg-gray-800/50 border-gray-600/50 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-neutral-200">Subject</Label>
                    <Input 
                      id="subject" 
                      placeholder="What's this about?" 
                      required 
                      className="bg-gray-800/50 border-gray-600/50 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-neutral-200">Message</Label>
                    <Textarea 
                      id="message" 
                      placeholder="How can we help you with ZYURA?" 
                      required 
                      rows={5} 
                      className="bg-gray-800/50 border-gray-600/50 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20 resize-none" 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold py-3 transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="relative p-8 rounded-xl bg-black/30 border border-white/5 backdrop-blur-sm max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/10 via-transparent to-purple-900/10 rounded-xl" />
            <div className="relative">
              <h3 className="text-2xl font-bold text-white mb-4">Why Choose ZYURA?</h3>
              <p className="text-neutral-300 text-lg leading-relaxed">
                We&apos;re committed to making flight delay protection as instant and transparent as possible. 
                Our team is always ready to help you get the most out of ZYURA, whether you&apos;re 
                traveling for business or leisure, ensuring you get instant, automated USDC payouts when delays occur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;