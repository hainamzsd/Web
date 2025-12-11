'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// Vietnam mainland outline extracted from GeoJSON (normalized 0-1 coordinates)
const VIETNAM_MAINLAND: [number, number][] = [
  [0.425, 0.453], [0.422, 0.459], [0.42, 0.468], [0.423, 0.473], [0.429, 0.476],
  [0.434, 0.483], [0.434, 0.488], [0.424, 0.495], [0.42, 0.499], [0.415, 0.5],
  [0.403, 0.509], [0.398, 0.521], [0.409, 0.524], [0.418, 0.531], [0.41, 0.533],
  [0.396, 0.539], [0.39, 0.546], [0.381, 0.549], [0.374, 0.554], [0.374, 0.559],
  [0.366, 0.555], [0.361, 0.555], [0.355, 0.564], [0.348, 0.588], [0.339, 0.589],
  [0.331, 0.599], [0.33, 0.604], [0.326, 0.603], [0.296, 0.623], [0.282, 0.634],
  [0.274, 0.648], [0.269, 0.654], [0.267, 0.657], [0.26, 0.656], [0.253, 0.659],
  [0.25, 0.662], [0.243, 0.668], [0.24, 0.681], [0.243, 0.685], [0.23, 0.69],
  [0.217, 0.693], [0.206, 0.696], [0.193, 0.703], [0.181, 0.709], [0.172, 0.712],
  [0.155, 0.72], [0.146, 0.723], [0.149, 0.728], [0.157, 0.731], [0.161, 0.735],
  [0.154, 0.744], [0.163, 0.745], [0.175, 0.746], [0.186, 0.744], [0.199, 0.742],
  [0.208, 0.749], [0.217, 0.756], [0.22, 0.762], [0.227, 0.764], [0.228, 0.769],
  [0.217, 0.778], [0.204, 0.781], [0.206, 0.785], [0.182, 0.791], [0.196, 0.796],
  [0.19, 0.809], [0.182, 0.812], [0.175, 0.817], [0.169, 0.819], [0.158, 0.821],
  [0.141, 0.815], [0.135, 0.811], [0.131, 0.806], [0.128, 0.803], [0.116, 0.809],
  [0.109, 0.813], [0.102, 0.812], [0.091, 0.814], [0.082, 0.819], [0.072, 0.829],
  [0.068, 0.834], [0.064, 0.838], [0.068, 0.845], [0.069, 0.853], [0.074, 0.859],
  [0.067, 0.865], [0.061, 0.867], [0.049, 0.863], [0.04, 0.879], [0.036, 0.884],
  [0.022, 0.894], [0.012, 0.901], [0.01, 0.907], [0.019, 0.91], [0.027, 0.921],
  [0.033, 0.926], [0.041, 0.923], [0.047, 0.923], [0.065, 0.917], [0.078, 0.908],
  [0.084, 0.912], [0.094, 0.921], [0.105, 0.927], [0.111, 0.919], [0.119, 0.923],
  [0.128, 0.929], [0.144, 0.916], [0.15, 0.913], [0.154, 0.919], [0.161, 0.929],
  [0.172, 0.926], [0.19, 0.927], [0.198, 0.93], [0.205, 0.93], [0.218, 0.937],
  [0.221, 0.951], [0.234, 0.955], [0.244, 0.957], [0.248, 0.959], [0.256, 0.96],
  [0.264, 0.957], [0.272, 0.949], [0.284, 0.944], [0.29, 0.941], [0.298, 0.937],
  [0.308, 0.94], [0.327, 0.933], [0.346, 0.937], [0.357, 0.933], [0.364, 0.929],
  [0.365, 0.925], [0.356, 0.916], [0.348, 0.909], [0.352, 0.901], [0.357, 0.893],
  [0.359, 0.888], [0.358, 0.88], [0.366, 0.881], [0.378, 0.877], [0.386, 0.875],
  [0.398, 0.866], [0.414, 0.86], [0.423, 0.858], [0.436, 0.86], [0.449, 0.861],
  [0.459, 0.852], [0.448, 0.853], [0.442, 0.853], [0.436, 0.847], [0.432, 0.843],
  [0.426, 0.844], [0.417, 0.843], [0.413, 0.834], [0.411, 0.824], [0.401, 0.823],
  [0.4, 0.82], [0.39, 0.821], [0.387, 0.824], [0.374, 0.823], [0.367, 0.821],
  [0.36, 0.825], [0.358, 0.824], [0.363, 0.812], [0.368, 0.805], [0.362, 0.804],
  [0.353, 0.804], [0.35, 0.796], [0.351, 0.787], [0.346, 0.783], [0.344, 0.777],
  [0.337, 0.777], [0.33, 0.77], [0.323, 0.767], [0.316, 0.765], [0.304, 0.759],
  [0.301, 0.753], [0.295, 0.745], [0.292, 0.74], [0.291, 0.729], [0.293, 0.724],
  [0.29, 0.72], [0.285, 0.711], [0.279, 0.704], [0.286, 0.697], [0.289, 0.689],
  [0.304, 0.675], [0.315, 0.664], [0.322, 0.662], [0.335, 0.654], [0.341, 0.654],
  [0.345, 0.642], [0.345, 0.63], [0.33, 0.634], [0.34, 0.63], [0.356, 0.617],
  [0.381, 0.6], [0.4, 0.583], [0.433, 0.564], [0.449, 0.551], [0.453, 0.546],
  [0.462, 0.548], [0.469, 0.543], [0.472, 0.538], [0.48, 0.533], [0.487, 0.539],
  [0.485, 0.527], [0.491, 0.522], [0.509, 0.502], [0.516, 0.496], [0.522, 0.491],
  [0.525, 0.496], [0.53, 0.487], [0.531, 0.482], [0.532, 0.474], [0.542, 0.457],
  [0.545, 0.447], [0.549, 0.433], [0.557, 0.42], [0.562, 0.398], [0.557, 0.391],
  [0.562, 0.386], [0.564, 0.38], [0.556, 0.376], [0.562, 0.373], [0.562, 0.364],
  [0.565, 0.357], [0.574, 0.346], [0.567, 0.341], [0.575, 0.332], [0.568, 0.332],
  [0.558, 0.335], [0.554, 0.327], [0.561, 0.319], [0.553, 0.321], [0.555, 0.313],
  [0.555, 0.305], [0.56, 0.291], [0.552, 0.299], [0.554, 0.286], [0.557, 0.279],
  [0.553, 0.273], [0.547, 0.269], [0.54, 0.272], [0.536, 0.254], [0.522, 0.253],
  [0.515, 0.246], [0.506, 0.246], [0.496, 0.238], [0.488, 0.233], [0.47, 0.23],
  [0.461, 0.218], [0.445, 0.215], [0.428, 0.21], [0.411, 0.203], [0.4, 0.201],
  [0.394, 0.205], [0.384, 0.205], [0.386, 0.212], [0.382, 0.204], [0.373, 0.214],
  [0.366, 0.214], [0.359, 0.206], [0.353, 0.202], [0.361, 0.202], [0.348, 0.194],
  [0.364, 0.188], [0.362, 0.18], [0.359, 0.176], [0.351, 0.177], [0.331, 0.192],
  [0.345, 0.177], [0.359, 0.167], [0.318, 0.19], [0.33, 0.179], [0.346, 0.167],
  [0.352, 0.156], [0.343, 0.15], [0.303, 0.174], [0.314, 0.161], [0.321, 0.142],
  [0.309, 0.136], [0.264, 0.118], [0.255, 0.107], [0.233, 0.095], [0.209, 0.094],
  [0.218, 0.098], [0.219, 0.101], [0.215, 0.111], [0.218, 0.148], [0.23, 0.17],
  [0.239, 0.174], [0.223, 0.182], [0.206, 0.188], [0.199, 0.189], [0.194, 0.199],
  [0.195, 0.205], [0.213, 0.207], [0.236, 0.218], [0.234, 0.231], [0.25, 0.228],
  [0.263, 0.233], [0.283, 0.235], [0.295, 0.23], [0.318, 0.223], [0.317, 0.233],
  [0.31, 0.243], [0.299, 0.251], [0.298, 0.261], [0.292, 0.27], [0.3, 0.273],
  [0.309, 0.281], [0.329, 0.275], [0.34, 0.283], [0.338, 0.292], [0.344, 0.291],
  [0.364, 0.296], [0.383, 0.3], [0.402, 0.312], [0.421, 0.313], [0.427, 0.324],
  [0.426, 0.34], [0.42, 0.35], [0.423, 0.395], [0.419, 0.402], [0.418, 0.41],
  [0.411, 0.414], [0.413, 0.428], [0.414, 0.436], [0.419, 0.437], [0.423, 0.444],
]

