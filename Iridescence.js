/**
 * Iridescence Component
 * Raw WebGL implementation of the reactor-bits Iridescence shader.
 * Zero dependencies.
 */
export default class Iridescence {
    constructor(element, options = {}) {
        this.container = element;
        this.color = options.color || [0.5, 0.6, 0.8]; // Default single color
        this.palette = options.colors || null; // Optional palette
        this.speed = options.speed || 1.0;
        this.amplitude = options.amplitude || 0.1;
        this.mouseReact = options.mouseReact !== undefined ? options.mouseReact : true;

        // Convert palette to RGB if provided
        if (this.palette && this.palette.length > 0) {
            this.palette = this.palette.map(c => typeof c === 'string' ? this.hexToRgb(c) : c);
        }
        // Convert initial single color if string
        if (typeof this.color === 'string') {
            this.color = this.hexToRgb(this.color);
        }

        this.mousePos = { x: 0.5, y: 0.5 };
        this.uTime = 0;

        // Color cycling state
        this.colorIndex = 0;
        this.colorNextIndex = 1;
        this.colorLerp = 0;
        this.cycleSpeed = 0.0025; // Speed of transition between colors

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        this.container.appendChild(this.canvas);

        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');

        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        this.init();
    }

    hexToRgb(hex) {
        const bigint = parseInt(hex.replace('#', ''), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return [r / 255, g / 255, b / 255];
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        if (this.mouseReact) {
            window.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                this.mousePos.x = (e.clientX - rect.left) / rect.width;
                this.mousePos.y = 1.0 - (e.clientY - rect.top) / rect.height;
            });
        }

        // Shaders
        const vertexShaderSource = `
            attribute vec2 position;
            varying vec2 vUv;
            void main() {
                vUv = position * 0.5 + 0.5;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        // User's requested Fragment Shader
        const fragmentShaderSource = `
            precision highp float;

            uniform float uTime;
            uniform vec3 uColor;
            uniform vec3 uResolution;
            uniform vec2 uMouse;
            uniform float uAmplitude;
            uniform float uSpeed;

            varying vec2 vUv;

            void main() {
                float mr = min(uResolution.x, uResolution.y);
                vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

                uv += (uMouse - vec2(0.5)) * uAmplitude;

                float d = -uTime * 0.5 * uSpeed;
                float a = 0.0;
                for (float i = 0.0; i < 8.0; ++i) {
                    a += cos(i - d - a * uv.x);
                    d += sin(uv.y * i + a);
                }
                d += uTime * 0.5 * uSpeed;
                vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
                col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
                gl_FragColor = vec4(col, 1.0);
            }
        `;

        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        this.gl.useProgram(this.program);

        // Attributes
        this.positionAttributeInfo = this.gl.getAttribLocation(this.program, 'position');
        this.buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        // Full screen quad
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
        ]), this.gl.STATIC_DRAW);

        // Uniforms
        this.uniforms = {
            uTime: this.gl.getUniformLocation(this.program, 'uTime'),
            uColor: this.gl.getUniformLocation(this.program, 'uColor'),
            uResolution: this.gl.getUniformLocation(this.program, 'uResolution'),
            uMouse: this.gl.getUniformLocation(this.program, 'uMouse'),
            uAmplitude: this.gl.getUniformLocation(this.program, 'uAmplitude'),
            uSpeed: this.gl.getUniformLocation(this.program, 'uSpeed'),
        };

        // Resize once to set initial resolution uniform
        this.resize();

        this.animate();
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    createProgram(vsSource, fsSource) {
        const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);
        const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vs);
        this.gl.attachShader(program, fs);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program link error:', this.gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    resize() {
        const pixelRatio = window.devicePixelRatio || 1;
        this.canvas.width = this.container.offsetWidth * pixelRatio;
        this.canvas.height = this.container.offsetHeight * pixelRatio;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        if (this.gl && this.program) {
            this.gl.useProgram(this.program);
            this.gl.uniform3f(this.uniforms.uResolution, this.canvas.width, this.canvas.height, 1.0);
        }
    }

    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    animate() {
        this.uTime += 0.01;

        // Palette cycling logic
        if (this.palette && this.palette.length > 1) {
            this.colorLerp += this.cycleSpeed;
            if (this.colorLerp >= 1.0) {
                this.colorLerp = 0;
                this.colorIndex = (this.colorIndex + 1) % this.palette.length;
                this.colorNextIndex = (this.colorIndex + 1) % this.palette.length;
            }

            const c1 = this.palette[this.colorIndex];
            const c2 = this.palette[this.colorNextIndex];

            this.color = [
                this.lerp(c1[0], c2[0], this.colorLerp),
                this.lerp(c1[1], c2[1], this.colorLerp),
                this.lerp(c1[2], c2[2], this.colorLerp)
            ];
        }

        this.gl.uniform1f(this.uniforms.uTime, this.uTime);
        this.gl.uniform3f(this.uniforms.uColor, this.color[0], this.color[1], this.color[2]);
        this.gl.uniform2f(this.uniforms.uMouse, this.mousePos.x, this.mousePos.y);
        this.gl.uniform1f(this.uniforms.uAmplitude, this.amplitude);
        this.gl.uniform1f(this.uniforms.uSpeed, this.speed);

        this.gl.enableVertexAttribArray(this.positionAttributeInfo);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        this.gl.vertexAttribPointer(this.positionAttributeInfo, 2, this.gl.FLOAT, false, 0, 0);

        // Transparency
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        this.rafId = requestAnimationFrame(() => this.animate());
    }
}
