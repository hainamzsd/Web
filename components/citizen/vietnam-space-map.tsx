'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Islands with proper Vietnamese names
const HOANG_SA = {
  name: 'Hoàng Sa',
  center: { lng: 112.0, lat: 16.5 },
  islands: [
    [111.5, 16.8], [112.0, 16.9], [112.5, 16.7], [111.7, 16.3],
    [112.2, 16.2], [112.7, 16.5], [112.0, 16.6], [112.4, 16.8]
  ]
}

const TRUONG_SA = {
  name: 'Trường Sa',
  center: { lng: 114.5, lat: 10.0 },
  islands: [
    [113.5, 11.0], [114.2, 10.8], [115.0, 10.5], [113.8, 9.8],
    [114.5, 9.5], [115.3, 9.2], [114.0, 8.8], [114.8, 8.5],
    [113.5, 9.0], [115.5, 9.8], [115.0, 8.8], [114.2, 8.2]
  ]
}

// Province folder names for GeoJSON loading
const PROVINCE_FOLDERS = [
  'angiang', 'bacninh', 'camau', 'cantho', 'caobang', 'daklak', 'danang',
  'dienbien', 'dongnai', 'gialai', 'haiphong', 'hanoi', 'hatinh', 'hochiminh',
  'hue', 'hungyen', 'khanhhoa', 'laichau', 'lamdong', 'langson', 'laocai',
  'nghean', 'ninhbinh', 'phutho', 'quangngai', 'quangninh', 'quangtri',
  'sonla', 'tayninh', 'thainguyen', 'thanhhoa', 'tuyenquang', 'vinhlong'
]

// Vietnam bounds for coordinate conversion
const VN_BOUNDS = { minLng: 102.0, maxLng: 117.5, minLat: 8.0, maxLat: 23.5 }

// Convert geo coordinates to scene coordinates
function geoToScene(lng: number, lat: number, scale: number = 0.55): { x: number; y: number } {
  const centerLng = (VN_BOUNDS.minLng + VN_BOUNDS.maxLng) / 2
  const centerLat = (VN_BOUNDS.minLat + VN_BOUNDS.maxLat) / 2
  const x = (lng - centerLng) * scale
  const y = (lat - centerLat) * scale
  return { x, y }
}

// Point-in-polygon test for geo coordinates
function isPointInPolygon(lng: number, lat: number, polygon: number[][]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

// GeoJSON types
interface GeoJSONFeature {
  type: string
  properties: {
    ten_tinh?: string
    ma_tinh?: string
    [key: string]: unknown
  }
  geometry: {
    type: string
    coordinates: number[][][] | number[][][][]
  }
}

interface GeoJSONData {
  type: string
  features: GeoJSONFeature[]
}

interface ProvinceData {
  name: string
  polygons: number[][][]
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number }
  center: { lng: number; lat: number }
}

export interface HighlightLocation {
  latitude: number
  longitude: number
  locationId: string
  locationName?: string
}

interface VietnamSpaceMapProps {
  className?: string
  highlightLocation?: HighlightLocation | null
}

