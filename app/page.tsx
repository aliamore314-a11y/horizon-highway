'use client';

import React, { useEffect, useState, useRef } from 'react';
import StellarSdk from '@stellar/stellar-sdk';

interface Car {
  id: number;
  x: number;
  y: number;
  lane: 'payment' | 'swap' | 'create_account';
  speed: number;
  emoji: string;
}

export default function Home() {
  const [cars, setCars] = useState<Car[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const carsRef = useRef<Car[]>([]);

  useEffect(() => {
    carsRef.current = cars;
  }, [cars]);

  useEffect(() => {
    const server = new StellarSdk.Horizon.Server('https://stellar.org');
    
    const stream = server.operations()
      .cursor('now')
      .stream({
        onmessage: (op: any) => {
          let laneType: 'payment' | 'swap' | 'create_account' = 'payment';
          let carEmoji = '🚗';

          if (op.type.includes('payment')) {
            laneType = 'payment';
            carEmoji = ['🚗', '🚙', '🏎️', '🚕'][Math.floor(Math.random() * 4)];
          } else if (op.type.includes('offer') || op.type.includes('liquidity')) {
            laneType = 'swap';
            carEmoji = '🔄';
          } else if (op.type === 'create_account') {
            laneType = 'create_account';
            carEmoji = '🆕';
          } else {
            laneType = 'payment';
            carEmoji = '⚡';
          }

          const randomOffset = (Math.random() - 0.5) * 15;

          const newCar: Car = {
            id: Math.random(),
            x: -60,
            y: randomOffset,
            lane: laneType,
            speed: 4 + Math.random() * 5,
            emoji: carEmoji
          };

          setCars((prev) => [...prev.slice(-45), newCar]);
        },
        onerror: (error) => console.error('Radar terputus:', error)
      });

    let animationFrameId: number;

    const updateCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const screenH = canvas.height;
      const screenW = canvas.width;

      ctx.fillStyle = '#111116';
      ctx.fillRect(0, 0, screenW, screenH);

      const laneHeight = screenH / 4;
      const yPayment = laneHeight * 1;
      const ySwap = laneHeight * 2;
      const yCreate = laneHeight * 3;

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.setLineDash([15, 15]); 

      ctx.beginPath();
      ctx.moveTo(0, yPayment + (laneHeight / 2));
      ctx.lineTo(screenW, yPayment + (laneHeight / 2));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, ySwap + (laneHeight / 2));
      ctx.lineTo(screenW, ySwap + (laneHeight / 2));
      ctx.stroke();

      ctx.setLineDash([]); 
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText('🛣️ PAYMENTS (XLM / Tokens)', 30, yPayment - 35);
      ctx.fillText('🔄 SWAPS / DEX TRADES', 30, ySwap - 35);
      ctx.fillText('🆕 NEW ACCOUNTS CREATED', 30, yCreate - 35);

      const currentCars = carsRef.current;
      let hasChanges = false;

      const updatedCars = currentCars.map((car) => {
        const nextX = car.x + car.speed;
        let targetY = yPayment;

        if (car.lane === 'swap') targetY = ySwap;
        if (car.lane === 'create_account') targetY = yCreate;

        ctx.font = '38px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(car.emoji, car.x, targetY + car.y);

        if (nextX !== car.x) hasChanges = true;
        return { ...car, x: nextX };
      }).filter((car) => car.x < screenW + 100);

      if (hasChanges || updatedCars.length !== currentCars.length) {
        setCars(updatedCars);
      }

      animationFrameId = requestAnimationFrame(updateCanvas);
    };

    animationFrameId = requestAnimationFrame(updateCanvas);

    return () => {
      stream();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0, background: '#111116' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
