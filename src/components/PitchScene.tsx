import { useEffect, useMemo, useRef } from 'react';
import { Canvas, type ThreeEvent, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Lane } from '../logic/passing';
import type { Player, Point2 } from '../data/football';

export type PassAnimation = {
  id: number;
  from: Point2;
  to: Point2;
};

interface Props {
  players: Player[];
  opponents: Player[];
  selectedId: number;
  selectedPlayer: Player;
  lanes: Lane[];
  view: 'broadcast' | 'overhead';
  showLanes: boolean;
  showPressure: boolean;
  draggingId: number | null;
  animation: PassAnimation | null;
  onSelect: (id: number) => void;
  onMove: (id: number, point: Point2) => void;
  onDragging: (id: number | null) => void;
  onPassDone: () => void;
}

const FIELD_COLOR = '#102f22';
const HOME = '#b7fa6b';
const AWAY = '#ff806c';
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function RectangleLines({ width, depth, z = 0, color = '#d3e9d6', opacity = 0.58 }: {
  width: number; depth: number; z?: number; color?: string; opacity?: number;
}) {
  const x = width / 2;
  const d = depth / 2;
  return <Line
    points={[[-x, 0.045, z - d], [x, 0.045, z - d], [x, 0.045, z + d], [-x, 0.045, z + d], [-x, 0.045, z - d]]}
    color={color} transparent opacity={opacity} lineWidth={1.45}
  />;
}

function Field() {
  const midCircle = useMemo(() => Array.from({ length: 85 }, (_, index) => {
    const radians = (index / 84) * Math.PI * 2;
    return [Math.cos(radians) * 6.4, 0.055, Math.sin(radians) * 6.4] as [number, number, number];
  }), []);
  return <group>
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
      <planeGeometry args={[61, 88]} />
      <meshStandardMaterial color="#071b14" roughness={0.97} />
    </mesh>
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 0]}>
      <planeGeometry args={[46.1, 70.1]} />
      <meshStandardMaterial color={FIELD_COLOR} roughness={0.94} metalness={0.03} />
    </mesh>
    {Array.from({ length: 10 }, (_, index) => (
      <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.023, -31.5 + index * 7]}>
        <planeGeometry args={[46, 7]} />
        <meshBasicMaterial color={index % 2 ? '#193b2a' : '#204631'} transparent opacity={0.32} depthWrite={false} />
      </mesh>
    ))}
    <RectangleLines width={45} depth={69} />
    <Line points={[[-22.5, .05, 0], [22.5, .05, 0]]} color="#d3e9d6" transparent opacity={.55} lineWidth={1.4} />
    <Line points={midCircle} color="#d3e9d6" transparent opacity={.54} lineWidth={1.45} />
    {[1, -1].map((side) => <group key={side}>
      <RectangleLines width={27} depth={12} z={side * 28.5} />
      <RectangleLines width={12} depth={5} z={side * 32} />
      <mesh position={[0, .06, side * 24]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[.22, 18]} /><meshBasicMaterial color="#dfedde" />
      </mesh>
    </group>)}
    <mesh position={[0, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[.22, 18]} /><meshBasicMaterial color="#dfedde" />
    </mesh>
    <Goal z={35} />
    <Goal z={-35} />
    {/* Soft luminous boundary outside the playing area. */}
    <RectangleLines width={48.1} depth={72} color="#8fee9b" opacity={0.11} />
    <GroundDecor />
  </group>;
}

function Goal({ z }: { z: number }) {
  const outward = z > 0 ? 1 : -1;
  return <group>
    <mesh position={[-2.44, .9, z]}><boxGeometry args={[.12, 1.8, .13]} /><meshStandardMaterial color="#d7e9da" emissive="#b5ddc2" emissiveIntensity={0.25} /></mesh>
    <mesh position={[2.44, .9, z]}><boxGeometry args={[.12, 1.8, .13]} /><meshStandardMaterial color="#d7e9da" emissive="#b5ddc2" emissiveIntensity={0.25} /></mesh>
    <mesh position={[0, 1.8, z]}><boxGeometry args={[5.0, .12, .13]} /><meshStandardMaterial color="#d7e9da" /></mesh>
    <mesh position={[0, 1.8, z + outward * 1.9]}><boxGeometry args={[5.0, .04, .04]} /><meshStandardMaterial color="#8ca99b" transparent opacity={.7} /></mesh>
    {[-2, -1, 0, 1, 2].map(x =>
      <Line key={x} points={[[x, .06, z + outward * 2], [x, 1.8, z + outward * 1.9], [x, 1.8, z]]} color="#b3c9bd" transparent opacity={.22} lineWidth={.7} />
    )}
  </group>;
}