// Hoàng Sa (Paracel Islands) - positioned relative to mainland
const HOANG_SA = {
  name: 'Hoàng Sa',
  x: 0.68,
  y: 0.52,
  islands: [
    [0.66, 0.54], [0.68, 0.55], [0.70, 0.53], [0.67, 0.51],
    [0.69, 0.50], [0.71, 0.52], [0.68, 0.53], [0.70, 0.54],
  ]
}

// Trường Sa (Spratly Islands)
const TRUONG_SA = {
  name: 'Trường Sa',
  x: 0.72,
  y: 0.18,
  islands: [
    [0.68, 0.22], [0.71, 0.21], [0.74, 0.20], [0.69, 0.18],
    [0.72, 0.17], [0.75, 0.16], [0.70, 0.14], [0.73, 0.13],
    [0.68, 0.15], [0.76, 0.18], [0.74, 0.14], [0.71, 0.12],
  ]
}

// Phú Quốc island (from GeoJSON)
const PHU_QUOC = {
  name: 'Phú Quốc',
  x: 0.14,
  y: 0.21,
  points: [
    [0.13, 0.23], [0.15, 0.24], [0.16, 0.22], [0.15, 0.20], [0.13, 0.19], [0.12, 0.21],
  ]
}

// Cities positioned on the real map
const CITIES = [
  { name: 'Hà Nội', x: 0.36, y: 0.87, size: 1.3 },
  { name: 'TP.HCM', x: 0.40, y: 0.32, size: 1.3 },
  { name: 'Đà Nẵng', x: 0.48, y: 0.55, size: 1.0 },
]

