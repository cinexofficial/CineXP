export async function generateStoryCard(title: string, posterUrl: string, type: 'movie' | 'tv'): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const width = 1080;
    const height = 1920; // 9:16 aspect ratio (Instagram Story size)
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Canvas context not available'));

    const loadAsBlob = async (url: string): Promise<string> => {
      // Append cache buster to force fresh CORS headers
      const response = await fetch(url + '?not-from-cache-please=' + Date.now());
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    };

    loadAsBlob(posterUrl).then((objectUrl) => {
      const img = new Image();
      img.src = objectUrl;

      img.onload = () => {
        // --- 1. MIDNIGHT AURA BACKGROUND ---
        // Solid deep midnight black base
        ctx.fillStyle = '#06020c';
        ctx.fillRect(0, 0, width, height);

        // Organic Aura 1: Top-Left Sweep (Deep Indigo)
        ctx.save();
        ctx.translate(200, 300);
        ctx.scale(2, 1);
        const grad1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 450);
        grad1.addColorStop(0, 'rgba(80, 10, 180, 0.5)');
        grad1.addColorStop(1, 'rgba(80, 10, 180, 0)');
        ctx.fillStyle = grad1;
        ctx.fillRect(-500, -500, 1000, 1000);
        ctx.restore();

        // Organic Aura 2: Center-Right Vertical Flow (Vibrant Violet)
        ctx.save();
        ctx.translate(900, 900);
        ctx.scale(0.6, 2.5);
        const grad2 = ctx.createRadialGradient(0, 0, 0, 0, 0, 500);
        grad2.addColorStop(0, 'rgba(120, 0, 220, 0.4)');
        grad2.addColorStop(1, 'rgba(120, 0, 220, 0)');
        ctx.fillStyle = grad2;
        ctx.fillRect(-600, -600, 1200, 1200);
        ctx.restore();

        // Organic Aura 3: Bottom Central Grounding Glow (CineXP Accent)
        ctx.save();
        ctx.translate(500, 1600);
        ctx.scale(2.2, 0.8);
        const grad3 = ctx.createRadialGradient(0, 0, 0, 0, 0, 600);
        grad3.addColorStop(0, 'rgba(157, 0, 255, 0.45)');
        grad3.addColorStop(1, 'rgba(157, 0, 255, 0)');
        ctx.fillStyle = grad3;
        ctx.fillRect(-700, -700, 1400, 1400);
        ctx.restore();

        // Helper for cross-browser rounded rectangles
        const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
        };

        // --- 2. POSTER MOUNTING ---
        const posterW = 820;
        const posterH = 1230; // 2:3 ratio
        const posterX = (width - posterW) / 2;
        const posterY = 240;
        const radius = 16; // Subtle, sharp curve

        // Layered Shadow for deep physical feel
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 60;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 40;
        ctx.fillStyle = '#000';
        drawRoundRect(posterX, posterY, posterW, posterH, radius);
        ctx.fill();
        ctx.restore();

        // Clip and Draw the Image
        ctx.save();
        drawRoundRect(posterX, posterY, posterW, posterH, radius);
        ctx.clip();
        
        const scale = Math.max(posterW / img.width, posterH / img.height);
        const scaledW = img.width * scale;
        const scaledH = img.height * scale;
        const dx = posterX + (posterW - scaledW) / 2;
        const dy = posterY + (posterH - scaledH) / 2;
        ctx.drawImage(img, dx, dy, scaledW, scaledH);
        ctx.restore();

        // Microscopic Glowing Frosted Glass Edge
        ctx.save();
        drawRoundRect(posterX, posterY, posterW, posterH, radius);
        
        // 1st layer: Diffuse outer aura
        ctx.strokeStyle = 'rgba(157, 0, 255, 0.2)';
        ctx.lineWidth = 10;
        ctx.stroke();

        // 2nd layer: Tight neon frame
        ctx.strokeStyle = 'rgba(157, 0, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 3rd layer: Razor-thin bright glass reflect
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // --- 3. TYPOGRAPHY: NOW PLAYING ---
        ctx.fillStyle = 'rgba(230, 230, 240, 0.8)'; // Silver light
        ctx.font = '200 28px system-ui, -apple-system, sans-serif'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if ('letterSpacing' in ctx) {
            (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '14px';
        }
        ctx.fillText('N O W   S T R E A M I N G', width / 2, 1580);

        // --- 4. TYPOGRAPHY: MOVIE TITLE ---
        ctx.fillStyle = '#ffffff';
        ctx.font = '500 52px system-ui, -apple-system, sans-serif'; 
        if ('letterSpacing' in ctx) {
            (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '2px';
        }
        let displayTitle = title;
        if (ctx.measureText(displayTitle).width > 850) {
            displayTitle = displayTitle.substring(0, 32) + '...';
        }
        ctx.fillText(displayTitle, width / 2, 1650);

        // --- 5. MINIMALIST LUXURY CINEXP LOGO ---
        if ('letterSpacing' in ctx) {
            (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px';
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '300 24px system-ui, -apple-system, sans-serif';
        ctx.fillText('C I N E X P', width / 2, 1800);

        // Tiny Glowing Purple Diamond
        const diamondY = 1845;
        ctx.save();
        ctx.translate(width / 2, diamondY);
        ctx.rotate(Math.PI / 4); // 45 degree rotation
        
        ctx.fillStyle = '#c060ff'; // Bright neon purple inner
        ctx.shadowColor = '#9d00ff'; // Deep neon purple aura
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.fillRect(-4, -4, 8, 8); // 8x8 square becomes diamond
        ctx.restore();

        // Reset spacing
        if ('letterSpacing' in ctx) {
            (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
        }

        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Failed to create blob'));
          const file = new File([blob], 'cinexp-story.png', { type: 'image/png' });
          resolve(file);
        }, 'image/png');
      };

      img.onerror = () => {
        reject(new Error('Failed to load poster image for story card'));
      };
    }).catch(err => {
      reject(new Error('Failed to fetch the image completely: ' + err.message));
    });
  });
}
