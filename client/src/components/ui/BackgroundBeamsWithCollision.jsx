"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";

export const BackgroundBeamsWithCollision = ({ children, className }) => {
  const containerRef = useRef(null);
  const parentRef = useRef(null);

  return (
    <div
      ref={parentRef}
      className={`relative w-full h-full bg-black ${className || ""}`}
    >
      {/* Background oscuro */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950"></div>
      
      {/* Beams encima del fondo */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden"
        style={{ zIndex: 1 }}
      >
        <CollisionMechanism
          containerRef={containerRef}
          parentRef={parentRef}
        />
      </div>
      
      {/* Contenido encima de los beams */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

const CollisionMechanism = ({ containerRef, parentRef }) => {
  const [beams, setBeams] = useState([]);
  const beamIdRef = useRef(0);
  const animationFrameRef = useRef(null);

  const createBeam = useCallback(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;
    
    // Crear beam con altura limitada (más corto)
    const maxBeamLength = 120 + Math.random() * 80; // Entre 120-200px (más corto)
    const startY = -30 - Math.random() * 30; // Empezar más cerca del borde superior
    
    const newBeam = {
      id: beamIdRef.current++,
      x: Math.random() * width,
      y: startY,
      initialY: startY, // Guardar posición inicial
      targetY: startY + maxBeamLength,
      maxLength: maxBeamLength, // Guardar la longitud máxima
      rotation: (Math.random() - 0.5) * 15,
      speed: 3 + Math.random() * 4,
      opacity: 0.7 + Math.random() * 0.3,
      color: `hsl(${180 + Math.random() * 60}, 70%, ${60 + Math.random() * 20}%)`,
      width: 2 + Math.random() * 2,
      particles: [],
      exploded: false,
    };

    // Crear partículas de explosión
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
      newBeam.particles.push({
        id: i,
        angle: (Math.PI * 2 * i) / particleCount,
        distance: 0,
        speed: 2 + Math.random() * 4,
        opacity: 1,
      });
    }

    setBeams((prev) => [...prev, newBeam]);
  }, []);

  useEffect(() => {
    // Crear primer beam después de un pequeño delay
    const timeout = setTimeout(() => {
      createBeam();
    }, 100);
    
    const interval = setInterval(() => {
      if (beams.length < 5) {
        createBeam();
      }
    }, 2000 + Math.random() * 2000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [beams.length, createBeam]);

  useEffect(() => {
    let isRunning = true;
    
    const animate = () => {
      if (!isRunning) return;
      
      setBeams((prevBeams) => {
        return prevBeams
          .map((beam) => {
            const newY = beam.y + beam.speed;
            const initialY = beam.initialY || beam.y;
            const maxLength = beam.maxLength || 150;
            // Explotar cuando llegue al 60% de su longitud máxima desde el inicio
            const explosionPoint = initialY + maxLength * 0.6;
            const shouldExplode = newY >= explosionPoint && !beam.exploded;

            if (shouldExplode) {
              // Iniciar explosión
              return {
                ...beam,
                exploded: true,
                particles: beam.particles.map((p) => ({
                  ...p,
                  distance: p.distance + p.speed * 1.5,
                  opacity: Math.max(0, p.opacity - 0.05),
                })),
                opacity: Math.max(0, beam.opacity - 0.2),
              };
            }

            if (beam.exploded) {
              // Continuar explosión
              const allDead = beam.particles.every((p) => p.opacity <= 0.01);
              if (allDead) {
                return null; // Eliminar beam completamente explotado
              }
              
              return {
                ...beam,
                particles: beam.particles.map((p) => ({
                  ...p,
                  distance: p.distance + p.speed,
                  opacity: Math.max(0, p.opacity - 0.06),
                })),
                opacity: Math.max(0, beam.opacity - 0.1),
              };
            }

            // Movimiento normal hacia abajo
            return {
              ...beam,
              y: newY,
            };
          })
          .filter((beam) => beam !== null && beam.opacity > 0.01);
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
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {beams.map((beam) => {
        const maxLength = beam.maxLength || 150;
        const initialY = beam.initialY || beam.y;
        // La altura visible es la distancia recorrida desde el inicio, limitada al 60% del máximo
        const distanceTraveled = beam.y - initialY;
        const maxVisibleLength = maxLength * 0.6;
        const visibleHeight = Math.min(maxVisibleLength, Math.max(60, distanceTraveled));
        const explosionY = initialY + maxVisibleLength;
        
        return (
          <div
            key={beam.id}
            className="absolute"
            style={{
              left: `${beam.x}px`,
              top: `${beam.y}px`,
              transform: `rotate(${beam.rotation}deg)`,
              opacity: beam.opacity,
              transformOrigin: 'top center',
              zIndex: 2,
            }}
          >
            {/* Línea del beam - más corta */}
            {!beam.exploded && (
              <div
                className="absolute"
                style={{
                  width: `${beam.width}px`,
                  height: `${visibleHeight}px`,
                  background: `linear-gradient(to bottom, ${beam.color}, ${beam.color}dd, transparent)`,
                  boxShadow: `
                    0 0 ${beam.width * 2}px ${beam.color},
                    0 0 ${beam.width * 4}px ${beam.color},
                    0 0 ${beam.width * 6}px ${beam.color}
                  `,
                }}
              />
            )}

            {/* Partículas de explosión */}
            {beam.exploded && beam.particles.map((particle) => {
              const particleX = Math.cos(particle.angle) * particle.distance;
              const particleY = Math.sin(particle.angle) * particle.distance;
              const initialY = beam.initialY || beam.y;
              const maxLength = beam.maxLength || 150;
              const explosionYPos = initialY + maxLength * 0.6;

              return (
                <div
                  key={particle.id}
                  className="absolute rounded-full"
                  style={{
                    left: '0px',
                    top: `${explosionYPos - beam.y}px`,
                    width: `${4 + particle.distance * 0.2}px`,
                    height: `${4 + particle.distance * 0.2}px`,
                    background: beam.color,
                    transform: `translate(${particleX}px, ${particleY}px)`,
                    opacity: particle.opacity,
                    boxShadow: `
                      0 0 ${8 + particle.distance * 0.3}px ${beam.color},
                      0 0 ${16 + particle.distance * 0.6}px ${beam.color}
                    `,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