// Point-in-polygon test
function isInsidePolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

// Generate particles from accurate polygon
function generateParticles(count: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = []

  // Calculate bounds
  let minX = 1, maxX = 0, minY = 1, maxY = 0
  VIETNAM_MAINLAND.forEach(([x, y]) => {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  })

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const scale = 6

  // Fill mainland with particles
  let attempts = 0
  while (points.length < count - 300 && attempts < count * 50) {
    const x = minX + Math.random() * (maxX - minX)
    const y = minY + Math.random() * (maxY - minY)

    if (isInsidePolygon(x, y, VIETNAM_MAINLAND)) {
      const px = (x - centerX) * scale
      const py = (y - centerY) * scale
      const pz = (Math.random() - 0.5) * 0.1
      points.push(new THREE.Vector3(px, py, pz))
    }
    attempts++
  }

  // Add outline particles
  for (let i = 0; i < VIETNAM_MAINLAND.length; i++) {
    const [x1, y1] = VIETNAM_MAINLAND[i]
    const [x2, y2] = VIETNAM_MAINLAND[(i + 1) % VIETNAM_MAINLAND.length]

    for (let t = 0; t <= 1; t += 0.2) {
      const x = x1 + (x2 - x1) * t
      const y = y1 + (y2 - y1) * t
      const px = (x - centerX) * scale
      const py = (y - centerY) * scale
      points.push(new THREE.Vector3(px, py, 0))
    }
  }

  // Add Phú Quốc
  PHU_QUOC.points.forEach(([x, y]) => {
    for (let i = 0; i < 5; i++) {
      const px = (x + (Math.random() - 0.5) * 0.02 - centerX) * scale
      const py = (y + (Math.random() - 0.5) * 0.02 - centerY) * scale
      points.push(new THREE.Vector3(px, py, (Math.random() - 0.5) * 0.05))
    }
  })

  // Add Hoàng Sa
  HOANG_SA.islands.forEach(([x, y]) => {
    for (let i = 0; i < 8; i++) {
      const px = (x + (Math.random() - 0.5) * 0.015 - centerX) * scale
      const py = (y + (Math.random() - 0.5) * 0.015 - centerY) * scale
      points.push(new THREE.Vector3(px, py, (Math.random() - 0.5) * 0.06))
    }
  })

  // Add Trường Sa
  TRUONG_SA.islands.forEach(([x, y]) => {
    for (let i = 0; i < 6; i++) {
      const px = (x + (Math.random() - 0.5) * 0.012 - centerX) * scale
      const py = (y + (Math.random() - 0.5) * 0.012 - centerY) * scale
      points.push(new THREE.Vector3(px, py, (Math.random() - 0.5) * 0.06))
    }
  })

  return points
}

