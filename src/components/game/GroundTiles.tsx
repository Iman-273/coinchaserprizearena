
import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*                                  CONFIG                                    */
/* -------------------------------------------------------------------------- */

// PathStraight.glb is ~20 units long in Z – use that as tile size so segments
// butt-up perfectly and create a seamless endless road.
const TILE_LENGTH  = 40;
const TILES_BEHIND = 3;     // how many road tiles we keep behind camera
const TILES_AHEAD  = 6;    // … and in front (tweak for perf)
const SPEED        = 0.12;

const LANE_WIDTH   = 2.2;                         // metres between lane centres
const LANES_X      = [-LANE_WIDTH, 0, LANE_WIDTH];

const ROAD_WIDTH   = 40;                           // visual width of PathStraight
const GRASS_OFFSET = ROAD_WIDTH * 0.5 + 1;
const BUILDING_X   = GRASS_OFFSET + 1.5;
const SKY_Y        = 12;

const COLLISION_Z  = 0.9;
const COLLISION_X  = 0.9;

const OBSTACLE_SPAWN_MS = 900;
const CLOUD_SPAWN_MS    = 4000;
const POOL_SIZE         = 30;

/* -------------------------------------------------------------------------- */
export interface GroundTilesProps {
  playerPos: THREE.Vector3;
  setRefs?: (refs: THREE.Object3D[]) => void;
  onCoinCollect?: () => void;
  onCollision?: () => void;
}