function GroundDecor() {
  return <group>
    {[-1, 1].flatMap(side => [-1, 1].map(end => {
      const x = side * 27.5;
      const z = end * 40;
      return <group key={`${side}-${end}`} position={[x, 0, z]}>
        <mesh position={[0, 4, 0]}><cylinderGeometry args={[.075, .12, 8, 8]} /><meshStandardMaterial color="#375548" metalness={.8} roughness={.25} /></mesh>
        <mesh position={[0, 8.1, 0]}><boxGeometry args={[3.5, .5, 1.1]} /><meshStandardMaterial color="#8ce2bb" emissive="#7ee0ad" emissiveIntensity={.5} /></mesh>
        <pointLight position={[0, 8, 0]} color="#a9ffcb" intensity={20} distance={32} decay={2} />
      </group>;
    }))}
    {Array.from({ length: 28 }, (_, i) => {
      const z = -39 + i * (78 / 27);
      return <group key={`sideline-${i}`}>
        {[-26.5, 26.5].map(x => <mesh key={x} position={[x, .04, z]}>
          <boxGeometry args={[.12, .025, .9]} />
          <meshBasicMaterial color="#456d56" transparent opacity={.38} />
        </mesh>)}
      </group>;
    })}
  </group>;
}

interface MarkerProps {
  player: Player;
  opponent?: boolean;
  selected?: boolean;
  showPressure?: boolean;
  dragging: boolean;
  onSelect?: (id: number) => void;
  onMove?: (id: number, point: Point2) => void;
  onDragging?: (id: number | null) => void;
}

function PlayerMarker({ player, opponent = false, selected = false, showPressure = false, dragging, onSelect, onMove, onDragging }: MarkerProps) {
  const handleDown = (event: ThreeEvent<PointerEvent>) => {
    if (opponent) return;
    event.stopPropagation();
    onSelect?.(player.id);
    onDragging?.(player.id);
    event.target.setPointerCapture(event.pointerId);
  };
  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging || opponent) return;
    event.stopPropagation();
    const hit = new THREE.Vector3();
    if (event.ray.intersectPlane(groundPlane, hit)) {
      onMove?.(player.id, { x: hit.x, z: hit.z });
    }
  };
  const handleUp = (event: ThreeEvent<PointerEvent>) => {
    if (opponent) return;
    event.stopPropagation();
    onDragging?.(null);
    if (event.target.hasPointerCapture(event.pointerId)) {
      event.target.releasePointerCapture(event.pointerId);
    }
  };
  const color = opponent ? AWAY : HOME;
  return <group
    position={[player.point.x, 0, player.point.z]}
    onPointerDown={handleDown}
    onClick={(event) => { event.stopPropagation(); }}
    onPointerMove={handleMove}
    onPointerUp={handleUp}
    onPointerOver={() => { if (!opponent) document.body.style.cursor = 'grab'; }}
    onPointerOut={() => { document.body.style.cursor = 'auto'; }}
  >
    {showPressure && opponent && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .035, 0]}>
      <ringGeometry args={[3.0, 3.18, 40]} />
      <meshBasicMaterial color={AWAY} transparent opacity={.24} depthWrite={false} />
    </mesh>}
    {selected && <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .12, 0]}>
        <ringGeometry args={[1.47, 1.62, 48]} />
        <meshBasicMaterial color="#e3ffa6" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.7, 0]} color="#b9ff75" intensity={2.5} distance={5} />
    </>}
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, .075, 0]}>
      <circleGeometry args={[1.08, 24]} />
      <meshBasicMaterial color="#030e0a" transparent opacity={.65} />
    </mesh>
    <mesh castShadow position={[0, .40, 0]}>
      <cylinderGeometry args={[.77, .84, .66, 28]} />
      <meshStandardMaterial color={color} roughness={.36} metalness={.16} emissive={color} emissiveIntensity={opponent ? .06 : .13} />
    </mesh>
    <mesh position={[0, .75, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[.63, 32]} />
      <meshBasicMaterial color={opponent ? '#462820' : '#28482c'} />
    </mesh>
    <Html position={[0, .93, 0]} center distanceFactor={90} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <span className={`jersey-number ${opponent ? 'opposition-number' : ''}`}>{player.id}</span>
    </Html>
    {selected && <Html position={[0, 2.7, 0]} center distanceFactor={90} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="player-float-label">{player.name} <span>{player.role}</span></div>
    </Html>}
  </group>;
}

