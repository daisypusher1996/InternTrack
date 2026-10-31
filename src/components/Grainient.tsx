'use client';

import React, { useEffect, useRef } from 'react';

export interface GrainientProps {
  colors?: string[];
  angle?: number;
  flow?: number;
  silk?: number;
  grainAmount?: number;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_COLORS = ['#9e2c00', '#20120b', '#0f0825', '#0c0819', '#060815'];

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision highp float;

  varying vec2 v_uv;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_angle;
  uniform float u_flow;
  uniform float u_silk;
  uniform float u_grainAmount;
  uniform vec3 u_colors[5];

  vec2 rotate(vec2 p, float deg) {
    float rad = radians(deg);
    float s = sin(rad);
    float c = cos(rad);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  }

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec3 sampleGradient(float t) {
    float val = clamp(t, 0.0, 1.0);
    if (val < 0.25) {
      return mix(u_colors[0], u_colors[1], val / 0.25);
    } else if (val < 0.5) {
      return mix(u_colors[1], u_colors[2], (val - 0.25) / 0.25);
    } else if (val < 0.75) {
      return mix(u_colors[2], u_colors[3], (val - 0.5) / 0.25);
    } else {
      return mix(u_colors[3], u_colors[4], (val - 0.75) / 0.25);
    }
  }

  void main() {
    vec2 uv = v_uv;
    vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);

    vec2 centered = (uv - 0.5) * aspect;
    vec2 rotUV = rotate(centered, u_angle);

    float t_flow = u_time * 0.4;
    float wave1 = sin(rotUV.x * 2.8 + t_flow) * cos(rotUV.y * 2.2 - t_flow * 0.75);
    float wave2 = sin((rotUV.x + rotUV.y) * 3.4 + t_flow * 1.15);
    float flowDisplacement = (wave1 * 0.65 + wave2 * 0.35) * u_flow * 0.28;

    float gradPos = rotUV.y + 0.5 + flowDisplacement;

    float foldFreq = 5.2;
    float fold = abs(sin((rotUV.y * foldFreq + flowDisplacement * 3.2 + t_flow * 0.45) * 3.14159));
    float silkSheen = pow(1.0 - fold, 3.2) * u_silk;

    vec3 col = sampleGradient(gradPos);

    col += vec3(silkSheen * 0.85, silkSheen * 0.65, silkSheen * 0.5);

    float grainNoise = hash(gl_FragCoord.xy + fract(u_time * 23.456));
    float grain = (grainNoise - 0.5) * u_grainAmount;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

export const Grainient: React.FC<GrainientProps> = ({
  colors = DEFAULT_COLORS,
  angle = 114,
  flow = 0.75,
  silk = 0.48,
  grainAmount = 0.08,
  speed = 1.0,
  className = '',
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) {
      gl = canvas.getContext('experimental-webgl', { antialias: false, alpha: false }) as WebGLRenderingContext | null;
    }

    if (!gl) {
      console.warn('WebGL not supported for Grainient. Using fallback.');
      return;
    }

    const compileShader = (type: number, src: string): WebGLShader | null => {
      if (!gl) return null;
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Grainient shader compile failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vert = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const frag = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Grainient program link failed:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uAngle = gl.getUniformLocation(program, 'u_angle');
    const uFlow = gl.getUniformLocation(program, 'u_flow');
    const uSilk = gl.getUniformLocation(program, 'u_silk');
    const uGrainAmount = gl.getUniformLocation(program, 'u_grainAmount');
    const uColors = gl.getUniformLocation(program, 'u_colors');

    // Prepare 5 colors uniform array
    const colorStops: number[] = [];
    const srcColors = colors.length > 0 ? colors : DEFAULT_COLORS;
    for (let i = 0; i < 5; i++) {
      const hex = srcColors[Math.min(i, srcColors.length - 1)];
      const [r, g, b] = hexToRgb(hex);
      colorStops.push(r, g, b);
    }

    let animationFrameId: number;
    let startTime = performance.now();

    const handleResize = () => {
      if (!canvas || !gl) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);
    handleResize();

    const render = (timeNow: number) => {
      if (!gl || !program) return;
      const elapsed = ((timeNow - startTime) / 1000) * speed;

      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uAngle, angle);
      gl.uniform1f(uFlow, flow);
      gl.uniform1f(uSilk, silk);
      gl.uniform1f(uGrainAmount, grainAmount);
      gl.uniform3fv(uColors, new Float32Array(colorStops));

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (gl) {
        if (positionBuffer) gl.deleteBuffer(positionBuffer);
        if (vert) gl.deleteShader(vert);
        if (frag) gl.deleteShader(frag);
        if (program) gl.deleteProgram(program);
      }
    };
  }, [colors, angle, flow, silk, grainAmount, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`.trim()}
      style={{
        width: '100%',
        height: '100%',
        ...style,
      }}
    />
  );
};

export default Grainient;
