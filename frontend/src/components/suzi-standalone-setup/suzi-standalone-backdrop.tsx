import { useEffect, useRef } from "react";
import { assert } from "@/utils/assert";
import css from "./suzi-standalone-setup.module.css";

export function SuziStandaloneSetupBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    let stop: (() => void) | undefined;
    try {
      const canvasCtx = bindCanvas(canvasRef.current);
      canvasCtx.start();
      stop = canvasCtx.stop;
    } catch (error) {
      console.error("Error initializing WebGL canvas:", error);
      return;
    }

    return () => {
      stop();
    };
  }, []);

  return (
    <div className={css["backdrop"]}>
      <canvas className={css["backdrop-canvas"]} ref={canvasRef} />
      <div className={css["backdrop-inner"]} />
    </div>
  );
}

const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_uv;

float rand(int i) {
  return sin(float(i) * 1.64);
}

vec3 get_blob(int i, float time) {
  float spd = 0.1;
  float move_range = 0.5;

  float x = float(i);
  vec2 center = vec2(0.5, 0.5) + 0.1 * vec2(rand(i), rand(i+42));
  center += move_range * vec2(sin(spd * time * rand(i+2)) * rand(i + 56), -sin(spd * time) * rand(i*9));
  float radius = 0.1 * abs(rand(i+3));
  return vec3(center.xy, radius);
}

void main() {
  vec3 blob_color_center = vec3(133.0, 200.0, 40.0) / 256.0;
  vec3 blob_color_edge = vec3(67.0, 168.0, 58.0) / 256.0;
  vec3 bg_col = vec3(42.0, 111.0, 43.0) / 256.0;

  int num_blobs = 15;
  float thresh = 3000.0;

  vec2 uv = v_uv;
  float aspect = u_resolution.y / u_resolution.x;
  uv.y *= aspect;

  float dist_sum = 0.0;

  for (int i = 0; i < 10; i++) {
    if (i >= num_blobs) break;

    vec3 blob = get_blob(i, u_time);
    float radius = blob.z;
    vec2 center = blob.xy;
    center.y *= aspect;
    float dist_to_center = max(length(center - uv) + radius/2.0, 0.0);
    float tmp = (dist_to_center * dist_to_center);
    dist_sum += 1.0 / (tmp * tmp);
  }

  gl_FragColor = vec4(bg_col, 1.0);

  if (dist_sum > thresh) {
    float t = smoothstep(thresh, 0.0, dist_sum - thresh);
    vec3 col = mix(blob_color_center, blob_color_edge, t);
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

function createShader(gl: WebGLRenderingContext, type: GLint, source: string) {
  const shader = gl.createShader(type);
  assert(shader, `Failed to create shader of type ${type}`);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (!status) {
    gl.deleteShader(shader);
    throw new Error(
      `Failed to compile shader of type ${type}: ${gl.getShaderInfoLog(shader)}`,
    );
  }

  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
) {
  const program = gl.createProgram();
  assert(program, "Failed to create WebGL program");

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const status = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (!status) {
    gl.deleteProgram(program);
    throw new Error(`Failed to link program: ${gl.getProgramInfoLog(program)}`);
  }

  return program;
}

function bindCanvas(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl");
  assert(gl, "Failed to create WebGL context");

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource,
  );

  const program = createProgram(gl, vertexShader, fragmentShader);

  const aPosition = gl.getAttribLocation(program, "a_position");
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uTime = gl.getUniformLocation(program, "u_time");

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );

  let frameId: number | null = null;

  const render = (_time: number) => {
    const time = _time / 1000;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, time);

    gl.enableVertexAttribArray(aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    frameId = requestAnimationFrame(render);
  };

  const start = () => {
    if (frameId == null) {
      frameId = requestAnimationFrame(render);
    }
  };

  const stop = () => {
    if (frameId != null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }

    gl.useProgram(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(program);
    gl.deleteBuffer(positionBuffer);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return { start, stop };
}
