import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  color?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isPlaying, color = '#06b6d4' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) {
        // Flat line animation when not playing
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        ctx.fillStyle = color;
        // Draw segmented bars for a more "digital" look
        const segments = Math.floor(barHeight / 4);
        for(let j=0; j<segments; j++) {
            ctx.fillRect(x, canvas.height - (j * 5), barWidth, 4);
        }

        x += barWidth + 1;
      }
    };

    if (isPlaying) {
        draw();
    } else {
        cancelAnimationFrame(animationRef.current || 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw idle line
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    return () => {
      cancelAnimationFrame(animationRef.current || 0);
    };
  }, [analyser, isPlaying, color]);

  return (
    <canvas 
        ref={canvasRef} 
        width={300} 
        height={50} 
        className="w-full h-full opacity-80"
    />
  );
};

export default AudioVisualizer;