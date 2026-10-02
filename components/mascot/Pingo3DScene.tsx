"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type Pingo3DPose = "idle" | "wave" | "celebrate" | "think";

interface SceneProps {
  pose: Pingo3DPose;
  reduced: boolean;
  interactive: boolean;
  active: boolean;
  onReady: () => void;
}

const BODY = { x: 1.0, y: 1.15, z: 0.9 };
const CYAN = "#00d5ff";
const NAVY = "#0a1330";
const NAVY_HEAD = "#0d1a3d";
const WHITE = "#f4f8ff";
const ORANGE = "#ff9f1c";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const easeOutBack = (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);

function surfaceCurve(x: number, y0: number, y1: number, steps = 18) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const y = y0 + ((y1 - y0) * i) / steps;
    const k = 1 - (x / BODY.x) ** 2 - (y / BODY.y) ** 2;
    points.push(new THREE.Vector3(x * 1.012, y, BODY.z * Math.sqrt(Math.max(k, 0)) * 1.012));
  }
  return new THREE.CatmullRomCurve3(points);
}

function shieldPath(scale: number, path: THREE.Path | THREE.Shape) {
  const s = scale;
  path.moveTo(0, 1 * s);
  path.lineTo(0.8 * s, 0.78 * s);
  path.lineTo(0.8 * s, 0.1 * s);
  path.bezierCurveTo(0.8 * s, -0.45 * s, 0.4 * s, -0.8 * s, 0, -1 * s);
  path.bezierCurveTo(-0.4 * s, -0.8 * s, -0.8 * s, -0.45 * s, -0.8 * s, 0.1 * s);
  path.lineTo(-0.8 * s, 0.78 * s);
  path.closePath();
  return path;
}

function glowTexture(inner: string, mid: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.5, mid);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      room.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Rig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0.62, 0);
  }, [camera]);
  return null;
}

