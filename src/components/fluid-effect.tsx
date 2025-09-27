'use client'

import { useEffect, useRef, useState } from 'react'

interface FluidEffectProps {
  className?: string
}

export default function FluidEffect({ className = '' }: FluidEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      // Set canvas size
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight

    const config = {
      TEXTURE_DOWNSAMPLE: 1,
      DENSITY_DISSIPATION: 0.95, // Slower dissipation for jellyfish-like persistence
      VELOCITY_DISSIPATION: 0.97, // Slower dissipation for flowing movement
      PRESSURE_DISSIPATION: 0.8,
      PRESSURE_ITERATIONS: 25,
      CURL: 25, // Reduced curl for smoother jellyfish movement
      SPLAT_RADIUS: 0.015 // Larger radius for jellyfish body
    }

    const pointers: any[] = []
    const splatStack: number[] = []

    // Get WebGL context
    const getWebGLContext = (canvas: HTMLCanvasElement) => {
      const params = {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false
      }

      let gl: WebGL2RenderingContext | WebGLRenderingContext | null = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null
      const isWebGL2 = !!gl

      if (!isWebGL2) {
        gl = (canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params)) as WebGLRenderingContext | null
      }

      if (!gl) {
        throw new Error('WebGL not supported')
      }

      const halfFloat = gl.getExtension('OES_texture_half_float')
      let support_linear_float = gl.getExtension('OES_texture_half_float_linear')

      if (isWebGL2) {
        gl.getExtension('EXT_color_buffer_float')
        support_linear_float = gl.getExtension('OES_texture_float_linear')
      }

      gl.clearColor(0.0, 0.0, 0.0, 1.0)

      const internalFormat = isWebGL2 ? (gl as WebGL2RenderingContext).RGBA16F : gl.RGBA
      const internalFormatRG = isWebGL2 ? (gl as WebGL2RenderingContext).RG16F : gl.RGBA
      const formatRG = isWebGL2 ? (gl as WebGL2RenderingContext).RG : gl.RGBA
      const texType = isWebGL2 ? (gl as WebGL2RenderingContext).HALF_FLOAT : halfFloat?.HALF_FLOAT_OES

      return {
        gl,
        ext: {
          internalFormat,
          internalFormatRG,
          formatRG,
          texType
        },
        support_linear_float
      }
    }

    const { gl, ext, support_linear_float } = getWebGLContext(canvas)

    // Pointer interface
    interface Pointer {
      id: number
      x: number
      y: number
      dx: number
      dy: number
      down: boolean
      moved: boolean
      color: number[]
    }

    // Create pointer
    const createPointer = (): Pointer => ({
      id: -1,
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      down: false,
      moved: false,
      color: [0.3, 0.2, 0.7] // Initial jellyfish purple color
    })

    pointers.push(createPointer())

    // GL Program class
    class GLProgram {
      uniforms: { [key: string]: WebGLUniformLocation | null } = {}
      program: WebGLProgram

      constructor(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
        this.program = gl.createProgram()!

        gl.attachShader(this.program, vertexShader)
        gl.attachShader(this.program, fragmentShader)
        gl.linkProgram(this.program)

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
          throw new Error(gl.getProgramInfoLog(this.program) || 'Program linking failed')
        }

        const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS)
        
        for (let i = 0; i < uniformCount; i++) {
          const uniformName = gl.getActiveUniform(this.program, i)?.name
          if (uniformName) {
            this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName)
          }
        }
      }

      bind() {
        gl.useProgram(this.program)
      }
    }

    // Compile shader
    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed')
      }

      return shader
    }

    // Shader sources
    const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
      precision highp float;
      precision mediump sampler2D;
      attribute vec2 aPosition;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform vec2 texelSize;
      void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `)

    const clearShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision mediump sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
      }
    `)

    const displayShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision mediump sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main () {
        gl_FragColor = texture2D(uTexture, vUv);
      }
    `)

    const splatShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision mediump sampler2D;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      uniform float time;
      void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        
        // Create jellyfish-like tentacle patterns
        float distance = length(p);
        float angle = atan(p.y, p.x);
        
        // Main body (circular)
        float body = exp(-distance * distance / (radius * 0.3));
        
        // Tentacles (elongated, flowing)
        float tentacle1 = exp(-(distance - radius * 0.2) * (distance - radius * 0.2) / (radius * 0.1)) * 
                         exp(-(angle - sin(time * 0.5) * 0.5) * (angle - sin(time * 0.5) * 0.5) / 0.3);
        float tentacle2 = exp(-(distance - radius * 0.3) * (distance - radius * 0.3) / (radius * 0.08)) * 
                         exp(-(angle - cos(time * 0.7) * 0.4) * (angle - cos(time * 0.7) * 0.4) / 0.25);
        float tentacle3 = exp(-(distance - radius * 0.25) * (distance - radius * 0.25) / (radius * 0.12)) * 
                         exp(-(angle - sin(time * 0.3) * 0.6) * (angle - sin(time * 0.3) * 0.6) / 0.35);
        
        // Combine all parts
        float jellyfish = body + tentacle1 * 0.6 + tentacle2 * 0.5 + tentacle3 * 0.7;
        
        // Add pulsing effect
        jellyfish *= (0.8 + 0.2 * sin(time * 2.0));
        
        vec3 splat = jellyfish * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }
    `)

    const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision mediump sampler2D;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform float dt;
      uniform float dissipation;
      void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        gl_FragColor = dissipation * texture2D(uSource, coord);
      }
    `)

    const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision mediump sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      vec2 sampleVelocity (in vec2 uv) {
        vec2 multiplier = vec2(1.0, 1.0);
        if (uv.x < 0.0) { uv.x = 0.0; multiplier.x = -1.0; }
        if (uv.x > 1.0) { uv.x = 1.0; multiplier.x = -1.0; }
        if (uv.y < 0.0) { uv.y = 0.0; multiplier.y = -1.0; }
        if (uv.y > 1.0) { uv.y = 1.0; multiplier.y = -1.0; }
        return multiplier * texture2D(uVelocity, uv).xy;
      }
      void main () {
        float L = sampleVelocity(vL).x;
        float R = sampleVelocity(vR).x;
        float T = sampleVelocity(vT).y;
        float B = sampleVelocity(vB).y;
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `)

    const curlShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision mediump sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(vorticity, 0.0, 0.0, 1.0);
      }
    `)

    const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision mediump sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;
      void main () {
        float L = texture2D(uCurl, vL).y;
        float R = texture2D(uCurl, vR).y;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = vec2(abs(T) - abs(B), abs(R) - abs(L));
        force *= 1.0 / length(force + 0.00001) * curl * C;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
      }
    `)

    const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision mediump sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      vec2 boundary (in vec2 uv) {
        uv = min(max(uv, 0.0), 1.0);
        return uv;
      }
      void main () {
        float L = texture2D(uPressure, boundary(vL)).x;
        float R = texture2D(uPressure, boundary(vR)).x;
        float T = texture2D(uPressure, boundary(vT)).x;
        float B = texture2D(uPressure, boundary(vB)).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `)

    const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
      precision highp float;
      precision mediump sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      vec2 boundary (in vec2 uv) {
        uv = min(max(uv, 0.0), 1.0);
        return uv;
      }
      void main () {
        float L = texture2D(uPressure, boundary(vL)).x;
        float R = texture2D(uPressure, boundary(vR)).x;
        float T = texture2D(uPressure, boundary(vT)).x;
        float B = texture2D(uPressure, boundary(vB)).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }
    `)

    // Initialize framebuffers
    let textureWidth: number
    let textureHeight: number
    let density: any
    let velocity: any
    let divergence: any
    let curl: any
    let pressure: any

    const initFramebuffers = () => {
      textureWidth = gl.drawingBufferWidth >> config.TEXTURE_DOWNSAMPLE
      textureHeight = gl.drawingBufferHeight >> config.TEXTURE_DOWNSAMPLE

      const iFormat = ext.internalFormat
      const iFormatRG = ext.internalFormatRG
      const formatRG = ext.formatRG
      const texType = ext.texType

      density = createDoubleFBO(0, textureWidth, textureHeight, iFormat, gl.RGBA, texType, support_linear_float ? gl.LINEAR : gl.NEAREST)
      velocity = createDoubleFBO(2, textureWidth, textureHeight, iFormatRG, formatRG, texType, support_linear_float ? gl.LINEAR : gl.NEAREST)
      divergence = createFBO(4, textureWidth, textureHeight, iFormatRG, formatRG, texType, gl.NEAREST)
      curl = createFBO(5, textureWidth, textureHeight, iFormatRG, formatRG, texType, gl.NEAREST)
      pressure = createDoubleFBO(6, textureWidth, textureHeight, iFormatRG, formatRG, texType, gl.NEAREST)
    }

    const createFBO = (texId: number, w: number, h: number, internalFormat: number, format: number, type: any, param: number) => {
      gl.activeTexture(gl.TEXTURE0 + texId)

      const texture = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)

      const fbo = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      gl.viewport(0, 0, w, h)
      gl.clear(gl.COLOR_BUFFER_BIT)

      return [texture, fbo, texId]
    }

    const createDoubleFBO = (texId: number, w: number, h: number, internalFormat: number, format: number, type: any, param: number) => {
      let fbo1 = createFBO(texId, w, h, internalFormat, format, type, param)
      let fbo2 = createFBO(texId + 1, w, h, internalFormat, format, type, param)

      return {
        get first() { return fbo1 },
        get second() { return fbo2 },
        swap() {
          const temp = fbo1
          fbo1 = fbo2
          fbo2 = temp
        }
      }
    }

    initFramebuffers()

    // Create programs
    const clearProgram = new GLProgram(baseVertexShader, clearShader)
    const displayProgram = new GLProgram(baseVertexShader, displayShader)
    const splatProgram = new GLProgram(baseVertexShader, splatShader)
    const advectionProgram = new GLProgram(baseVertexShader, advectionShader)
    const divergenceProgram = new GLProgram(baseVertexShader, divergenceShader)
    const curlProgram = new GLProgram(baseVertexShader, curlShader)
    const vorticityProgram = new GLProgram(baseVertexShader, vorticityShader)
    const pressureProgram = new GLProgram(baseVertexShader, pressureShader)
    const gradientSubtractProgram = new GLProgram(baseVertexShader, gradientSubtractShader)

    // Blit function
    const blit = (() => {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(0)

      return (destination: WebGLFramebuffer | null) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, destination)
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
      }
    })()

    // Splat function
    const splat = (x: number, y: number, dx: number, dy: number, color: number[], time: number = 0) => {
      splatProgram.bind()
      gl.uniform1i(splatProgram.uniforms.uTarget, velocity.first[2])
      gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height)
      gl.uniform2f(splatProgram.uniforms.point, x / canvas.width, 1.0 - y / canvas.height)
      gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0)
      gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS)
      gl.uniform1f(splatProgram.uniforms.time, time)
      blit(velocity.second[1])
      velocity.swap()

      gl.uniform1i(splatProgram.uniforms.uTarget, density.first[2])
      gl.uniform3f(splatProgram.uniforms.color, color[0] * 0.4, color[1] * 0.4, color[2] * 0.4) // Increased intensity for jellyfish
      gl.uniform1f(splatProgram.uniforms.time, time)
      blit(density.second[1])
      density.swap()
    }

    // Resize function
    const resizeCanvas = () => {
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth
        canvas.height = canvas.clientHeight
        initFramebuffers()
      }
    }

    // Mouse movement variables
    let count = 0
    let colorArr = [0.3, 0.2, 0.7] // Initial jellyfish purple color
    let animationTime = 0

    // Update function
    const update = () => {
      resizeCanvas()

      const dt = Math.min(16 / 1000, 0.016) // Fixed timestep
      animationTime += dt
      gl.viewport(0, 0, textureWidth, textureHeight)
      // Advection
      advectionProgram.bind()
      gl.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.first[2])
      gl.uniform1i(advectionProgram.uniforms.uSource, velocity.first[2])
      gl.uniform1f(advectionProgram.uniforms.dt, dt)
      gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION)
      blit(velocity.second[1])
      velocity.swap()

      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.first[2])
      gl.uniform1i(advectionProgram.uniforms.uSource, density.first[2])
      gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION)
      blit(density.second[1])
      density.swap()

      // Handle pointer movements
      for (let i = 0, len = pointers.length; i < len; i++) {
        const pointer = pointers[i]
        if (pointer.moved) {
          splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color, animationTime)
          pointer.moved = false
        }
      }

      // Curl
      curlProgram.bind()
      gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
      gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.first[2])
      blit(curl[1])

      // Vorticity
      vorticityProgram.bind()
      gl.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
      gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.first[2])
      gl.uniform1i(vorticityProgram.uniforms.uCurl, curl[2])
      gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL)
      gl.uniform1f(vorticityProgram.uniforms.dt, dt)
      blit(velocity.second[1])
      velocity.swap()

      // Divergence
      divergenceProgram.bind()
      gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
      gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.first[2])
      blit(divergence[1])

      // Clear pressure
      clearProgram.bind()
      const pressureTexId = pressure.first[2]
      gl.activeTexture(gl.TEXTURE0 + pressureTexId)
      gl.bindTexture(gl.TEXTURE_2D, pressure.first[0])
      gl.uniform1i(clearProgram.uniforms.uTexture, pressureTexId)
      gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE_DISSIPATION)
      blit(pressure.second[1])
      pressure.swap()

      // Pressure
      pressureProgram.bind()
      gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
      gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence[2])
      gl.activeTexture(gl.TEXTURE0 + pressureTexId)

      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.bindTexture(gl.TEXTURE_2D, pressure.first[0])
        gl.uniform1i(pressureProgram.uniforms.uPressure, pressureTexId)
        blit(pressure.second[1])
        pressure.swap()
      }

      // Gradient subtract
      gradientSubtractProgram.bind()
      gl.uniform2f(gradientSubtractProgram.uniforms.texelSize, 1.0 / textureWidth, 1.0 / textureHeight)
      gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, pressure.first[2])
      gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, velocity.first[2])
      blit(velocity.second[1])
      velocity.swap()

      // Display
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      displayProgram.bind()
      gl.uniform1i(displayProgram.uniforms.uTexture, density.first[2])
      blit(null)

      animationRef.current = requestAnimationFrame(update)
    }

    // Mouse event handlers
    const handleMouseMove = (e: MouseEvent) => {
      count++
      if (count > 20) { // Less frequent color changes for jellyfish
        // Jellyfish-like colors: blues, purples, and soft pinks
        const jellyfishColors = [
          [0.2, 0.4, 0.8], // Deep blue
          [0.3, 0.2, 0.7], // Purple
          [0.4, 0.3, 0.9], // Light purple
          [0.5, 0.2, 0.6], // Magenta
          [0.3, 0.5, 0.8], // Cyan-blue
          [0.6, 0.3, 0.7]  // Pink-purple
        ]
        const randomColor = jellyfishColors[Math.floor(Math.random() * jellyfishColors.length)]
        colorArr = [randomColor[0] + 0.3, randomColor[1] + 0.3, randomColor[2] + 0.3]
        count = 0
      }

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      pointers[0].down = true
      pointers[0].color = colorArr
      pointers[0].moved = true // Always mark as moved for continuous effect
      pointers[0].dx = (x - pointers[0].x) * 15.0 // Gentler movement for jellyfish
      pointers[0].dy = (y - pointers[0].y) * 15.0
      pointers[0].x = x
      pointers[0].y = y

    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touches = e.targetTouches

      count++
      if (count > 20) { // Less frequent color changes for jellyfish
        // Jellyfish-like colors: blues, purples, and soft pinks
        const jellyfishColors = [
          [0.2, 0.4, 0.8], // Deep blue
          [0.3, 0.2, 0.7], // Purple
          [0.4, 0.3, 0.9], // Light purple
          [0.5, 0.2, 0.6], // Magenta
          [0.3, 0.5, 0.8], // Cyan-blue
          [0.6, 0.3, 0.7]  // Pink-purple
        ]
        const randomColor = jellyfishColors[Math.floor(Math.random() * jellyfishColors.length)]
        colorArr = [randomColor[0] + 0.3, randomColor[1] + 0.3, randomColor[2] + 0.3]
        count = 0
      }

      for (let i = 0, len = touches.length; i < len; i++) {
        if (i >= pointers.length) pointers.push(createPointer())

        const rect = canvas.getBoundingClientRect()
        const x = touches[i].pageX - rect.left
        const y = touches[i].pageY - rect.top

        pointers[i].id = touches[i].identifier
        pointers[i].down = true
        pointers[i].x = x
        pointers[i].y = y
        pointers[i].color = colorArr

        const pointer = pointers[i]
        pointer.moved = true // Always mark as moved for continuous effect
        pointer.dx = (x - pointer.x) * 15.0 // Gentler movement for jellyfish
        pointer.dy = (y - pointer.y) * 15.0
        pointer.x = x
        pointer.y = y
      }
    }

    // Add event listeners
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })

    // No initial splats - only mouse movement will create effects

    // Start animation
    update()

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchmove', handleTouchMove)
    }
    } catch (err) {
      console.error('Fluid effect initialization failed:', err)
      setError('Fluid effect failed to initialize')
    }
  }, [])

  if (error) {
    // Return a minimal fallback that won't interfere with smoke animation
    return <div className="hidden" />
  }

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full z-10 ${className}`}
      style={{ 
        background: 'transparent',
        mixBlendMode: 'screen',
        opacity: 0.4,
        pointerEvents: 'auto'
      }}
    />
  )
}
