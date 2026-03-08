import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float, Text, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Heart, Trophy, MousePointer2, RefreshCw, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Constants
const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const WINNING_SCORE = 5000;
const INITIAL_LIVES = 5;
const TICK_RATE = 150;

// Types
type Point = { x: number; y: number };
type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'WON';

// Components
const SnakeSegment = ({ position, isHead, index, total }: { position: Point; isHead: boolean; index: number; total: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Anaconda-like appearance: Dark green with spots
  const scale = isHead ? 0.6 : 0.5 * (1 - (index / total) * 0.3);
  
  return (
    <mesh position={[position.x - GRID_SIZE / 2, 0.5, position.y - GRID_SIZE / 2]} ref={meshRef}>
      <sphereGeometry args={[scale, 32, 32]} />
      <meshStandardMaterial 
        color={isHead ? "#1a4d1a" : "#2d5a27"} 
        roughness={0.3}
        metalness={0.2}
      />
      {isHead && (
        <>
          {/* Eyes */}
          <mesh position={[0.2, 0.2, 0.3]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="yellow" />
          </mesh>
          <mesh position={[-0.2, 0.2, 0.3]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="yellow" />
          </mesh>
          {/* Pupils */}
          <mesh position={[0.2, 0.2, 0.38]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshBasicMaterial color="black" />
          </mesh>
          <mesh position={[-0.2, 0.2, 0.38]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshBasicMaterial color="black" />
          </mesh>
        </>
      )}
    </mesh>
  );
};

const MouseFood = ({ position }: { position: Point }) => {
  return (
    <Float speed={5} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={[position.x - GRID_SIZE / 2, 0.3, position.y - GRID_SIZE / 2]}>
        {/* Mouse Body */}
        <mesh>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
        {/* Mouse Head */}
        <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.2, 0.4, 16]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
        {/* Ears */}
        <mesh position={[0.15, 0.2, 0.1]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#ff9999" />
        </mesh>
        <mesh position={[-0.15, 0.2, 0.1]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#ff9999" />
        </mesh>
        {/* Tail */}
        <mesh position={[0, -0.1, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.6]} />
          <meshStandardMaterial color="#ff9999" />
        </mesh>
      </group>
    </Float>
  );
};

const JungleFloor = () => {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[GRID_SIZE + 2, GRID_SIZE + 2]} />
        <meshStandardMaterial color="#1b2e1b" roughness={1} />
      </mesh>
      {/* Grid lines for orientation */}
      <gridHelper args={[GRID_SIZE, GRID_SIZE, "#2a4a2a", "#1a2a1a"]} position={[0, 0.01, 0]} />
      
      {/* Decorative grass/rocks */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={i} position={[
          (Math.random() - 0.5) * GRID_SIZE,
          0.1,
          (Math.random() - 0.5) * GRID_SIZE
        ]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color="#3d5a37" />
        </mesh>
      ))}
    </group>
  );
};

export default function App() {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [gameState, setGameState] = useState<GameState>('START');
  const [highScore, setHighScore] = useState(0);

  const directionRef = useRef<Point>(INITIAL_DIRECTION);

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    setFood(generateFood(INITIAL_SNAKE));
    setScore(0);
    setLives(INITIAL_LIVES);
    setGameState('PLAYING');
  };

  const handleDeath = () => {
    if (lives > 1) {
      setLives(l => l - 1);
      setSnake(INITIAL_SNAKE);
      setDirection(INITIAL_DIRECTION);
      directionRef.current = INITIAL_DIRECTION;
    } else {
      setLives(0);
      setGameState('GAMEOVER');
      if (score > highScore) setHighScore(score);
    }
  };

  const moveSnake = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = {
        x: head.x + directionRef.current.x,
        y: head.y + directionRef.current.y,
      };

      // Collision with walls
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        handleDeath();
        return prevSnake;
      }

      // Collision with self
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        handleDeath();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check if food eaten
      if (newHead.x === food.x && newHead.y === food.y) {
        const newScore = score + 100;
        setScore(newScore);
        if (newScore >= WINNING_SCORE) {
          setGameState('WON');
        }
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, score, gameState, lives, generateFood]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (directionRef.current.y !== 1) directionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (directionRef.current.y !== -1) directionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (directionRef.current.x !== 1) directionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (directionRef.current.x !== -1) directionRef.current = { x: 1, y: 0 };
          break;
        case ' ':
          if (gameState === 'PLAYING') setGameState('PAUSED');
          else if (gameState === 'PAUSED') setGameState('PLAYING');
          else if (gameState === 'START') setGameState('PLAYING');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  useEffect(() => {
    const interval = setInterval(moveSnake, TICK_RATE);
    return () => clearInterval(interval);
  }, [moveSnake]);

  return (
    <div className="relative w-full h-full bg-black font-sans text-white overflow-hidden">
      {/* 3D Scene */}
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 15, 15]} fov={50} />
        <OrbitControls 
          enablePan={false} 
          maxPolarAngle={Math.PI / 2.1} 
          minDistance={10} 
          maxDistance={30} 
        />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
        <spotLight position={[-10, 15, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={50} scale={20} size={2} speed={0.4} opacity={0.2} />
        
        <JungleFloor />
        
        {snake.map((segment, i) => (
          <SnakeSegment 
            key={`${i}-${segment.x}-${segment.y}`} 
            position={segment} 
            isHead={i === 0} 
            index={i}
            total={snake.length}
          />
        ))}
        
        <MouseFood position={food} />
        
        <Environment preset="forest" />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4"
          >
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Trophy className="text-emerald-400 w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-bold">Score</p>
              <p className="text-2xl font-black tabular-nums">{score.toLocaleString()}</p>
            </div>
          </motion.div>
          
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <Heart className="text-rose-400 w-6 h-6" />
            </div>
            <div className="flex gap-1">
              {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
                <Heart 
                  key={i} 
                  className={`w-5 h-5 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-white/20'}`} 
                />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Goal</p>
          <p className="text-lg font-bold text-emerald-400">{WINNING_SCORE.toLocaleString()}</p>
          <div className="w-32 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${(score / WINNING_SCORE) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Game State Modals */}
      <AnimatePresence>
        {gameState !== 'PLAYING' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 z-50"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-[32px] p-8 text-center shadow-2xl"
            >
              {gameState === 'START' && (
                <>
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Play className="text-emerald-400 w-10 h-10 fill-emerald-400" />
                  </div>
                  <h1 className="text-4xl font-black mb-2 italic uppercase tracking-tighter">Anaconda 3D</h1>
                  <p className="text-zinc-400 mb-8">Hunt the mice, grow your length, and reach 5000 points to claim the jungle.</p>
                  <button 
                    onClick={() => setGameState('PLAYING')}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 pointer-events-auto"
                  >
                    START HUNTING <Play className="w-5 h-5 fill-black" />
                  </button>
                  <p className="mt-4 text-xs text-zinc-500 uppercase tracking-widest font-bold">Use Arrow Keys to Move • Space to Pause</p>
                </>
              )}

              {gameState === 'PAUSED' && (
                <>
                  <h2 className="text-4xl font-black mb-6 italic uppercase tracking-tighter">Hunt Paused</h2>
                  <button 
                    onClick={() => setGameState('PLAYING')}
                    className="w-full bg-white text-black font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 mb-4 pointer-events-auto"
                  >
                    RESUME <Play className="w-5 h-5 fill-black" />
                  </button>
                  <button 
                    onClick={resetGame}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 pointer-events-auto"
                  >
                    RESTART <RefreshCw className="w-5 h-5" />
                  </button>
                </>
              )}

              {gameState === 'GAMEOVER' && (
                <>
                  <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <RefreshCw className="text-rose-400 w-10 h-10" />
                  </div>
                  <h2 className="text-4xl font-black mb-2 italic uppercase tracking-tighter text-rose-500">Game Over</h2>
                  <p className="text-zinc-400 mb-2">The jungle was too much for you this time.</p>
                  <div className="bg-black/40 rounded-2xl p-4 mb-8 flex justify-around">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Final Score</p>
                      <p className="text-2xl font-black">{score.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">High Score</p>
                      <p className="text-2xl font-black">{highScore.toLocaleString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={resetGame}
                    className="w-full bg-white text-black font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 pointer-events-auto"
                  >
                    TRY AGAIN <RefreshCw className="w-5 h-5" />
                  </button>
                </>
              )}

              {gameState === 'WON' && (
                <>
                  <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="text-yellow-400 w-10 h-10 fill-yellow-400" />
                  </div>
                  <h2 className="text-4xl font-black mb-2 italic uppercase tracking-tighter text-yellow-500">Victory!</h2>
                  <p className="text-zinc-400 mb-8">You have reached 5000 points and become the King of the Jungle.</p>
                  <button 
                    onClick={resetGame}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 pointer-events-auto"
                  >
                    PLAY AGAIN <RefreshCw className="w-5 h-5" />
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
          <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold">↑</div>
          <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold">↓</div>
          <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold">←</div>
          <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold">→</div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/50 ml-2">Move</span>
        </div>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
          <div className="px-2 h-6 bg-white/10 rounded flex items-center justify-center text-[10px] font-bold">SPACE</div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/50 ml-2">Pause</span>
        </div>
      </div>
    </div>
  );
}