export default function GroundTiles({ playerPos, setRefs, onCoinCollect, onCollision }: GroundTilesProps) {
  const pool      = useRef<THREE.Object3D[]>([]);
  const active    = useRef<THREE.Object3D[]>([]);
  const clouds    = useRef<THREE.Object3D[]>([]);

  /* ------------------------------- assets -------------------------------- */
  const { scene: road        } = useGLTF('/models/country.glb');
  const { scene: cone        } = useGLTF('/models/RoadCone.glb');
  const { scene: goldBag     } = useGLTF('/models/GoldBag.glb');
  const { scene: coinSingle  } = useGLTF('/models/coin.glb');
  const { scene: grass       } = useGLTF('/models/GrassTile.glb');
  // const { scene: skyscraper  } = useGLTF('/models/Skyscraper.glb');
  const { scene: block       } = useGLTF('/models/LargeBuilding.glb');
  const { scene: cloudModel  } = useGLTF('/models/cloud.glb');

  /* --------------------------- static background ------------------------- */
  const background = useMemo(() => {
    const objs: THREE.Object3D[] = [];

    for (let i = -TILES_BEHIND; i < TILES_AHEAD; i++) {
      /* centre road tile */
      const r = road.clone(true);
      r.rotation.set(0, 0, 0);
      r.position.set(0, -2, -i * TILE_LENGTH);
      objs.push(r);

      /* grass */
      ['L', 'R'].forEach(side => {
        const g = grass.clone();
        g.position.set(
          side === 'L' ? -GRASS_OFFSET : GRASS_OFFSET,
          -1.5,
          -i * TILE_LENGTH
        );
        objs.push(g);
      });

      /* buildings every third tile so they line up visually */
      // if (i % 3 === 0) {
      //   const left  = (i % 6 === 0 ? skyscraper : block).clone();
      //   const right = (i % 6 === 0 ? block      : skyscraper).clone();
      //   const s     = 1.8 + Math.random() * 0.3;
      //   left .scale.setScalar(s);
      //   right.scale.setScalar(s);
      //   left .position.set(-BUILDING_X, -1, -i * TILE_LENGTH);
      //   right.position.set( BUILDING_X, -1, -i * TILE_LENGTH);
      //   objs.push(left, right);
      // }
    }
    return objs;
  }, [road, grass,  block]);

  /* --------------------------- obstacle pool - ONLY COINS ----------------------------- */
  const obstacleDefs = useMemo(() => [
    { mesh: goldBag,    scale: 1.9, type: 'coin'     },
    { mesh: coinSingle, scale: 1.4, type: 'coin'     },
  ], [goldBag, coinSingle]);

  const acquire = useCallback(() => {
    if (pool.current.length) return pool.current.pop()!;
    const d = obstacleDefs[Math.floor(Math.random() * obstacleDefs.length)];
    const m = d.mesh.clone();
    m.userData.type = d.type;
    m.scale.setScalar(d.scale);
    return m;
  }, [obstacleDefs]);

  const release = useCallback((m: THREE.Object3D) => {
    m.visible = false;
    pool.current.push(m);
  }, []);

  /* ---------------------------- spawners --------------------------------- */
  const spawnObstacles = useCallback(() => {
    const used = new Set<number>();
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; ++i) {
      let lane;
      do lane = Math.floor(Math.random() * LANES_X.length);
      while (used.has(lane));
      used.add(lane);

      const o = acquire();
      o.visible = true;
      o.position.set(
        LANES_X[lane],
        -0.7,
        -(TILES_AHEAD - 2) * TILE_LENGTH
      );
      active.current.push(o);
    }
    setRefs?.(active.current);
  }, [acquire, setRefs]);

  const spawnCloud = useCallback(() => {
    const c = cloudModel.clone();
    const s = 1.5 + Math.random();
    c.scale.setScalar(s);
    c.position.set(
      THREE.MathUtils.randFloatSpread(20),
      SKY_Y + THREE.MathUtils.randFloatSpread(2),
      -(TILES_AHEAD - 5) * TILE_LENGTH
    );
    clouds.current.push(c);
  }, [cloudModel]);

  /* ---------------------------- init timers ------------------------------ */
  useEffect(() => {
    for (let i = 0; i < POOL_SIZE; i++) pool.current.push(acquire());
    const obsT = setInterval(spawnObstacles, OBSTACLE_SPAWN_MS);
    const cldT = setInterval(spawnCloud,     CLOUD_SPAWN_MS);
    return () => { clearInterval(obsT); clearInterval(cldT); };
  }, [acquire, spawnObstacles, spawnCloud]);

  /* ------------------------------ frame ---------------------------------- */
  const score = useRef(0);

  useFrame((_, dt) => {
    const dz = SPEED * dt * 60;

    /* scroll background tiles */
    background.forEach(o => {
      o.position.z += dz;
      if (o.position.z >  TILES_BEHIND * TILE_LENGTH)
        o.position.z -= (TILES_BEHIND + TILES_AHEAD) * TILE_LENGTH;
    });

    /* clouds */
    clouds.current = clouds.current.filter(c => {
      c.position.z += dz * 0.6;
      return c.position.z < 10;              // keep until behind camera
    });

    /* obstacles */
    active.current = active.current.filter(o => {
      o.position.z += dz;
      if (o.position.z > 5) { release(o); return false; }

      const hitZ = Math.abs(o.position.z - playerPos.z) < COLLISION_Z;
      const hitX = Math.abs(o.position.x - playerPos.x) < COLLISION_X;

      if (hitZ && hitX) {
        // Only coins spawn now, so just collect them
        score.current += 1;
        onCoinCollect?.();
        release(o);
        return false;
      }
      return true;
    });
  });

  /* ------------------------------ render --------------------------------- */
  return (
    <group>
      {background.map((o, i) => <primitive key={`bg-${i}`} object={o} />)}
      {clouds.current.map((c, i)    => <primitive key={`cl-${i}`} object={c} />)}
      {[...active.current, ...pool.current].map((o, i) => (
        <primitive key={`ob-${i}`} object={o} />
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*                             ASSET PRELOADERS                               */
/* -------------------------------------------------------------------------- */

useGLTF.preload('/models/country.glb');
useGLTF.preload('/models/RoadCone.glb');
useGLTF.preload('/models/GoldBag.glb');
useGLTF.preload('/models/coin.glb');
useGLTF.preload('/models/GrassTile.glb');
// useGLTF.preload('/models/.glb');
useGLTF.preload('/models/LargeBuilding.glb');
useGLTF.preload('/models/cloud.glb');
