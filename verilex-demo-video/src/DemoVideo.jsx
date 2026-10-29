import React from 'react';
import {
  AbsoluteFill,
  Composition,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
// Google Fonts CDN isn't reachable from the render sandbox; fall back to
// metric-compatible system serifs (Georgia ~ Playfair, Times ~ Tinos).

const FPS = 30;
const INK = '#141210';
const CREAM = '#f6f1e7';
const ACCENT = '#5c3a21';

const FONT_SERIF = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'Tinos', 'Times New Roman', serif";

function fadeInOut(frame, duration, inLen = 15, outLen = 15) {
  return interpolate(
    frame,
    [0, inLen, duration - outLen, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
}

function Screenshot({ src, duration, pan = 'in' }) {
  const frame = useCurrentFrame();
  const opacity = fadeInOut(frame, duration, 18, 18);
  const scaleStart = pan === 'in' ? 1.06 : 1.0;
  const scaleEnd = pan === 'in' ? 1.0 : 1.06;
  const scale = interpolate(frame, [0, duration], [scaleStart, scaleEnd], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });
  return (
    <AbsoluteFill style={{ background: CREAM, opacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        <Img src={src} style={{ width: '100%', display: 'block' }} />
      </AbsoluteFill>
      {/* Browser-chrome framing so a cropped screenshot still reads as "the app" */}
      <AbsoluteFill
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(20,18,16,0.08)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
}

function Caption({ eyebrow, text, duration }) {
  const frame = useCurrentFrame();
  const inLen = 18;
  const outLen = 15;
  const opacity = fadeInOut(frame, duration, inLen, outLen);
  const y = interpolate(frame, [0, inLen], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', pointerEvents: 'none' }}>
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          margin: '0 0 56px 0',
          background: INK,
          color: CREAM,
          padding: '20px 40px',
          maxWidth: 1000,
          textAlign: 'center',
          boxShadow: '0 18px 44px rgba(0,0,0,0.35)',
        }}
      >
        {eyebrow && (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#c99a6b',
              marginBottom: 8,
            }}
          >
            {eyebrow}
          </div>
        )}
        <div style={{ fontFamily: FONT_SERIF, fontSize: 26, lineHeight: 1.35 }}>{text}</div>
      </div>
    </AbsoluteFill>
  );
}

function TitleCard({ duration }) {
  const frame = useCurrentFrame();
  const opacity = fadeInOut(frame, duration, 20, 20);
  const scale = interpolate(frame, [0, 25], [0.96, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{ background: INK, justifyContent: 'center', alignItems: 'center', opacity }}>
      <div style={{ transform: `scale(${scale})`, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 96,
            color: CREAM,
            letterSpacing: 1,
            marginBottom: 20,
          }}
        >
          Verilex
        </div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 24,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: ACCENT,
          }}
        >
          Semantic Legal Discovery &amp; Explanation
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ClosingCard({ duration }) {
  const frame = useCurrentFrame();
  const opacity = fadeInOut(frame, duration, 20, 20);
  const lines = [
    'Real sources only — never fabricated law.',
    'Every explanation is grounded in retrieved text.',
    'Always verifiable. Never a substitute for advice.',
  ];
  return (
    <AbsoluteFill style={{ background: INK, justifyContent: 'center', alignItems: 'center', opacity }}>
      <div style={{ textAlign: 'center', maxWidth: 1100 }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 56, color: CREAM, marginBottom: 36 }}>Verilex</div>
        {lines.map((l, i) => (
          <div
            key={l}
            style={{
              fontFamily: FONT_BODY,
              fontSize: 22,
              color: i === 0 ? '#e8ddc8' : '#b9a98a',
              marginBottom: 10,
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

const scenes = [
  { kind: 'title', duration: 3 * FPS },
  {
    kind: 'shot',
    src: 'screens/01-landing.png',
    duration: 4.5 * FPS,
    pan: 'in',
    eyebrow: 'Start here',
    caption: 'Describe what happened, in plain language — no legal terminology required.',
  },
  {
    kind: 'shot',
    src: 'screens/02-login.png',
    duration: 2.8 * FPS,
    pan: 'out',
    eyebrow: 'Account',
    caption: 'An account keeps a record of what you searched and reviewed.',
  },
  {
    kind: 'shot',
    src: 'screens/03-app-home.png',
    duration: 3.6 * FPS,
    pan: 'in',
    eyebrow: 'Situation search',
    caption: 'Type the situation as you’d explain it to a person — Verilex extracts the legal concepts.',
  },
  {
    kind: 'shot',
    src: 'screens/04-results.png',
    duration: 5.2 * FPS,
    pan: 'out',
    eyebrow: 'Retrieved sources',
    caption: 'Real statutes, provisions and judgments are retrieved — each with a stated reason for relevance.',
  },
  {
    kind: 'shot',
    src: 'screens/05-source.png',
    duration: 4.2 * FPS,
    pan: 'in',
    eyebrow: 'Source view',
    caption: 'Every source is fully readable in its original text, with provenance intact.',
  },
  {
    kind: 'shot',
    src: 'screens/06-explanation.png',
    duration: 5.4 * FPS,
    pan: 'out',
    eyebrow: 'Grounded explanation',
    caption: 'The explanation is extracted from the source text itself — never AI-invented, always marked uncertain where it is.',
  },
  { kind: 'closing', duration: 3.6 * FPS },
];

export function DemoVideo() {
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  return (
    <Composition
      id="DemoVideo"
      component={Reel}
      durationInFrames={totalDuration}
      fps={FPS}
      width={1600}
      height={1000}
    />
  );
}

function Reel() {
  let start = 0;
  const items = scenes.map((scene, i) => {
    const el = (
      <Sequence key={i} from={start} durationInFrames={scene.duration}>
        {scene.kind === 'title' && <TitleCard duration={scene.duration} />}
        {scene.kind === 'closing' && <ClosingCard duration={scene.duration} />}
        {scene.kind === 'shot' && (
          <>
            <Screenshot src={staticFile(scene.src)} duration={scene.duration} pan={scene.pan} />
            <Caption eyebrow={scene.eyebrow} text={scene.caption} duration={scene.duration} />
          </>
        )}
      </Sequence>
    );
    start += scene.duration;
    return el;
  });
  return <AbsoluteFill style={{ background: INK }}>{items}</AbsoluteFill>;
}