function Mascot({ pose, reduced, interactive, active, onReady }: SceneProps) {
  const root = useRef<THREE.Group>(null);
  const turn = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Group>(null);
  const eyeR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Group>(null);
  const dust = useRef<THREE.Points>(null);
  const { gl, invalidate } = useThree();

  const state = useRef({
    pointer: { x: 0, y: 0 },
    hovered: false,
    burst: 0,
    intro: reduced ? 1 : 0,
    nextBlink: 1.8,
    blinkStart: -1,
    frames: 0,
    ready: false,
    ry: 0,
  });

  const materials = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({ color: NAVY, roughness: 0.42, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.35 }),
      head: new THREE.MeshPhysicalMaterial({ color: NAVY_HEAD, roughness: 0.34, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
      white: new THREE.MeshPhysicalMaterial({ color: WHITE, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
      beak: new THREE.MeshPhysicalMaterial({ color: ORANGE, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
      eye: new THREE.MeshPhysicalMaterial({ color: "#050816", roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }),
      spark: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
      trim: new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 1.6, roughness: 0.3 }),
      emblem: new THREE.MeshStandardMaterial({ color: CYAN, emissive: CYAN, emissiveIntensity: 1.9, roughness: 0.25 }),
    }),
    [],
  );

  const glows = useMemo(
    () => ({
      floor: glowTexture("rgba(0,213,255,0.62)", "rgba(0,120,255,0.2)"),
      back: glowTexture("rgba(120,90,255,0.45)", "rgba(0,160,255,0.14)"),
    }),
    [],
  );

  const geometry = useMemo(() => {
    const shield = new THREE.Shape();
    shieldPath(1, shield);
    const hole = new THREE.Path();
    shieldPath(0.72, hole);
    shield.holes.push(hole);
    const core = new THREE.Shape();
    shieldPath(0.34, core);
    const extrude = { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 14 };

    const dustPoints = new Float32Array(48 * 3);
    for (let i = 0; i < 48; i += 1) {
      const angle = (i / 48) * Math.PI * 2 * 3.7;
      const radius = 1.7 + ((i * 37) % 11) / 11 * 1.1;
      dustPoints[i * 3] = Math.cos(angle) * radius;
      dustPoints[i * 3 + 1] = -0.9 + ((i * 53) % 29) / 29 * 3.9;
      dustPoints[i * 3 + 2] = Math.sin(angle) * radius * 0.6 - 0.3;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPoints, 3));

    return {
      emblem: new THREE.ExtrudeGeometry(shield, extrude),
      emblemCore: new THREE.ExtrudeGeometry(core, { ...extrude, depth: 0.04 }),
      zipper: new THREE.TubeGeometry(surfaceCurve(0, -0.92, 0.82), 28, 0.02, 8, false),
      seamL: new THREE.TubeGeometry(surfaceCurve(-0.7, -0.75, 0.5), 24, 0.016, 8, false),
      seamR: new THREE.TubeGeometry(surfaceCurve(0.7, -0.75, 0.5), 24, 0.016, 8, false),
      dust: dustGeometry,
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
      Object.values(glows).forEach((texture) => texture.dispose());
      Object.values(geometry).forEach((item) => item.dispose());
    },
    [materials, glows, geometry],
  );

  useEffect(() => {
    if (!interactive || reduced) return undefined;
    const onMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.35;
      state.current.pointer.x = clamp((event.clientX - cx) / 520, -1, 1);
      state.current.pointer.y = clamp((event.clientY - cy) / 420, -1, 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [gl, interactive, reduced]);

  useEffect(() => {
    if (reduced) invalidate();
  }, [reduced, pose, invalidate]);

  useFrame((frame, rawDelta) => {
    const s = state.current;
    const delta = Math.min(rawDelta, 0.05);
    const t = frame.clock.elapsedTime;
    const D = THREE.MathUtils.damp;

    if (!active && !reduced) return;

    s.frames += 1;
    if (!s.ready && s.frames > 3) {
      s.ready = true;
      onReady();
    }

    if (s.intro < 1) s.intro = Math.min(1, s.intro + delta / 1.15);
    const eased = easeOutBack(s.intro);
    s.burst = Math.max(0, s.burst - delta);

    const celebrating = pose === "celebrate";
    const waving = pose === "wave" || s.hovered || s.burst > 0;
    const thinking = pose === "think";
    const calm = reduced;

    const r = root.current;
    if (r) {
      const hop = calm ? 0 : celebrating ? Math.abs(Math.sin(t * 5)) * 0.34 : s.burst > 0 ? Math.sin((1 - s.burst / 1.4) * Math.PI) * 0.55 : 0;
      const float = calm ? 0 : Math.sin(t * 1.4) * 0.07;
      r.position.y = float + hop + (1 - eased) * 1.1;
      r.scale.setScalar(0.5 + 0.5 * eased);
    }

    const t1 = turn.current;
    if (t1) {
      const spin = (1 - eased) * -Math.PI * 1.2;
      const px = calm ? 0 : s.pointer.x;
      const burstSpin = s.burst > 0 ? (1 - s.burst / 1.4) * Math.PI * 2 : 0;
      s.ry = D(s.ry, px * 0.28 + (calm ? 0.3 : 0), 5, delta);
      t1.rotation.y = s.ry + spin + (celebrating ? Math.sin(t * 2.4) * 0.35 : 0) + burstSpin;
    }

    const h = head.current;
    if (h) {
      const px = calm ? 0 : s.pointer.x;
      const py = calm ? 0 : s.pointer.y;
      h.rotation.y = D(h.rotation.y, px * 0.55, 6, delta);
      h.rotation.x = D(h.rotation.x, clamp(py * 0.28, -0.22, 0.3) + (thinking ? -0.16 : 0) + (celebrating ? -0.12 : 0), 6, delta);
      h.rotation.z = D(h.rotation.z, (thinking ? 0.2 : 0) - px * 0.06, 5, delta);
    }

    const happy = celebrating || s.burst > 0 ? 0.42 : 1;
    const blinkNow = t > s.nextBlink;
    if (blinkNow && !calm) {
      s.blinkStart = t;
      s.nextBlink = t + 2.4 + ((Math.sin(t * 12.9898) + 1) / 2) * 3;
    }
    const sinceBlink = t - s.blinkStart;
    const blink = s.blinkStart >= 0 && sinceBlink < 0.16 ? Math.sin((sinceBlink / 0.16) * Math.PI) : 0;
    const eyeY = Math.max(0.08, (1 - 0.9 * blink) * happy);
    eyeL.current?.scale.set(1, eyeY, 1);
    eyeR.current?.scale.set(1, eyeY, 1);

    const ar = armR.current;
    const al = armL.current;
    if (ar && al) {
      const bothUp = celebrating || s.burst > 0;
      const rightTarget = waving || bothUp ? 2.45 + (calm ? 0 : Math.sin(t * 9) * 0.28) : 0.4 + (calm ? 0 : Math.sin(t * 1.4) * 0.04);
      const leftTarget = bothUp ? -2.45 - (calm ? 0 : Math.sin(t * 9 + 1) * 0.28) : -0.4 - (calm ? 0 : Math.sin(t * 1.4 + 1) * 0.04);
      ar.rotation.z = D(ar.rotation.z, rightTarget, calm ? 20 : 9, delta);
      al.rotation.z = D(al.rotation.z, leftTarget, calm ? 20 : 9, delta);
    }

    if (body.current && !calm) body.current.scale.y = 1.15 + Math.sin(t * 2) * 0.012;
    if (halo.current && !calm) halo.current.rotation.z = t * 0.35;
    if (dust.current && !calm) dust.current.rotation.y = t * 0.12;
  });

  const onOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    state.current.hovered = true;
    gl.domElement.style.cursor = "pointer";
  };
  const onOut = () => {
    state.current.hovered = false;
    gl.domElement.style.cursor = "";
  };
  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    state.current.burst = 1.4;
    invalidate();
  };

  const m = materials;
  return (
    <>
      <mesh position={[0, 0.9, -2.2]} renderOrder={-2}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial map={glows.back} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh position={[0, -1.32, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[5.2, 5.2]} />
        <meshBasicMaterial map={glows.floor} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <group position={[0, -1.3, 0]} rotation={[-Math.PI / 2, 0, 0]} ref={halo}>
        <mesh>
          <torusGeometry args={[1.5, 0.014, 8, 96]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.55} toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.9, 0.02, 8, 96, Math.PI * 1.1]} />
          <meshBasicMaterial color="#9a64ff" transparent opacity={0.7} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[1.9, 0.02, 8, 96, Math.PI * 0.45]} />
          <meshBasicMaterial color="#3efa95" transparent opacity={0.65} toneMapped={false} />
        </mesh>
      </group>
      <points ref={dust} geometry={geometry.dust}>
        <pointsMaterial color="#8be9ff" size={0.05} sizeAttenuation transparent opacity={0.8} depthWrite={false} toneMapped={false} />
      </points>

      <group ref={root} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <group ref={turn}>
          <mesh ref={body} scale={[BODY.x, BODY.y, BODY.z]} material={m.body}>
            <sphereGeometry args={[1, 56, 40]} />
          </mesh>
          <mesh geometry={geometry.zipper} material={m.trim} />
          <mesh geometry={geometry.seamL} material={m.trim} />
          <mesh geometry={geometry.seamR} material={m.trim} />
          <mesh geometry={geometry.emblem} material={m.emblem} position={[0, 0.2, 0.84]} scale={[0.3, 0.3, 1]} rotation={[0.06, 0, 0]} />
          <mesh geometry={geometry.emblemCore} material={m.emblem} position={[0, 0.2, 0.855]} scale={[0.3, 0.3, 1]} rotation={[0.06, 0, 0]} />
          <mesh position={[0, 0.98, 0.04]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.8]} material={m.head}>
            <torusGeometry args={[0.76, 0.24, 24, 64]} />
          </mesh>

          <group ref={head} position={[0, 1.55, 0]}>
            <mesh scale={[1.06, 0.96, 0.96]} material={m.head}>
              <sphereGeometry args={[0.92, 56, 40]} />
            </mesh>
            <mesh position={[0, 0.02, 0.4]} rotation={[0, 0, -Math.PI * 0.25]} scale={[1.02, 1.07, 1]} material={m.trim}>
              <torusGeometry args={[0.8, 0.05, 12, 72, Math.PI * 1.5]} />
            </mesh>
            <mesh position={[-0.33, 0.0, 0.5]} scale={[1, 1.08, 0.56]} material={m.white}>
              <sphereGeometry args={[0.5, 40, 32]} />
            </mesh>
            <mesh position={[0.33, 0.0, 0.5]} scale={[1, 1.08, 0.56]} material={m.white}>
              <sphereGeometry args={[0.5, 40, 32]} />
            </mesh>
            <mesh position={[0, -0.22, 0.52]} scale={[1.15, 1, 0.5]} material={m.white}>
              <sphereGeometry args={[0.5, 40, 32]} />
            </mesh>

            <group ref={eyeL} position={[-0.3, 0.04, 0.8]}>
              <mesh scale={[1, 1.28, 0.7]} material={m.eye}>
                <sphereGeometry args={[0.135, 28, 24]} />
              </mesh>
              <mesh position={[0.045, 0.07, 0.085]} material={m.spark}>
                <sphereGeometry args={[0.036, 12, 10]} />
              </mesh>
            </group>
            <group ref={eyeR} position={[0.3, 0.04, 0.8]}>
              <mesh scale={[1, 1.28, 0.7]} material={m.eye}>
                <sphereGeometry args={[0.135, 28, 24]} />
              </mesh>
              <mesh position={[0.045, 0.07, 0.085]} material={m.spark}>
                <sphereGeometry args={[0.036, 12, 10]} />
              </mesh>
            </group>
            <mesh position={[-0.32, 0.27, 0.78]} rotation={[0, 0, 0.32]} material={m.eye}>
              <capsuleGeometry args={[0.025, 0.2, 4, 10]} />
            </mesh>
            <mesh position={[0.32, 0.27, 0.78]} rotation={[0, 0, -0.32]} material={m.eye}>
              <capsuleGeometry args={[0.025, 0.2, 4, 10]} />
            </mesh>

            <mesh position={[0, -0.18, 0.93]} rotation={[Math.PI / 2, 0, 0]} scale={[1.45, 1, 0.56]} material={m.beak}>
              <coneGeometry args={[0.17, 0.36, 28]} />
            </mesh>
            <mesh position={[0, -0.28, 0.9]} rotation={[Math.PI / 2, 0, 0]} scale={[1.1, 1, 0.4]} material={m.beak}>
              <coneGeometry args={[0.14, 0.26, 24]} />
            </mesh>

            <mesh position={[0.02, 0.98, -0.08]} rotation={[-0.62, 0, -0.32]} material={m.head}>
              <capsuleGeometry args={[0.15, 0.55, 8, 16]} />
            </mesh>
            <mesh position={[0.12, 0.88, 0.0]} rotation={[-0.62, 0, -0.32]} material={m.trim} scale={[0.35, 1, 0.35]}>
              <capsuleGeometry args={[0.1, 0.5, 4, 10]} />
            </mesh>
          </group>

          <group ref={armR} position={[1.0, 0.55, 0.06]} rotation={[0, 0, 0.4]}>
            <mesh position={[0, -0.45, 0]} material={m.body}>
              <capsuleGeometry args={[0.21, 0.78, 10, 20]} />
            </mesh>
            <mesh position={[0, -0.86, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.trim}>
              <torusGeometry args={[0.215, 0.032, 10, 32]} />
            </mesh>
            <mesh position={[0, -1.02, 0]} material={m.head}>
              <sphereGeometry args={[0.18, 20, 16]} />
            </mesh>
          </group>
          <group ref={armL} position={[-1.0, 0.55, 0.06]} rotation={[0, 0, -0.4]}>
            <mesh position={[0, -0.45, 0]} material={m.body}>
              <capsuleGeometry args={[0.21, 0.78, 10, 20]} />
            </mesh>
            <mesh position={[0, -0.86, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.trim}>
              <torusGeometry args={[0.215, 0.032, 10, 32]} />
            </mesh>
            <mesh position={[0, -1.02, 0]} material={m.head}>
              <sphereGeometry args={[0.18, 20, 16]} />
            </mesh>
          </group>

          <mesh position={[-0.46, -1.15, 0.5]} scale={[0.52, 0.17, 0.78]} material={m.beak}>
            <sphereGeometry args={[0.5, 24, 16]} />
          </mesh>
          <mesh position={[0.46, -1.15, 0.5]} scale={[0.52, 0.17, 0.78]} material={m.beak}>
            <sphereGeometry args={[0.5, 24, 16]} />
          </mesh>
        </group>
      </group>
    </>
  );
}

export default function Pingo3DScene(props: SceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.95, 8.8], fov: 32, near: 0.1, far: 40 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      frameloop={props.reduced ? "demand" : props.active ? "always" : "never"}
      style={{ background: "transparent" }}
    >
      <Rig />
      <Environment />
      <ambientLight intensity={0.45} color="#6f8cff" />
      <directionalLight position={[2.6, 4, 5]} intensity={2.3} color="#fff3e6" />
      <directionalLight position={[-4.5, 2.4, -2.6]} intensity={3.4} color="#00d5ff" />
      <directionalLight position={[4.5, 0.2, -3]} intensity={2.4} color="#9a64ff" />
      <pointLight position={[0, -0.6, 3.4]} intensity={9} distance={9} color="#3ea9ff" />
      <Mascot {...props} />
    </Canvas>
  );
}
