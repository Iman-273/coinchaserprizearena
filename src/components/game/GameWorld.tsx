
import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import PlayerModel from "./PlayerModel";
import GroundTiles from "./GroundTiles";

interface GameWorldProps {
  onGameEnd: (finalScore: number, coins: number, distance: number) => void;
  onScoreUpdate: (score: number) => void;
  onCoinCollect: (coins: number) => void;
  onDistanceUpdate: (distance: number) => void;
}

interface GameState {
  score: number;
  coins: number;
  distance: number;
  gameOver: boolean;
}

function GameLogic({ 
  onGameEnd, 
  onScoreUpdate, 
  onCoinCollect,
  onDistanceUpdate
}: {
  onGameEnd: (finalScore: number, coins: number, distance: number) => void;
  onScoreUpdate: (score: number) => void;
  onCoinCollect: (coins: number) => void;
  onDistanceUpdate: (distance: number) => void;
}) {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    coins: 0,
    distance: 0,
    gameOver: false
  });

  const frameCount = useRef(0);
  const playerPosRef = useRef(new THREE.Vector3(0, -1, 2));
  const gameStartTime = useRef(Date.now());

  const handleCollision = useCallback(() => {
    if (!gameState.gameOver) {
      setGameState(prev => ({ ...prev, gameOver: true }));
      onGameEnd(gameState.score, gameState.coins, gameState.distance);
    }
  }, [gameState.gameOver, gameState.score, gameState.coins, gameState.distance, onGameEnd]);

  const handleCoinCollect = useCallback(() => {
    setGameState(prev => {
      const newCoins = prev.coins + 1;
      const newScore = prev.score + 100;
      onCoinCollect(newCoins);
      onScoreUpdate(newScore);
      return {
        ...prev,
        coins: newCoins,
        score: newScore
      };
    });
  }, [onCoinCollect, onScoreUpdate]);

  // Game loop for score and distance updates
  useFrame(() => {
    if (gameState.gameOver) return;

    frameCount.current += 1;
    
    // Calculate distance based on time (simulate forward movement)
    const currentTime = (Date.now() - gameStartTime.current) / 1000; // seconds
    const newDistance = Math.floor(currentTime * 5); // 5 meters per second
    
    if (newDistance !== gameState.distance) {
      setGameState(prev => {
        onDistanceUpdate(newDistance);
        return { ...prev, distance: newDistance };
      });
    }
    
    // Increase score based on time and distance
    if (frameCount.current % 60 === 0) { // Every second at 60fps
      setGameState(prev => {
        const distanceBonus = Math.floor(prev.distance / 10); // 1 point per 10 meters
        const newScore = prev.score + 10 + distanceBonus;
        onScoreUpdate(newScore);
        return { ...prev, score: newScore };
      });
    }
  });

  return (
    <>
      <PlayerModel 
        posRef={playerPosRef}
        obstacles={[]}
        onHit={handleCollision}
      />
      <GroundTiles 
        playerPos={playerPosRef.current}
        onCoinCollect={handleCoinCollect}
        onCollision={handleCollision}
      />
    </>
  );
}

function CameraController() {
  const { camera } = useThree();
  
  useFrame(() => {
    // Fixed camera position for your original game logic
    // camera.position.set(0, 5, -8);
    // camera.lookAt(0, 0, 0);
    camera.position.set(0, 5, 8);
camera.lookAt(0, 0, 0);
  });
  
  return null;
}

const GameWorld = ({ onGameEnd, onScoreUpdate, onCoinCollect, onDistanceUpdate }: GameWorldProps) => {
  return (
    <div className="w-full h-full">
      <Canvas>
        <PerspectiveCamera makeDefault fov={75} position={[0, 5, 10]} />
        <CameraController />
        
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Sky - Yellow theme for game */}
        <mesh>
          <sphereGeometry args={[200, 32, 32]} />
          <meshBasicMaterial color="hsl(60, 100%, 80%)" side={THREE.BackSide} />
        </mesh>
        
        <GameLogic 
          onGameEnd={onGameEnd}
          onScoreUpdate={onScoreUpdate}
          onCoinCollect={onCoinCollect}
          onDistanceUpdate={onDistanceUpdate}
        />
      </Canvas>
    </div>
  );
};

export default GameWorld;
