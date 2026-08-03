import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';

async function generateCard() {
  console.log('Fetching font for Satori...');
  // Fetch Inter font buffer
  const fontResponse = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf');
  const fontBuffer = await fontResponse.arrayBuffer();

  console.log('Generating Do or Don\'t card with Satori + Resvg...');

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '675px',
          backgroundColor: '#0a0d1d',
          backgroundImage: 'radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0a0d1d 70%)',
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          padding: '40px',
          borderRadius: '24px',
          boxSizing: 'border-box',
          justifyContent: 'space-between',
          border: '2px solid rgba(139, 92, 246, 0.3)',
        },
        children: [
          // Header
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '20px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '32px',
                      fontWeight: 'bold',
                      color: '#818cf8',
                    },
                    children: 'THE LAB PERFORMANCE | JUMP MECHANICS GUIDE',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '18px',
                      color: '#a7f3d0',
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      padding: '8px 18px',
                      borderRadius: '20px',
                      border: '1px solid #10b981',
                    },
                    children: 'BIOMECHANICS PRO-TIP',
                  },
                },
              ],
            },
          },
          // Main Body: DO vs DONT
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                gap: '30px',
                flex: '1',
                marginTop: '30px',
              },
              children: [
                // DO CARD
                {
                  type: 'div',
                  props: {
                    style: {
                      flex: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      border: '2px solid #10b981',
                      borderRadius: '20px',
                      padding: '28px',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '28px',
                            fontWeight: '800',
                            color: '#34d399',
                            marginBottom: '20px',
                          },
                          children: '✓ DO (Proper Technique)',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            fontSize: '20px',
                            color: '#e2e8f0',
                            lineHeight: '1.5',
                          },
                          children: [
                            { type: 'div', props: { children: '• Symmetrical knee flexion (90°-110°)' } },
                            { type: 'div', props: { children: '• Full rapid arm pendulum swing' } },
                            { type: 'div', props: { children: '• Maintain upright torso posture' } },
                            { type: 'div', props: { children: '• Triple extension (ankle, knee, hip)' } },
                          ],
                        },
                      },
                    ],
                  },
                },
                // DON'T CARD
                {
                  type: 'div',
                  props: {
                    style: {
                      flex: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '2px solid #ef4444',
                      borderRadius: '20px',
                      padding: '28px',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '28px',
                            fontWeight: '800',
                            color: '#f87171',
                            marginBottom: '20px',
                          },
                          children: '✕ DON\'T (Common Flaws)',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            fontSize: '20px',
                            color: '#e2e8f0',
                            lineHeight: '1.5',
                          },
                          children: [
                            { type: 'div', props: { children: '• Knee valgus inward collapse' } },
                            { type: 'div', props: { children: '• Excessive forward trunk leaning' } },
                            { type: 'div', props: { children: '• Cutting arm swing short' } },
                            { type: 'div', props: { children: '• Heel-first heavy landing impact' } },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          // Footer
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '25px',
                fontSize: '16px',
                color: '#94a3b8',
              },
              children: [
                { type: 'div', props: { children: '⚡ Generated with Satori & Resvg PNG Engine' } },
                { type: 'div', props: { children: 'THE LAB PERFORMANCE SYSTEM' } },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 675,
      fonts: [
        {
          name: 'Inter',
          data: fontBuffer,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  const outputPath = path.join(process.cwd(), 'public', 'do_or_dont_satori_card.png');
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Successfully generated PNG card at: ${outputPath}`);
}

generateCard().catch(err => {
  console.error(err);
});
