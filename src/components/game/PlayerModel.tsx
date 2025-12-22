
// import { useGLTF, useAnimations } from '@react-three/drei';
// import { useFrame } from '@react-three/fiber';
// import { useEffect, useRef, useState } from 'react';
// import * as THREE from 'three';

// /* -------------------------------------------------------------------------- */
// /*                                   CONFIG                                   */
// /* -------------------------------------------------------------------------- */

// const LANE_WIDTH = 2.2;
// const LANES_X    = [-LANE_WIDTH, 0, LANE_WIDTH];  // L | C | R

// const CHANGE_SPEED     = 10;   // higher → snappier lane switch
// const MAX_ANIM_DELTA   = 0.1;  // clamp mixer update

// /* -------------------------------------------------------------------------- */
// export interface PlayerModelProps {
//   posRef:   React.MutableRefObject<THREE.Vector3>;  // shared position vec
//   obstacles: THREE.Object3D[];
//   onHit:    () => void;
// }

// export default function PlayerModel({ posRef, obstacles, onHit }: PlayerModelProps) {
//   /* refs & state ---------------------------------------------------------- */
//   const group      = useRef<THREE.Group>(null);
//   const [lane, setLane] = useState(1);   // start centre lane

//   /* load mesh + animation ------------------------------------------------- */
//   const { scene, animations }   = useGLTF('/models/Running-2.glb');
//   const { actions, mixer }      = useAnimations(animations, group);

//   useEffect(() => {
//     const run = actions['Run'] ?? Object.values(actions)[0];
//     run?.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.1).play();
//   }, [actions]);

//   /* keyboard controls ----------------------------------------------------- */
//   useEffect(() => {
//     const key = (e: KeyboardEvent) => {
//       if (e.key === 'ArrowLeft' && lane > 0) setLane(l => l - 1);
//       if (e.key === 'ArrowRight' && lane < 2) setLane(l => l + 1);
//       if (e.key === 'a' || e.key === 'A' && lane > 0) setLane(l => l - 1);
//       if (e.key === 'd' || e.key === 'D' && lane < 2) setLane(l => l + 1);
//     };
//     window.addEventListener('keydown', key);
//     return () => window.removeEventListener('keydown', key);
//   }, [lane]);

//   /* game loop ------------------------------------------------------------- */
//   useFrame((_, dt) => {
//     const g = group.current;
//     if (!g) return;

//     /* smooth lane change -------------------------------------------------- */
//     g.position.x = THREE.MathUtils.damp(g.position.x, LANES_X[lane], CHANGE_SPEED, dt);

//     /* keep runner aligned ------------------------------------------------- */
//     g.position.y = -1;
//     g.position.z = posRef.current.z; // Follow the shared position
//     g.rotation.set(0, 0, 0); // Face forward
//     g.scale.setScalar(0.7);

//     /* expose world position to other systems ----------------------------- */
//     posRef.current.x = g.position.x;
//     posRef.current.y = g.position.y;
//     // z is controlled by the game logic

//     /* advance animation mixer -------------------------------------------- */
//     mixer?.update(Math.min(dt, MAX_ANIM_DELTA));
//   });

//   /* render --------------------------------------------------------------- */
//   return (
//     <group ref={group}>
//       <primitive object={scene} />
//     </group>
//   );
// }

// useGLTF.preload('/models/Running-2.glb');

// import { useGLTF, useAnimations } from '@react-three/drei';
// import { useFrame } from '@react-three/fiber';
// import { useEffect, useRef, useState } from 'react';
// import * as THREE from 'three';

// const LANES_X = [-1.5, 0, 1.5];      // x-positions of L | C | R lanes
// const CHANGE_SPEED = 8;              // larger = snappier lane switch
// const ANIM_FPS_CLAMP = 0.1;          // cap delta for mixer

// export default function PlayerModel({
//   posRef,           // << NEW – shared positional Vector3
//   obstacles,
//   onHit,
// }: {
//   posRef: React.MutableRefObject<THREE.Vector3>;
//   obstacles: THREE.Object3D[];
//   onHit: () => void;
// }) {
//   const group = useRef<THREE.Group>(null);
//   const [lane, setLane] = useState(1);               // 0=L,1=C,2=R
//   const lastHitRef = useRef(0);

//   /* load & set up animation ---------------------------------------------- */
//   const { scene, animations } = useGLTF('/models/Running.glb');
//   const { actions, mixer } = useAnimations(animations, group);

//   useEffect(() => {
//     const run = actions['Run'] ?? Object.values(actions)[0];
//     run?.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.1).play();
//   }, [actions]);

