/**
 * AISecGuard — CyberBackground
 * Interactive, high-performance canvas featuring animated AI neural nodes,
 * glowing data packets, and ambient cybersecurity particles.
 * Adapts to Dark and Light themes seamlessly.
 */

import { useEffect, useRef } from 'react';

export default function CyberBackground({ theme = 'dark' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isDark = theme === 'dark';

    // Color definitions
    const colors = isDark
      ? {
          nodes: ['#00f0ff', '#3b82f6', '#8b5cf6', '#10b981'],
          line: 'rgba(59, 130, 246, 0.12)',
          lineActive: 'rgba(6, 182, 212, 0.35)',
          packet: '#00f0ff',
        }
      : {
          nodes: ['#2563eb', '#0284c7', '#7c3aed', '#059669'],
          line: 'rgba(37, 99, 235, 0.08)',
          lineActive: 'rgba(14, 165, 233, 0.25)',
          packet: '#2563eb',
        };

    // Node count based on screen area
    const count = Math.min(Math.floor((width * height) / 22000), 65);
    const nodes = [];
    const maxDist = 130;

    // Create particles
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1.2,
        color: colors.nodes[Math.floor(Math.random() * colors.nodes.length)],
        baseAlpha: Math.random() * 0.5 + 0.3,
      });
    }

    // Floating data packets
    const packets = [];
    for (let i = 0; i < 8; i++) {
      packets.push({
        from: Math.floor(Math.random() * count),
        to: Math.floor(Math.random() * count),
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.006,
      });
    }

    let mouse = { x: null, y: null, maxDist: 160 };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle circuit grid lines
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.02)';
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update and draw connections
      for (let i = 0; i < nodes.length; i++) {
        const nodeA = nodes[i];

        // Move
        nodeA.x += nodeA.vx;
        nodeA.y += nodeA.vy;

        // Bounce
        if (nodeA.x < 0 || nodeA.x > width) nodeA.vx *= -1;
        if (nodeA.y < 0 || nodeA.y > height) nodeA.vy *= -1;

        // Mouse interaction
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - nodeA.x;
          const dy = mouse.y - nodeA.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.maxDist) {
            const alpha = 1 - dist / mouse.maxDist;
            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = colors.lineActive;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Gentle gravity
            nodeA.x += dx * 0.008;
            nodeA.y += dy * 0.008;
          }
        }

        // Draw connections between nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeB = nodes[j];
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.45;
            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.strokeStyle = isDark
              ? `rgba(59, 130, 246, ${alpha})`
              : `rgba(37, 99, 235, ${alpha * 0.6})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw active data packets traversing connections
      packets.forEach((p) => {
        p.progress += p.speed;
        if (p.progress >= 1) {
          p.progress = 0;
          p.from = Math.floor(Math.random() * nodes.length);
          p.to = Math.floor(Math.random() * nodes.length);
        }

        const start = nodes[p.from];
        const end = nodes[p.to];
        if (start && end) {
          const dx = start.x - end.x;
          const dy = start.y - end.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist * 1.5) {
            const px = start.x + (end.x - start.x) * p.progress;
            const py = start.y + (end.y - start.y) * p.progress;

            ctx.beginPath();
            ctx.arc(px, py, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = colors.packet;
            ctx.shadowBlur = 8;
            ctx.shadowColor = colors.packet;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      // Draw nodes
      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = node.baseAlpha;
        ctx.shadowBlur = isDark ? 6 : 2;
        ctx.shadowColor = node.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: isDark
          ? 'radial-gradient(ellipse at 50% 15%, #0d1527 0%, #060913 65%, #03050a 100%)'
          : 'radial-gradient(ellipse at 50% 15%, #ffffff 0%, #edf3fc 50%, #e2ebf9 100%)',
        transition: 'background 0.3s ease',
      }}
    >
      {/* Radiant ambient glow orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '20%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(59, 130, 246, 0.22) 0%, rgba(99, 102, 241, 0.08) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'pulseGlow 12s ease-in-out infinite alternate',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '15%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(6, 182, 212, 0.18) 0%, rgba(16, 185, 129, 0.06) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, rgba(16, 185, 129, 0.03) 50%, transparent 70%)',
          filter: 'blur(70px)',
          animation: 'pulseGlow 16s ease-in-out infinite alternate-reverse',
        }}
      />

      {/* Cyber security shield watermark in background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: isDark ? 0.035 : 0.025,
          pointerEvents: 'none',
        }}
      >
        <img
          src="/logos/logo-shield.png"
          alt=""
          style={{ width: '650px', height: '650px', objectFit: 'contain' }}
        />
      </div>

      {/* Interactive canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
        }}
      />
    </div>
  );
}
