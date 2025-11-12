"use client";
import React, { useRef, useEffect, useCallback } from "react";

export const DottedGlowBackground = ({
  children,
  className,
  gap = 12,
  radius = 2,
  color = "rgba(59, 130, 246, 0.6)",
  glowColor = "rgba(59, 130, 246, 0.85)",
  opacity = 0.7,
  backgroundOpacity = 0,
  speedMin = 0.4,
  speedMax = 1.3,
  speedScale = 1,
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const dotsRef = useRef([]);
  const animationFrameRef = useRef(null);

  const createDots = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    const cols = Math.ceil(width / gap);
    const rows = Math.ceil(height / gap);

    dotsRef.current = [];

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        dotsRef.current.push({
          x: i * gap + gap / 2,
          y: j * gap + gap / 2,
          radius: radius,
          baseOpacity: opacity * (0.5 + Math.random() * 0.5),
          speed: (speedMin + Math.random() * (speedMax - speedMin)) * speedScale,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }, [gap, radius, opacity, speedMin, speedMax, speedScale]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { 
      alpha: true,
      desynchronized: false,
      willReadFrequently: false
    });

    const resizeCanvas = () => {
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 2, 2); // Limitar a 2x para mejor rendimiento
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // Configurar contexto para alta calidad
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      createDots();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [createDots]);

  useEffect(() => {
    if (!canvasRef.current || dotsRef.current.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let isRunning = true;

    const animate = () => {
      if (!isRunning) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const time = Date.now() * 0.001;

      dotsRef.current.forEach((dot) => {
        const pulse = Math.sin(time * dot.speed + dot.phase) * 0.5 + 0.5;
        const smoothPulse = pulse * pulse; // Suavizar la animación
        const currentOpacity = dot.baseOpacity * (0.6 + smoothPulse * 0.4);
        const currentRadius = dot.radius * (0.8 + smoothPulse * 0.4);

        // Draw glow effect - mejorado con más stops para suavidad
        const glowRadius = currentRadius * 5;
        const gradient = ctx.createRadialGradient(
          dot.x,
          dot.y,
          currentRadius * 0.5,
          dot.x,
          dot.y,
          glowRadius
        );
        
        const glowOpacity = currentOpacity * 0.9;
        gradient.addColorStop(0, `rgba(59, 130, 246, ${glowOpacity * 0.8})`);
        gradient.addColorStop(0.2, `rgba(59, 130, 246, ${glowOpacity * 0.6})`);
        gradient.addColorStop(0.4, `rgba(59, 130, 246, ${glowOpacity * 0.4})`);
        gradient.addColorStop(0.6, `rgba(59, 130, 246, ${glowOpacity * 0.2})`);
        gradient.addColorStop(0.8, `rgba(59, 130, 246, ${glowOpacity * 0.1})`);
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw dot core - con gradiente suave
        const dotGradient = ctx.createRadialGradient(
          dot.x - currentRadius * 0.3,
          dot.y - currentRadius * 0.3,
          0,
          dot.x,
          dot.y,
          currentRadius
        );
        dotGradient.addColorStop(0, `rgba(147, 197, 253, ${currentOpacity})`);
        dotGradient.addColorStop(0.7, `rgba(59, 130, 246, ${currentOpacity})`);
        dotGradient.addColorStop(1, `rgba(37, 99, 235, ${currentOpacity * 0.8})`);

        ctx.fillStyle = dotGradient;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className || ""}`}
      style={{
        backgroundColor: `rgba(0, 0, 0, ${backgroundOpacity})`,
      }}
    >
      {/* Background oscuro */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950"></div>
      
      {/* Canvas con puntos */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none", zIndex: 1 }}
      />
      
      {/* Contenido */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};