//   /* keyboard lane-switch handler ------------------------------------------ */
//   useEffect(() => {
//     const handle = (e: KeyboardEvent) => {
//       if (e.key === 'ArrowLeft' && lane > 0) setLane(l => l - 1);
//       if (e.key === 'ArrowRight' && lane < 2) setLane(l => l + 1);
//     };
//     window.addEventListener('keydown', handle);
//     return () => window.removeEventListener('keydown', handle);
//   }, [lane]);

//   /* frame loop ------------------------------------------------------------ */
//   useFrame((_, delta) => {
//     const g = group.current;
//     if (!g) return;

//     /* damp() → smooth, frame-rate-independent interpolation */
//     const targetX = LANES_X[lane];
//     g.position.x = THREE.MathUtils.damp(g.position.x, targetX, CHANGE_SPEED, delta);

//     /* keep runner glued to ground */
//     g.position.y = -1;
//     g.position.z = 0; // Ensure z-position is consistent
//     g.rotation.set(0, Math.PI, 0);
//     g.scale.setScalar(0.7);

//     /* update shared position vector */
//     posRef.current.copy(g.position);

//     /* drive animation mixer */
//     mixer?.update(Math.min(delta, ANIM_FPS_CLAMP));

//     /* basic distance collision check ------------------------------------ */
//     const now = performance.now();
//     if (now - lastHitRef.current > 500) {            // 0.5 s throttle
//       for (const o of obstacles) {
//         if (g.position.distanceToSquared(o.position) < 0.04) { // 0.2² radius
//           onHit();
//           lastHitRef.current = now;
//           break;
//         }
//       }
//     }
//   });

//   return (
//     <group ref={group}>
//       <primitive object={scene} />
//     </group>
//   );
// }

// useGLTF.preload('/models/Running.glb');
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*                                   CONFIG                                   */
/* -------------------------------------------------------------------------- */

// Keep lane centres in sync with GroundTiles.tsx
const LANE_WIDTH = 2.2;
const LANES_X    = [-LANE_WIDTH, 0, LANE_WIDTH];  // L | C | R

const CHANGE_SPEED     = 10;   // higher → snappier lane switch
const MAX_ANIM_DELTA   = 0.001;  // clamp mixer update
const COLLISION_RADIUS = 0.22; // ~0.47 sqrt‑distance (squared test)

/* -------------------------------------------------------------------------- */
export interface PlayerModelProps {
  posRef:   React.MutableRefObject<THREE.Vector3>;  // shared position vec
  obstacles: THREE.Object3D[];
  onHit:    () => void;
}

export default function PlayerModel({ posRef, obstacles, onHit }: PlayerModelProps) {
  /* refs & state ---------------------------------------------------------- */
  const group      = useRef<THREE.Group>(null);
  const [lane, setLane] = useState(1);   // start centre lane
  const lastHit    = useRef(0);

  /* load mesh + animation ------------------------------------------------- */
  const { scene, animations }   = useGLTF('/models/Running-2.glb');
  const { actions, mixer }      = useAnimations(animations, group);

  useEffect(() => {
    const run = actions['Run'] ?? Object.values(actions)[0];
    run?.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.1).play();
  }, [actions]);

  /* keyboard & touch controls --------------------------------------------- */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft'  && lane > 0) setLane(l => l - 1);
      if (e.key === 'ArrowRight' && lane < 2) setLane(l => l + 1);
    };

    const touchStart = { x: 0 };
    const handleTouchStart = (e: TouchEvent) => {
      touchStart.x = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEnd = e.changedTouches[0].clientX;
      const diff = touchStart.x - touchEnd;
      const threshold = 50; // minimum swipe distance
      
      if (Math.abs(diff) > threshold) {
        if (diff > 0 && lane > 0) setLane(l => l - 1); // swipe left
        if (diff < 0 && lane < 2) setLane(l => l + 1); // swipe right
      }
    };

    window.addEventListener('keydown', key);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [lane]);

  /* game loop ------------------------------------------------------------- */
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;

    /* smooth lane change -------------------------------------------------- */
    g.position.x = THREE.MathUtils.damp(g.position.x, LANES_X[lane], CHANGE_SPEED, dt);

    /* keep runner aligned ------------------------------------------------- */
    g.position.y = -1;
    // g.position.z = 0;
    g.rotation.set(0, Math.PI, 0);
    g.scale.setScalar(0.7);

    /* expose world position to other systems ----------------------------- */
    posRef.current.copy(g.position);

    /* advance animation mixer -------------------------------------------- */
    mixer?.update(Math.min(dt, MAX_ANIM_DELTA));

    /* collision check (throttled to 0.4 s) ------------------------------- */
    const now = performance.now();
    if (now - lastHit.current > 400) {
      for (const o of obstacles) {
        if (g.position.distanceToSquared(o.position) < COLLISION_RADIUS * COLLISION_RADIUS) {
          onHit();
          lastHit.current = now;
          break;
        }
      }
    }
  });

  /* render --------------------------------------------------------------- */
  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/Running-2.glb');