function PassingArc({ from, to, score }: { from: Point2; to: Point2; score: number }) {
  const points = useMemo(() => {
    const a = new THREE.Vector3(from.x, .21, from.z);
    const b = new THREE.Vector3(to.x, .21, to.z);
    const middle = a.clone().lerp(b, .5);
    middle.y = .44 + a.distanceTo(b) * .022;
    return new THREE.QuadraticBezierCurve3(a, middle, b).getPoints(35);
  }, [from.x, from.z, to.x, to.z]);
  return <Line points={points} color={score >= 70 ? '#b9fa70' : score >= 50 ? '#7bdbc8' : '#66897d'} transparent opacity={score >= 70 ? .81 : .35} lineWidth={score >= 70 ? 2.1 : 1.1} />;
}

function TravelingBall({ animation, onDone }: { animation: PassAnimation; onDone: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  const completed = useRef(false);
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(animation.from.x, .85, animation.from.z),
    new THREE.Vector3(
      (animation.from.x + animation.to.x) / 2,
      1.7 + Math.hypot(animation.to.x - animation.from.x, animation.to.z - animation.from.z) * .058,
      (animation.from.z + animation.to.z) / 2,
    ),
    new THREE.Vector3(animation.to.x, .85, animation.to.z),
  ), [animation]);
  useFrame((_, delta) => {
    if (!ref.current || completed.current) return;
    elapsed.current += Math.min(delta, .06);
    const t = Math.min(1, elapsed.current / 1.25);
    ref.current.position.copy(curve.getPoint(t * t * (3 - 2 * t)));
    ref.current.rotation.x += delta * 10;
    if (t >= 1) {
      completed.current = true;
      onDone();
    }
  });
  return <mesh ref={ref}>
    <sphereGeometry args={[.54, 20, 20]} />
    <meshStandardMaterial color="#f4fff0" roughness={.32} metalness={.1} emissive="#cdffad" emissiveIntensity={.4} />
  </mesh>;
}

function PitchInteraction({ selectedId, onMove, players, draggingId }: Pick<Props, 'selectedId' | 'onMove' | 'players' | 'draggingId'>) {
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .011, 0]} onClick={(event) => {
    if (draggingId !== null || !players.some(player => player.id === selectedId)) return;
    event.stopPropagation();
    onMove(selectedId, { x: event.point.x, z: event.point.z });
  }}>
    <planeGeometry args={[46, 70]} />
    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
  </mesh>;
}

function Scene(props: Props) {
  const {
    players, opponents, selectedId, selectedPlayer, lanes, showLanes, showPressure,
    draggingId, animation, onSelect, onMove, onDragging, onPassDone,
  } = props;
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => {
    if (controls.current) controls.current.target.set(0, 0, 0);
  }, []);
  return <>
    <color attach="background" args={['#06140f']} />
    <fog attach="fog" args={['#06140f', 100, 188]} />
    <ambientLight intensity={1.55} color="#cfefd6" />
    <directionalLight position={[-22, 50, 25]} intensity={2.1} color="#f0fff0" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <directionalLight position={[30, 20, -32]} intensity={.7} color="#8dffbb" />
    <Field />
    <PitchInteraction selectedId={selectedId} players={players} draggingId={draggingId} onMove={onMove} />
    {showLanes && lanes.slice(0, 8).map(lane => <PassingArc
      key={lane.receiver.id} from={selectedPlayer.point} to={lane.receiver.point} score={lane.score}
    />)}
    {opponents.map(player => <PlayerMarker key={`away-${player.id}`} player={player} opponent showPressure={showPressure} dragging={false} />)}
    {players.map(player => <PlayerMarker
      key={`home-${player.id}`} player={player} selected={selectedId === player.id}
      dragging={draggingId === player.id} onSelect={onSelect} onMove={onMove} onDragging={onDragging}
    />)}
    {animation && <TravelingBall key={animation.id} animation={animation} onDone={onPassDone} />}
    <OrbitControls
      ref={controls} makeDefault enableDamping dampingFactor={.085}
      enabled={draggingId === null}
      enablePan={false} minDistance={42} maxDistance={145}
      minPolarAngle={.01} maxPolarAngle={Math.PI * .445}
      minAzimuthAngle={-Math.PI * .8} maxAzimuthAngle={Math.PI * .8}
    />
  </>;
}

export default function PitchScene(props: Props) {
  return <Canvas
    key={props.view}
    dpr={[1, 1.75]}
    shadows
    camera={{
      position: props.view === 'broadcast' ? [49, 73, 83] : [0, 100, .01],
      fov: 43, near: .1, far: 250,
    }}
    gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    fallback={<div className="webgl-fallback">WebGL is unavailable in this browser. Try an up-to-date desktop browser with hardware acceleration enabled.</div>}
  >
    <Scene {...props} />
  </Canvas>;
}