interface VietnamParticleMapProps {
  className?: string
  interactiveMode?: boolean
}

export default function VietnamParticleMap({ className = '', interactiveMode = false }: VietnamParticleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.z = 8

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const points = generateParticles(4500)
    const geometry = new THREE.BufferGeometry()

    const positions = new Float32Array(points.length * 3)
    const colors = new Float32Array(points.length * 3)
    const sizes = new Float32Array(points.length)

    // More vibrant color palette
    const palette = [
      new THREE.Color('#ff3030'),  // Bright red
      new THREE.Color('#ff5555'),  // Light red
      new THREE.Color('#ff9900'),  // Orange
      new THREE.Color('#ffdd00'),  // Gold
      new THREE.Color('#ffffff'),  // White
      new THREE.Color('#ff6666'),  // Coral
    ]

    points.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z

      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b

      // Larger base particle sizes
      sizes[i] = Math.random() * 0.032 + 0.012
    })

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vHoverIntensity;
        uniform float time;
        uniform vec2 mouse;

        void main() {
          vColor = color;
          vec3 pos = position;

          // Subtle breathing animation
          float breath = sin(time * 0.5 + pos.x * 2.0 + pos.y * 2.0) * 0.01;
          pos.z += breath;

          // Mouse interaction - gentle glow only, no movement
          vec2 m = mouse * 4.0;
          float d = distance(pos.xy, m);
          float hoverRadius = 1.2;
          vHoverIntensity = 0.0;

          if (d < hoverRadius) {
            float strength = 1.0 - (d / hoverRadius);
            strength = strength * strength * strength; // Cubic ease for smooth falloff
            vHoverIntensity = strength;
          }

          vec4 mv = modelViewMatrix * vec4(pos, 1.0);

          // Subtle size increase on hover
          float hoverSize = 1.0 + vHoverIntensity * 0.5;
          gl_PointSize = size * hoverSize * (250.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vHoverIntensity;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;

          // Smooth glow
          float a = 1.0 - smoothstep(0.0, 0.5, d);

          // Base brightness
          float brightness = 1.8 + (0.5 - d) * 0.8;

          // Gentle brightness boost on hover
          brightness += vHoverIntensity * 1.2;

          vec3 glow = vColor * brightness;

          // Subtle white center
          glow += vec3(1.0) * (1.0 - smoothstep(0.0, 0.25, d)) * 0.3;

          // Opacity
          float opacity = a * 0.9;

          gl_FragColor = vec4(glow, opacity);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    // Calculate centers for positioning
    let minX = 1, maxX = 0, minY = 1, maxY = 0
    VIETNAM_MAINLAND.forEach(([x, y]) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    })
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const scale = 6

    // Markers
    const markers = new THREE.Group()

    // City markers
    CITIES.forEach(city => {
      const px = (city.x - centerX) * scale
      const py = (city.y - centerY) * scale

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 * city.size, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.95 })
      )
      dot.position.set(px, py, 0.08)
      markers.add(dot)

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.055 * city.size, 0.075 * city.size, 32),
        new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      )
      ring.position.copy(dot.position)
      ring.userData = { phase: Math.random() * Math.PI * 2, type: 'city' }
      markers.add(ring)
    })

    // Island marker helper
    const addIslandMarker = (ix: number, iy: number, color: number = 0x00ffff) => {
      const px = (ix - centerX) * scale
      const py = (iy - centerY) * scale

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
      )
      dot.position.set(px, py, 0.08)
      markers.add(dot)

      const ring1 = new THREE.Mesh(
        new THREE.RingGeometry(0.07, 0.095, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
      )
      ring1.position.copy(dot.position)
      ring1.userData = { phase: 0, type: 'island' }
      markers.add(ring1)

      const ring2 = new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.14, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
      )
      ring2.position.copy(dot.position)
      ring2.userData = { phase: Math.PI, type: 'island' }
      markers.add(ring2)

      return dot.position
    }

    addIslandMarker(PHU_QUOC.x, PHU_QUOC.y, 0x00ff88)
    const hsPos = addIslandMarker(HOANG_SA.x, HOANG_SA.y)
    const tsPos = addIslandMarker(TRUONG_SA.x, TRUONG_SA.y)

    // Connecting lines
    const addLine = (from: THREE.Vector3, to: THREE.Vector3, color: number = 0x00ffff) => {
      const g = new THREE.Group()
      for (let i = 0; i < 8; i += 2) {
        const t1 = i / 8, t2 = (i + 1) / 8
        const p1 = new THREE.Vector3().lerpVectors(from, to, t1)
        const p2 = new THREE.Vector3().lerpVectors(from, to, t2)
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([p1, p2]),
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 })
        )
        g.add(line)
      }
      return g
    }

    const dnPos = new THREE.Vector3((0.48 - centerX) * scale, (0.55 - centerY) * scale, 0)
    markers.add(addLine(dnPos, hsPos))

    const ntPos = new THREE.Vector3((0.54 - centerX) * scale, (0.35 - centerY) * scale, 0)
    markers.add(addLine(ntPos, tsPos))

    scene.add(markers)

    // Mouse events
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / height) * 2 + 1
    }
    container.addEventListener('mousemove', onMouseMove)

    const clock = new THREE.Clock()
    let frameId: number

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      material.uniforms.time.value = t
      material.uniforms.mouse.value.set(mouseRef.current.x, mouseRef.current.y)

      markers.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
          const { phase, type } = child.userData
          const speed = type === 'island' ? 1.5 : 2
          const s = 1 + Math.sin(t * speed + phase) * (type === 'island' ? 0.3 : 0.2)
          child.scale.set(s, s, 1)
          child.material.opacity = 0.2 + Math.sin(t * speed + phase) * 0.15
        }
      })

      particles.rotation.y = Math.sin(t * 0.05) * 0.03
      markers.rotation.y = particles.rotation.y

      renderer.render(scene, camera)
    }

    animate()
    setIsLoaded(true)

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameId)
      container.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      container.removeChild(renderer.domElement)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  // For label positioning
  const minX = 0.01, maxX = 0.575, minY = 0.094, maxY = 0.96
  const cX = (minX + maxX) / 2
  const cY = (minY + maxY) / 2

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`} style={{ minHeight: '500px' }}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
        </div>
      )}


      {/* Labels - only show in normal mode */}
      <div className={`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-300 ${
        interactiveMode ? 'opacity-0' : 'opacity-100'
      }`}>
        {CITIES.map(city => (
          <div
            key={city.name}
            className="absolute text-white text-[10px] font-semibold drop-shadow-lg"
            style={{
              left: `${50 + (city.x - cX) * 75}%`,
              top: `${50 - (city.y - cY) * 55}%`,
              transform: 'translate(-50%, -200%)',
            }}
          >
            {city.name}
          </div>
        ))}

        <div
          className="absolute flex flex-col items-center"
          style={{
            left: `${50 + (PHU_QUOC.x - cX) * 75}%`,
            top: `${50 - (PHU_QUOC.y - cY) * 55}%`,
            transform: 'translate(-50%, -220%)',
          }}
        >
          <span className="text-emerald-400 text-[9px] font-bold drop-shadow-lg">Phú Quốc</span>
        </div>

        <div
          className="absolute flex flex-col items-center"
          style={{
            left: `${50 + (HOANG_SA.x - cX) * 75}%`,
            top: `${50 - (HOANG_SA.y - cY) * 55}%`,
            transform: 'translate(-50%, -220%)',
          }}
        >
          <span className="text-cyan-400 text-[10px] font-bold drop-shadow-lg">Hoàng Sa</span>
          <span className="text-cyan-300/60 text-[8px]">Paracel</span>
        </div>

        <div
          className="absolute flex flex-col items-center"
          style={{
            left: `${50 + (TRUONG_SA.x - cX) * 75}%`,
            top: `${50 - (TRUONG_SA.y - cY) * 55}%`,
            transform: 'translate(-50%, -220%)',
          }}
        >
          <span className="text-cyan-400 text-[10px] font-bold drop-shadow-lg">Trường Sa</span>
          <span className="text-cyan-300/60 text-[8px]">Spratly</span>
        </div>
      </div>
    </div>
  )
}
