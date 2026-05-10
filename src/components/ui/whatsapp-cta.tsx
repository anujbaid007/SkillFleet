"use client";

import React from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppCTAProps {
  label?: string;
  message?: string;
  variant?: "default" | "outline" | "purple";
  size?: "default" | "lg" | "sm";
  className?: string;
}

const WA_NUMBER = "917508807490";

export default function WhatsAppCTA({
  label = "Get Started Today",
  message = "Hi, i'm interested to know more about SkillFleet!",
  variant = "default",
  size = "lg",
  className = "",
}: WhatsAppCTAProps) {
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      <Button
        size={size}
        className={`group ${variant === "purple" ? "bg-accent-purple hover:bg-accent-purple/90" : ""}`}
        variant={variant === "outline" ? "outline" : "default"}
      >
        {label}
        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
      </Button>
    </a>
  );
}