export default function VietnamSpaceMap({
  className = '',
  highlightLocation = null
}: VietnamSpaceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const particlesRef = useRef<THREE.Points | null>(null)
  const labelsRef = useRef<THREE.Group | null>(null)
  const highlightMarkerRef = useRef<THREE.Group | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState('Đang tải dữ liệu tỉnh...')

  // Create text sprite with Vietnamese support
  const createTextSprite = useCallback((text: string, position: THREE.Vector3, color: string = '#ffffff', size: number = 0.25, opacity: number = 0.85) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.width = 512
    canvas.height = 128

    context.font = 'bold 36px "Segoe UI", Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'

    // Shadow for better readability
    context.shadowColor = 'rgba(0,0,0,0.8)'
    context.shadowBlur = 8
    context.shadowOffsetX = 2
    context.shadowOffsetY = 2

    // Text
    context.fillStyle = color
    context.fillText(text, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: opacity,
      depthTest: false
    })

    const sprite = new THREE.Sprite(material)
    sprite.position.copy(position)
    sprite.scale.set(size * 4, size, 1)

    return sprite
  }, [])

  // Generate particles for a province polygon
  const generateProvinceParticles = useCallback((
    province: ProvinceData,
    particleCount: number,
    scale: number
  ): { positions: number[]; colors: number[]; sizes: number[] } => {
    const positions: number[] = []
    const colors: number[] = []
    const sizes: number[] = []

    // Vibrant red palette
    const palette = [
      new THREE.Color('#ff3030'),  // Bright red
      new THREE.Color('#ff5555'),  // Light red
      new THREE.Color('#ff9900'),  // Orange
      new THREE.Color('#ffdd00'),  // Gold
      new THREE.Color('#ffffff'),  // White
      new THREE.Color('#ff6666'),  // Coral
    ]

    const { minLng, maxLng, minLat, maxLat } = province.bounds
    let generated = 0
    let attempts = 0
    const maxAttempts = particleCount * 100

    while (generated < particleCount && attempts < maxAttempts) {
      const lng = minLng + Math.random() * (maxLng - minLng)
      const lat = minLat + Math.random() * (maxLat - minLat)

      // Check if point is inside any of the province's polygons
      let inside = false
      for (const polygon of province.polygons) {
        if (isPointInPolygon(lng, lat, polygon)) {
          inside = true
          break
        }
      }

      if (inside) {
        const { x, y } = geoToScene(lng, lat, scale)
        const z = (Math.random() - 0.5) * 0.1

        positions.push(x, y, z)

        const c = palette[Math.floor(Math.random() * palette.length)]
        colors.push(c.r, c.g, c.b)

        sizes.push(Math.random() * 0.035 + 0.012)
        generated++
      }
      attempts++
    }

    // Add boundary particles for better definition
    for (const polygon of province.polygons) {
      const step = Math.max(1, Math.floor(polygon.length / 30))
      for (let i = 0; i < polygon.length; i += step) {
        const [lng, lat] = polygon[i]
        const { x, y } = geoToScene(lng, lat, scale)

        positions.push(x, y, 0)
        const c = palette[0] // Red for boundaries
        colors.push(c.r, c.g, c.b)
        sizes.push(0.018)
      }
    }

    return { positions, colors, sizes }
  }, [])

  // Load provinces and generate particles
  const loadProvincesAndGenerateParticles = useCallback(async (scene: THREE.Scene): Promise<void> => {
    const provinces: ProvinceData[] = []
    const scale = 0.55
    let loaded = 0

    // Load all province data first
    setLoadingStatus('Đang tải dữ liệu tỉnh...')
    for (const folder of PROVINCE_FOLDERS) {
      try {
        const response = await fetch(`/geojson/${folder}/province.geojson`)
        if (!response.ok) continue

        const data: GeoJSONData = await response.json()

        for (const feature of data.features) {
          const provinceName = feature.properties.ten_tinh || folder
          const polygons: number[][][] = []
          let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90
          let sumLng = 0, sumLat = 0, pointCount = 0

          const extractCoordinates = (coords: number[][]) => {
            const polygon: number[][] = []
            coords.forEach(([lng, lat]) => {
              polygon.push([lng, lat])
              minLng = Math.min(minLng, lng)
              maxLng = Math.max(maxLng, lng)
              minLat = Math.min(minLat, lat)
              maxLat = Math.max(maxLat, lat)
              sumLng += lng
              sumLat += lat
              pointCount++
            })
            if (polygon.length > 2) {
              polygons.push(polygon)
            }
          }

          if (feature.geometry.type === 'Polygon') {
            (feature.geometry.coordinates as number[][][]).forEach(ring => {
              extractCoordinates(ring)
            })
          } else if (feature.geometry.type === 'MultiPolygon') {
            (feature.geometry.coordinates as number[][][][]).forEach(poly => {
              poly.forEach(ring => {
                extractCoordinates(ring)
              })
            })
          }

          if (polygons.length > 0 && pointCount > 0) {
            provinces.push({
              name: provinceName,
              polygons,
              bounds: { minLng, maxLng, minLat, maxLat },
              center: { lng: sumLng / pointCount, lat: sumLat / pointCount }
            })
          }
        }

        loaded++
        setLoadingProgress(Math.round((loaded / PROVINCE_FOLDERS.length) * 50))
      } catch (error) {
        console.warn(`Failed to load province: ${folder}`)
      }
    }

    // Generate particles for all provinces
    setLoadingStatus('Đang tạo bản đồ hạt...')
    const allPositions: number[] = []
    const allColors: number[] = []
    const allSizes: number[] = []

    // Calculate particles per province based on area
    const totalParticles = 8000
    let totalArea = 0
    provinces.forEach(p => {
      const area = (p.bounds.maxLng - p.bounds.minLng) * (p.bounds.maxLat - p.bounds.minLat)
      totalArea += area
    })

    provinces.forEach((province, index) => {
      const area = (province.bounds.maxLng - province.bounds.minLng) * (province.bounds.maxLat - province.bounds.minLat)
      const particleCount = Math.max(50, Math.round((area / totalArea) * totalParticles))

      const { positions, colors, sizes } = generateProvinceParticles(province, particleCount, scale)
      // Use for loop instead of push(...) to avoid stack overflow with large arrays
      for (let i = 0; i < positions.length; i++) allPositions.push(positions[i])
      for (let i = 0; i < colors.length; i++) allColors.push(colors[i])
      for (let i = 0; i < sizes.length; i++) allSizes.push(sizes[i])

      setLoadingProgress(50 + Math.round(((index + 1) / provinces.length) * 40))
    })

    // Add island particles
    setLoadingStatus('Đang thêm quần đảo...')
    const palette = [
      new THREE.Color('#00ffff'),  // Cyan for islands
      new THREE.Color('#00ff88'),  // Teal
    ]

    // Hoang Sa particles
    HOANG_SA.islands.forEach(([lng, lat]) => {
      for (let i = 0; i < 15; i++) {
        const { x, y } = geoToScene(
          lng + (Math.random() - 0.5) * 0.3,
          lat + (Math.random() - 0.5) * 0.3,
          scale
        )
        allPositions.push(x, y, (Math.random() - 0.5) * 0.05)
        const c = palette[0]
        allColors.push(c.r, c.g, c.b)
        allSizes.push(Math.random() * 0.025 + 0.015)
      }
    })

    // Truong Sa particles
    TRUONG_SA.islands.forEach(([lng, lat]) => {
      for (let i = 0; i < 12; i++) {
        const { x, y } = geoToScene(
          lng + (Math.random() - 0.5) * 0.25,
          lat + (Math.random() - 0.5) * 0.25,
          scale
        )
        allPositions.push(x, y, (Math.random() - 0.5) * 0.05)
        const c = palette[0]
        allColors.push(c.r, c.g, c.b)
        allSizes.push(Math.random() * 0.025 + 0.015)
      }
    })

    // Create particles geometry
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3))
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(allSizes, 1))

    // Shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;

        void main() {
          vColor = color;
          vec3 pos = position;

          // Subtle breathing animation
          float breath = sin(time * 0.5 + pos.x * 2.0 + pos.y * 2.0) * 0.012;
          pos.z += breath;

          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;

          float a = 1.0 - smoothstep(0.0, 0.5, d);
          float brightness = 2.2 + (0.5 - d) * 1.2;
          vec3 glow = vColor * brightness;
          glow += vec3(1.0) * (1.0 - smoothstep(0.0, 0.2, d)) * 0.5;

          gl_FragColor = vec4(glow, a * 0.92);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)
    particlesRef.current = particles

    // Add province labels
    setLoadingStatus('Đang thêm nhãn tỉnh...')
    const labelsGroup = new THREE.Group()

    provinces.forEach(province => {
      const { x, y } = geoToScene(province.center.lng, province.center.lat, scale)
      const label = createTextSprite(
        province.name,
        new THREE.Vector3(x, y, 0.15),
        '#ffffff',
        0.22,
        0.75
      )
      labelsGroup.add(label)
    })

    // Add island labels
    const hsPos = geoToScene(HOANG_SA.center.lng, HOANG_SA.center.lat, scale)
    labelsGroup.add(createTextSprite(HOANG_SA.name, new THREE.Vector3(hsPos.x, hsPos.y + 0.3, 0.15), '#00ffff', 0.28, 0.9))

    const tsPos = geoToScene(TRUONG_SA.center.lng, TRUONG_SA.center.lat, scale)
    labelsGroup.add(createTextSprite(TRUONG_SA.name, new THREE.Vector3(tsPos.x, tsPos.y + 0.3, 0.15), '#00ffff', 0.28, 0.9))

    scene.add(labelsGroup)
    labelsRef.current = labelsGroup

    setLoadingProgress(100)
    setLoadingStatus('Hoàn tất!')
  }, [generateProvinceParticles, createTextSprite])

  // Create highlight marker
  const createHighlightMarker = useCallback((scene: THREE.Scene, lat: number, lng: number, name: string) => {
    const { x, y } = geoToScene(lng, lat, 0.55)

    const group = new THREE.Group()
    group.position.set(x, y, 0.2)

    // Glowing core
    const coreGeom = new THREE.SphereGeometry(0.06, 32, 32)
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 1 })
    group.add(new THREE.Mesh(coreGeom, coreMat))

    // Outer glow
    const glowGeom = new THREE.SphereGeometry(0.1, 32, 32)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5 })
    group.add(new THREE.Mesh(glowGeom, glowMat))

    // Pulsing rings
    for (let i = 0; i < 3; i++) {
      const ringGeom = new THREE.RingGeometry(0.12 + i * 0.08, 0.14 + i * 0.08, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0xffcc00 : 0xff6600,
        transparent: true,
        opacity: 0.5 - i * 0.12,
        side: THREE.DoubleSide
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ring.userData = { phase: i * Math.PI / 1.5 }
      group.add(ring)
    }

    // Label
    const label = createTextSprite(name, new THREE.Vector3(0, 0.35, 0), '#ffcc00', 0.28, 1)
    group.add(label)

    scene.add(group)
    return group
  }, [createTextSprite])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500)
    camera.position.set(0, 0, 9)
    cameraRef.current = camera

    // Renderer with alpha
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.rotateSpeed = 0.5
    controls.zoomSpeed = 1.2
    controls.minDistance = 3
    controls.maxDistance = 20
    controls.enablePan = true
    controls.panSpeed = 0.5
    controlsRef.current = controls

    // Load provinces and create particles
    loadProvincesAndGenerateParticles(scene).then(() => {
      setIsLoaded(true)
    })

    // Animation
    const clock = new THREE.Clock()
    let frameId: number

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      controls.update()

      // Update shader
      if (particlesRef.current) {
        const mat = particlesRef.current.material as THREE.ShaderMaterial
        if (mat.uniforms) mat.uniforms.time.value = t
      }

      // Animate highlight marker
      if (highlightMarkerRef.current) {
        highlightMarkerRef.current.children.forEach((child, i) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry instanceof THREE.RingGeometry) {
              const phase = child.userData.phase || 0
              const pulse = Math.sin(t * 3 + phase) * 0.5 + 0.5
              child.scale.setScalar(1 + pulse * 0.3)
              child.material.opacity = 0.3 + pulse * 0.3
            } else if (child.geometry instanceof THREE.SphereGeometry) {
              if (i === 0) {
                child.material.opacity = 0.8 + Math.sin(t * 4) * 0.2
              } else {
                child.scale.setScalar(1 + Math.sin(t * 3) * 0.15)
              }
            }
          }
        })
      }

      renderer.render(scene, camera)
    }

    animate()

    // Resize
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [loadProvincesAndGenerateParticles])

  // Handle highlight location
  useEffect(() => {
    const scene = sceneRef.current
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!scene || !isLoaded) return

    // Remove old marker
    if (highlightMarkerRef.current) {
      scene.remove(highlightMarkerRef.current)
      highlightMarkerRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material?.dispose()
          }
        }
      })
      highlightMarkerRef.current = null
    }

    if (highlightLocation && camera && controls) {
      const marker = createHighlightMarker(
        scene,
        highlightLocation.latitude,
        highlightLocation.longitude,
        highlightLocation.locationName || highlightLocation.locationId
      )
      highlightMarkerRef.current = marker

      // Animate camera
      const { x, y } = geoToScene(highlightLocation.longitude, highlightLocation.latitude, 0.55)

      const targetPos = new THREE.Vector3(x, y - 0.6, 4)
      const startPos = camera.position.clone()

      let progress = 0
      const animateCamera = () => {
        progress += 0.02
        if (progress < 1) {
          camera.position.lerpVectors(startPos, targetPos, progress)
          controls.target.lerp(new THREE.Vector3(x, y, 0), progress)
          controls.update()
          requestAnimationFrame(animateCamera)
        }
      }
      animateCamera()
    }
  }, [highlightLocation, isLoaded, createHighlightMarker])

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Red gradient background like welcome page */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-950 to-slate-900" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50" />

      {/* Three.js canvas container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="relative w-24 h-24 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-red-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-red-400 text-sm font-medium">{loadingStatus}</p>
          <div className="w-48 h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-white/50 text-xs mt-2">{loadingProgress}%</p>
        </div>
      )}

      {/* Controls hint */}
      {isLoaded && (
        <div className="absolute bottom-4 left-4 z-20 text-white/50 text-xs bg-black/30 backdrop-blur-sm rounded-lg p-3 space-y-1">
          <p><span className="text-white/70">Cuộn:</span> Phóng to/Thu nhỏ</p>
          <p><span className="text-white/70">Kéo chuột:</span> Xoay</p>
          <p><span className="text-white/70">Chuột phải:</span> Di chuyển</p>
        </div>
      )}
    </div>
  )
}
