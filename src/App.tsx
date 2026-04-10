import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line, Grid, TransformControls as DreiTransformControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { MousePointer2, PenTool, Hand, Settings, Trash2, Route, CircleDot, Layers } from 'lucide-react';
import { NWayJunctionGenerator, RoadSegmentGenerator, type ArmSpec, type PatchSpec, type Vec3 } from './lib/geometry';

const TransformControls = DreiTransformControls as any;

type Point3D = [number, number, number];
type SplineNode3D = { id: string; position: Point3D; handle1: Point3D; handle2: Point3D; topology?: string; };
type Spline3D = { id: string; name: string; nodes: SplineNode3D[]; closed: boolean; };
type Mode = 'select' | 'draw' | 'pan';

const generateId = () => Math.random().toString(36).substring(2, 9);

function SplineCenterGizmo({ spline, onUpdate }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const center = useMemo(() => {
    let cx = 0, cy = 0, cz = 0;
    spline.nodes.forEach((n: any) => { cx += n.position[0]; cy += n.position[1]; cz += n.position[2]; });
    const len = spline.nodes.length;
    return new THREE.Vector3(cx/len, cy/len, cz/len);
  }, [spline.nodes]);

  const prevPos = useRef(center.clone());

  useEffect(() => {
    if (!isDragging && meshRef.current) {
      meshRef.current.position.copy(center);
      prevPos.current.copy(center);
    }
  }, [center, isDragging]);

  return (
    <>
      <mesh ref={meshRef} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <TransformControls 
        object={meshRef} 
        mode="translate" 
        onDraggingChanged={(e: any) => setIsDragging(e.value)}
        onObjectChange={() => {
          if (meshRef.current) {
            const curr = meshRef.current.position;
            const dx = curr.x - prevPos.current.x;
            const dy = curr.y - prevPos.current.y;
            const dz = curr.z - prevPos.current.z;
            if (dx !== 0 || dy !== 0 || dz !== 0) {
              onUpdate(dx, dy, dz);
              prevPos.current.copy(curr);
            }
          }
        }} 
      />
    </>
  );
}

function SplineRenderer({ spline, isActive, selectedNodeId, onNodeClick, mode, onNodeUpdate, onSplineUpdate }: any) {
  const points = useMemo(() => {
    if (spline.nodes.length < 2) return [];
    const curvePath = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < spline.nodes.length - 1; i++) {
      const n1 = spline.nodes[i], n2 = spline.nodes[i + 1];
      curvePath.add(new THREE.CubicBezierCurve3(
        new THREE.Vector3(...n1.position), new THREE.Vector3(...n1.handle2),
        new THREE.Vector3(...n2.handle1), new THREE.Vector3(...n2.position)
      ));
    }
    if (spline.closed && spline.nodes.length > 2) {
      const n1 = spline.nodes[spline.nodes.length - 1], n2 = spline.nodes[0];
      curvePath.add(new THREE.CubicBezierCurve3(
        new THREE.Vector3(...n1.position), new THREE.Vector3(...n1.handle2),
        new THREE.Vector3(...n2.handle1), new THREE.Vector3(...n2.position)
      ));
    }
    return curvePath.getPoints(spline.nodes.length * 20);
  }, [spline]);

  return (
    <group>
      {points.length > 0 && <Line points={points} color={isActive ? "#ffffff" : "#666666"} lineWidth={isActive ? 4 : 2} />}
      {isActive && !selectedNodeId && mode === 'select' && (
        <SplineCenterGizmo spline={spline} onUpdate={(dx: number, dy: number, dz: number) => onSplineUpdate(spline.id, dx, dy, dz)} />
      )}
      {spline.nodes.map((node: SplineNode3D, index: number) => {
        const isSelected = node.id === selectedNodeId;
        const isEndpoint = index === 0 || index === spline.nodes.length - 1;
        const showHandles = isSelected || isActive;
        
        return (
          <group key={node.id}>
            {showHandles && (
              <>
                <Line points={[node.position, node.handle1]} color="#4488ff" lineWidth={2} />
                <Line points={[node.position, node.handle2]} color="#ff4444" lineWidth={2} />
                <HandleMesh pos={node.handle1} color="#4488ff" onUpdate={(p: any) => onNodeUpdate(spline.id, node.id, { handle1: p })} isSelected={isSelected} />
                <HandleMesh pos={node.handle2} color="#ff4444" onUpdate={(p: any) => onNodeUpdate(spline.id, node.id, { handle2: p })} isSelected={isSelected} />
              </>
            )}
            <NodeMesh 
              node={node} 
              isSelected={isSelected} 
              isEndpoint={isEndpoint}
              mode={mode}
              onClick={(e: any) => onNodeClick(e, spline.id, node.id, isEndpoint)}
              onUpdate={(p: any) => {
                const dx = p[0] - node.position[0], dy = p[1] - node.position[1], dz = p[2] - node.position[2];
                onNodeUpdate(spline.id, node.id, {
                  position: p,
                  handle1: [node.handle1[0] + dx, node.handle1[1] + dy, node.handle1[2] + dz],
                  handle2: [node.handle2[0] + dx, node.handle2[1] + dy, node.handle2[2] + dz],
                });
              }}
            />
          </group>
        );
      })}
    </group>
  );
}

function NodeMesh({ node, isSelected, isEndpoint, mode, onClick, onUpdate }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const color = isSelected ? "#ffffff" : (mode === 'draw' && isEndpoint ? "#44ff44" : "#888888");
  
  useEffect(() => {
    if (!isDragging && meshRef.current && node.position) {
      meshRef.current.position.set(node.position[0], node.position[1], node.position[2]);
    }
  }, [node.position, isDragging]);

  return (
    <>
      <mesh ref={meshRef} onPointerDown={onClick}>
        <sphereGeometry args={[isSelected ? 1 : 0.8, 16, 16]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
      {isSelected && mode === 'select' && (
        <TransformControls 
          object={meshRef} 
          mode="translate" 
          onDraggingChanged={(e: any) => setIsDragging(e.value)}
          onObjectChange={() => {
            if (meshRef.current) onUpdate([meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z]);
          }} 
        />
      )}
    </>
  );
}

function PatchMesh({ patch }: { patch: PatchSpec }) {
  const geometry = useMemo(() => {
      const geo = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const indices: number[] = [];
      
      const rows = patch.grid.length;
      const cols = patch.grid[0].length;
      
      for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
              const [rx, ry, rz] = patch.grid[i][j];
              // Map Roadnet (X right, Y forward, Z up) to Three.js (X right, Y up, Z backward)
              vertices.push(rx, rz, -ry);
          }
      }
      
      for (let i = 0; i < rows - 1; i++) {
          for (let j = 0; j < cols - 1; j++) {
              const a = i * cols + j;
              const b = i * cols + (j + 1);
              const c = (i + 1) * cols + (j + 1);
              const d = (i + 1) * cols + j;
              
              // Original Roadnet winding order (preserves UP normals)
              indices.push(a, d, b);
              indices.push(b, d, c);
          }
      }
      
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      
      return geo;
  }, [patch]);

  return (
      <mesh geometry={geometry}>
          <meshStandardMaterial 
              color={patch.fill_color} 
              transparent 
              opacity={patch.alpha || 1.0} 
              side={THREE.DoubleSide}
              polygonOffset
              polygonOffsetFactor={1}
              roughness={0.8}
              metalness={0.1}
          />
      </mesh>
  );
}

function RoadNetwork({ splines }: { splines: Spline3D[] }) {
  const { junctionPatches, segmentPatches, markers } = useMemo(() => {
    const junctionPatches: PatchSpec[] = [];
    const segmentPatches: PatchSpec[] = [];
    const markers: any[] = [];
    
    // 1. Group nodes into intersections
    const groups: { position: Point3D, nodes: { splineId: string, nodeIndex: number, node: SplineNode3D }[], topology?: string }[] = [];
    splines.forEach(s => {
      s.nodes.forEach((n, idx) => {
        const existing = groups.find(g => 
          Math.abs(g.position[0] - n.position[0]) < 0.1 &&
          Math.abs(g.position[1] - n.position[1]) < 0.1 &&
          Math.abs(g.position[2] - n.position[2]) < 0.1
        );
        if (existing) {
          existing.nodes.push({ splineId: s.id, nodeIndex: idx, node: n });
          if (n.topology) existing.topology = n.topology;
        } else {
          groups.push({ position: n.position, nodes: [{ splineId: s.id, nodeIndex: idx, node: n }], topology: n.topology });
        }
      });
    });
    
    const intersections = groups.filter(g => g.nodes.length > 1 || g.topology);
    
    const connectionMap = new Map<string, { R: number, MC: Vec3 }>();
    
    // 2. Generate Junctions
    intersections.forEach((m, i) => {
        const arms: ArmSpec[] = [];
        m.nodes.forEach(({ splineId, nodeIndex, node }) => {
            const spline = splines.find(s => s.id === splineId);
            if (!spline) return;
            
            const addArm = (targetNode: SplineNode3D, handlePos: Point3D, isStart: boolean) => {
                let dx = handlePos[0] - m.position[0];
                let dz = handlePos[2] - m.position[2];
                const dist = Math.sqrt(dx*dx + dz*dz);
                if (dist < 2.0) {
                    dx = targetNode.position[0] - m.position[0];
                    dz = targetNode.position[2] - m.position[2];
                }
                const r_dy = -dz;
                const r_dx = dx;
                const angle_rad = Math.atan2(r_dy, r_dx);
                let angle_deg = angle_rad * 180 / Math.PI;
                if (angle_deg < 0) angle_deg += 360;
                
                let width = 10.0;
                if (node.topology === 'Single Road') width = 6.0;
                else if (node.topology === '2 Lane Road') width = 8.0;
                else if (node.topology === '3 Lane Road') width = 12.0;
                else if (node.topology === '4 Lane Road') width = 16.0;
                else if (node.topology === 'Highway Interchange') width = 20.0;

                arms.push({
                    id: `${splineId}-${nodeIndex}-${isStart ? 'start' : 'end'}`,
                    name: `Arm`,
                    angle_deg,
                    outer_height: m.position[1],
                    fill_color: "#333333",
                    width: width,
                    pavement_width_left: 2.0,
                    pavement_width_right: 2.0
                });
            };

            if (nodeIndex > 0) {
                const prevNode = spline.nodes[nodeIndex - 1];
                addArm(prevNode, node.handle1, false);
            }
            if (nodeIndex < spline.nodes.length - 1) {
                const nextNode = spline.nodes[nodeIndex + 1];
                addArm(nextNode, node.handle2, true);
            }
            if (spline.closed) {
                if (nodeIndex === 0) {
                    const prevNode = spline.nodes[spline.nodes.length - 1];
                    addArm(prevNode, node.handle1, false);
                } else if (nodeIndex === spline.nodes.length - 1) {
                    const nextNode = spline.nodes[0];
                    addArm(nextNode, node.handle2, true);
                }
            }
        });

        if (arms.length >= 2) {
            try {
                const generator = new NWayJunctionGenerator(
                    [m.position[0], -m.position[2], m.position[1]],
                    0, // arm_length not used
                    4, // hub_div
                    4, // longitudinal_subdivs
                    5.0 // fillet_radius
                );
                const result = generator.build_case(arms, m.position[1], 0.8, 0.2, 1.5, 1.5);
                junctionPatches.push(...result.patches);
                
                result.armData.forEach(data => {
                    connectionMap.set(data.id, { R: data.R, MC: data.MC });
                });
            } catch (e) {
                console.error(e);
            }
        }

        let autoTopology = m.topology;
        if (!autoTopology) {
            if (arms.length === 1) autoTopology = "Dead End";
            else if (arms.length === 2) autoTopology = "Straight/Curve";
            else if (arms.length === 3) autoTopology = "3-Way Intersection";
            else if (arms.length === 4) autoTopology = "4-Way Intersection";
            else autoTopology = `${arms.length}-Way Intersection`;
        }
        
        markers.push({ position: m.position, topology: autoTopology });
    });
    
    // 3. Generate Road Segments
    const getWidth = (topology?: string) => {
        if (topology === 'Single Road') return 6.0;
        if (topology === '2 Lane Road') return 8.0;
        if (topology === '3 Lane Road') return 12.0;
        if (topology === '4 Lane Road') return 16.0;
        if (topology === 'Highway Interchange') return 20.0;
        return 10.0;
    };

    splines.forEach(spline => {
        const processSegment = (n1: SplineNode3D, n2: SplineNode3D, idx1: number, idx2: number) => {
            const width = getWidth(n1.topology || n2.topology);
            const generator = new RoadSegmentGenerator(width, 2.0, 2.0, 1.5, 1.5, 0.15, 0.8, 0.2);
            
            const curve = new THREE.CubicBezierCurve3(
                new THREE.Vector3(n1.position[0], n1.position[1], n1.position[2]),
                new THREE.Vector3(n1.handle2[0], n1.handle2[1], n1.handle2[2]),
                new THREE.Vector3(n2.handle1[0], n2.handle1[1], n2.handle1[2]),
                new THREE.Vector3(n2.position[0], n2.position[1], n2.position[2])
            );
            
            const points = curve.getPoints(100);
            const lengths = [0];
            for (let j = 1; j < points.length; j++) {
                lengths.push(lengths[j-1] + points[j].distanceTo(points[j-1]));
            }
            const totalLen = lengths[lengths.length - 1];
            
            const conn1 = connectionMap.get(`${spline.id}-${idx1}-start`);
            const conn2 = connectionMap.get(`${spline.id}-${idx2}-end`);
            
            let startDist = conn1 ? conn1.R : 0;
            let endDist = conn2 ? totalLen - conn2.R : totalLen;
            
            if (startDist < endDist) {
                const segmentPoints: [number, number, number][] = [];
                
                if (conn1) {
                    segmentPoints.push([conn1.MC[0], conn1.MC[1], conn1.MC[2]]);
                } else if (startDist > 0) {
                    for (let j = 0; j < points.length - 1; j++) {
                        if (startDist >= lengths[j] && startDist <= lengths[j+1]) {
                            const t = (startDist - lengths[j]) / (lengths[j+1] - lengths[j]);
                            const x = points[j].x + (points[j+1].x - points[j].x) * t;
                            const y = points[j].y + (points[j+1].y - points[j].y) * t;
                            const z = points[j].z + (points[j+1].z - points[j].z) * t;
                            segmentPoints.push([x, -z, y]);
                            break;
                        }
                    }
                } else if (startDist === 0) {
                    const first = points[0];
                    segmentPoints.push([first.x, -first.z, first.y]);
                }

                for (let j = 0; j < points.length; j++) {
                    if (lengths[j] > startDist && lengths[j] < endDist) {
                        segmentPoints.push([points[j].x, -points[j].z, points[j].y]);
                    }
                }

                if (conn2) {
                    segmentPoints.push([conn2.MC[0], conn2.MC[1], conn2.MC[2]]);
                } else if (endDist < totalLen) {
                    for (let j = 0; j < points.length - 1; j++) {
                        if (endDist >= lengths[j] && endDist <= lengths[j+1]) {
                            const t = (endDist - lengths[j]) / (lengths[j+1] - lengths[j]);
                            const x = points[j].x + (points[j+1].x - points[j].x) * t;
                            const y = points[j].y + (points[j+1].y - points[j].y) * t;
                            const z = points[j].z + (points[j+1].z - points[j].z) * t;
                            segmentPoints.push([x, -z, y]);
                            break;
                        }
                    }
                } else if (endDist === totalLen) {
                    const last = points[points.length - 1];
                    segmentPoints.push([last.x, -last.z, last.y]);
                }

                if (segmentPoints.length >= 2) {
                    segmentPatches.push(...generator.build_segment(segmentPoints).patches);
                }
            }
        };

        for (let i = 0; i < spline.nodes.length - 1; i++) {
            processSegment(spline.nodes[i], spline.nodes[i+1], i, i+1);
        }
        
        if (spline.closed && spline.nodes.length > 2) {
            processSegment(spline.nodes[spline.nodes.length - 1], spline.nodes[0], spline.nodes.length - 1, 0);
        }
    });

    return { junctionPatches, segmentPatches, markers };
  }, [splines]);

  return (
    <group>
      {junctionPatches.map((patch, i) => (
        <PatchMesh key={`junc-${i}`} patch={patch} />
      ))}
      {segmentPatches.map((patch, i) => (
        <PatchMesh key={`seg-${i}`} patch={patch} />
      ))}
      {markers.map((m, i) => (
        <Html key={`marker-${i}`} position={m.position} center className="pointer-events-none" style={{ transform: 'translate3d(0,-35px,0)' }}>
          <div className="bg-[#1a1a1a]/95 text-[#44ff44] text-[11px] px-3 py-1.5 rounded-md border border-[#44ff44]/50 whitespace-nowrap font-mono uppercase tracking-wider shadow-lg backdrop-blur-sm flex flex-col items-center">
            <span className="text-white/70 text-[9px] mb-0.5">Intersection</span>
            {m.topology}
          </div>
        </Html>
      ))}
    </group>
  );
}

function HandleMesh({ pos, onUpdate, isSelected, color }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  useEffect(() => {
    if (!isDragging && meshRef.current && pos) {
      meshRef.current.position.set(pos[0], pos[1], pos[2]);
    }
  }, [pos, isDragging]);

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color={color || "#ffffff"} depthTest={false} />
      </mesh>
      {isSelected && (
        <TransformControls 
          object={meshRef} 
          mode="translate" 
          size={0.5} 
          onDraggingChanged={(e: any) => setIsDragging(e.value)}
          onObjectChange={() => {
            if (meshRef.current) onUpdate([meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z]);
          }} 
        />
      )}
    </>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>('select');
  const [splines, setSplines] = useState<Spline3D[]>([]);
  const [activeSplineId, setActiveSplineId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActiveSplineId(null); setSelectedNodeId(null); setMode('select'); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          setSplines(prev => prev.map(s => ({ ...s, nodes: s.nodes.filter(n => n.id !== selectedNodeId) })).filter(s => s.nodes.length > 0));
          setSelectedNodeId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId]);

  const handlePlaneClick = (e: any) => {
    e.stopPropagation();
    if (mode !== 'draw') {
      if (mode === 'select' && e.button === 0) { setSelectedNodeId(null); setActiveSplineId(null); }
      return;
    }
    
    if (e.button !== 0) return; // ONLY LEFT CLICK
    
    let point: Point3D = [e.point.x, 0, e.point.z];
    
    // Snapping logic
    let closestDist = 2.0;
    splines.forEach(s => {
      s.nodes.forEach(n => {
        const dx = n.position[0] - point[0];
        const dy = n.position[1] - point[1];
        const dz = n.position[2] - point[2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < closestDist) {
          closestDist = dist;
          point = [...n.position];
        }
      });
    });

    const newNode: SplineNode3D = { id: generateId(), position: point, handle1: point, handle2: point };

    if (!activeSplineId) {
      const newSpline: Spline3D = { id: generateId(), name: `Spline ${splines.length + 1}`, nodes: [newNode], closed: false };
      setSplines(prev => [...prev, newSpline]);
      setActiveSplineId(newSpline.id);
      setSelectedNodeId(newNode.id);
    } else {
      setSplines(prev => prev.map(s => {
        if (s.id !== activeSplineId) return s;
        const isFirst = s.nodes[0]?.id === selectedNodeId;
        return { ...s, nodes: isFirst ? [newNode, ...s.nodes] : [...s.nodes, newNode] };
      }));
      setSelectedNodeId(newNode.id);
    }
  };

  const handleNodeClick = (e: any, splineId: string, nodeId: string, isEndpoint: boolean) => {
    e.stopPropagation();
    if (mode === 'pan') return;

    if (mode === 'draw') {
      if (e.button !== 0) return; // Only left click

      if (!activeSplineId) {
        const targetNode = splines.find(s => s.id === splineId)?.nodes.find(n => n.id === nodeId);
        if (targetNode) {
          const point = [...targetNode.position] as Point3D;
          const newNode: SplineNode3D = { id: generateId(), position: point, handle1: point, handle2: point };
          const newSpline: Spline3D = { id: generateId(), name: `Spline ${splines.length + 1}`, nodes: [newNode], closed: false };
          setSplines(prev => [...prev, newSpline]);
          setActiveSplineId(newSpline.id);
          setSelectedNodeId(newNode.id);
        }
        return;
      }

      if (activeSplineId === splineId) {
        if (isEndpoint && selectedNodeId !== nodeId) {
          // Close loop
          setSplines(prev => prev.map(s => s.id === splineId ? { ...s, closed: true } : s));
          setMode('select');
        }
        return;
      }

      if (isEndpoint) {
        // Join splines
        setSplines(prev => {
          const active = prev.find(s => s.id === activeSplineId);
          const target = prev.find(s => s.id === splineId);
          if (!active || !target) return prev;

          const activeIsFirst = active.nodes[0].id === selectedNodeId;
          const activeIsLast = active.nodes[active.nodes.length - 1].id === selectedNodeId;
          
          if (!activeIsFirst && !activeIsLast) return prev;

          const targetIsFirst = target.nodes[0].id === nodeId;

          const activeNodes = activeIsFirst ? [...active.nodes].reverse() : [...active.nodes];
          const targetNodes = targetIsFirst ? [...target.nodes] : [...target.nodes].reverse();
          
          const mergedNodes = [...activeNodes, ...targetNodes];

          return prev.filter(s => s.id !== activeSplineId && s.id !== splineId)
                     .concat({ ...target, nodes: mergedNodes });
        });
        setActiveSplineId(splineId);
        setSelectedNodeId(nodeId);
        setMode('select');
        return;
      } else {
        // Snap to mid-point without joining
        const targetNode = splines.find(s => s.id === splineId)?.nodes.find(n => n.id === nodeId);
        if (targetNode) {
          const point = [...targetNode.position] as Point3D;
          const newNode: SplineNode3D = { id: generateId(), position: point, handle1: point, handle2: point };
          
          setSplines(prev => prev.map(s => {
            if (s.id !== activeSplineId) return s;
            const isFirst = s.nodes[0]?.id === selectedNodeId;
            return { ...s, nodes: isFirst ? [newNode, ...s.nodes] : [...s.nodes, newNode] };
          }));
          setSelectedNodeId(newNode.id);
        }
        return;
      }
    }

    if (e.button === 0) {
      setSelectedNodeId(nodeId);
      setActiveSplineId(splineId);
    }
  };

  const updateNode = (splineId: string, nodeId: string, updates: Partial<SplineNode3D>) => {
    setSplines(prev => prev.map(s => s.id === splineId ? {
      ...s, nodes: s.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n)
    } : s));
  };

  const updateSplinePosition = (splineId: string, dx: number, dy: number, dz: number) => {
    setSplines(prev => prev.map(s => {
      if (s.id !== splineId) return s;
      return {
        ...s,
        nodes: s.nodes.map(n => ({
          ...n,
          position: [n.position[0] + dx, n.position[1] + dy, n.position[2] + dz],
          handle1: [n.handle1[0] + dx, n.handle1[1] + dy, n.handle1[2] + dz],
          handle2: [n.handle2[0] + dx, n.handle2[1] + dy, n.handle2[2] + dz],
        }))
      };
    }));
  };

  const selectedSpline = splines.find(s => s.nodes.some(n => n.id === selectedNodeId)) || splines.find(s => s.id === activeSplineId);
  const selectedNode = selectedSpline?.nodes.find(n => n.id === selectedNodeId);

  return (
    <div 
      className="w-screen h-screen bg-[#0a0a0a] overflow-hidden relative font-sans select-none text-white"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 50, 50], fov: 50 }}>
          <color attach="background" args={['#0a0a0a']} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
          <directionalLight position={[-10, 10, -10]} intensity={0.5} />
          <Grid infiniteGrid fadeDistance={200} sectionColor="#444444" cellColor="#1a1a1a" sectionSize={10} cellSize={2} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} onPointerDown={handlePlaneClick}>
            <planeGeometry args={[10000, 10000]} />
            <meshBasicMaterial visible={false} />
          </mesh>
          {splines.map(spline => (
            <SplineRenderer 
              key={spline.id} spline={spline} mode={mode}
              isActive={spline.id === activeSplineId} selectedNodeId={selectedNodeId}
              onNodeClick={handleNodeClick} onNodeUpdate={updateNode}
              onSplineUpdate={updateSplinePosition}
            />
          ))}
          <RoadNetwork splines={splines} />
          <OrbitControls 
            makeDefault 
            enabled={mode === 'pan' || mode === 'select'} 
            enableDamping={true} 
            dampingFactor={0.1}
            mouseButtons={
              mode === 'pan' 
                ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
                : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
            }
          />
        </Canvas>
      </div>

      {/* Toolbar */}
      <div className="absolute left-6 top-6 bottom-6 w-16 bg-[#1a1a1a] border border-[#444444] rounded-3xl shadow-2xl flex flex-col items-center py-6 gap-4 z-10">
        <ToolBtn icon={MousePointer2} active={mode === 'select'} onClick={() => setMode('select')} title="Select (V)" />
        <ToolBtn icon={PenTool} active={mode === 'draw'} onClick={() => { setMode('draw'); setActiveSplineId(null); setSelectedNodeId(null); }} title="Draw (P)" />
        <ToolBtn icon={Hand} active={mode === 'pan'} onClick={() => setMode('pan')} title="Pan/Orbit" />
        <div className="flex-1" />
        <ToolBtn icon={Trash2} active={false} onClick={() => setSplines([])} title="Clear All" />
      </div>

      {/* Outliner */}
      <div className="absolute left-28 top-6 w-64 bg-[#1a1a1a] border border-[#444444] rounded-3xl shadow-2xl flex flex-col z-10 max-h-[40vh] overflow-hidden">
        <div className="p-4 border-b border-[#444444] flex items-center gap-2 bg-[#1a1a1a]">
          <Layers className="w-4 h-4" /> <h2 className="font-semibold text-sm">Outliner</h2>
        </div>
        <div className="overflow-y-auto p-2 space-y-1">
          {splines.length === 0 && <div className="text-xs text-[#888888] p-2 text-center">No splines</div>}
          {splines.map(s => (
            <div key={s.id} onClick={() => { setActiveSplineId(s.id); setMode('select'); }}
                 className={`p-2 rounded-xl text-sm cursor-pointer flex items-center gap-2 ${s.id === activeSplineId ? 'bg-[#444444] text-white' : 'text-[#888888] hover:bg-[#2a2a2a]'}`}>
              <Route className="w-4 h-4" /> {s.name} ({s.nodes.length} pts)
            </div>
          ))}
        </div>
      </div>

      {/* Properties */}
      <div className="absolute right-6 top-6 bottom-6 w-72 bg-[#1a1a1a] border border-[#444444] rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden">
        <div className="p-5 border-b border-[#444444] flex items-center gap-3 bg-[#1a1a1a]">
          <Settings className="w-5 h-5" /> <h2 className="font-semibold tracking-wide">Properties</h2>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {selectedSpline && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#888888] uppercase flex items-center gap-2"><Route className="w-4 h-4" /> Spline</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={selectedSpline.closed} onChange={e => setSplines(prev => prev.map(s => s.id === selectedSpline.id ? { ...s, closed: e.target.checked } : s))} className="rounded bg-[#0a0a0a] border-[#444444]" />
                <span className="text-sm">Closed Loop</span>
              </label>
            </div>
          )}
          {selectedNode && (
            <div className="space-y-4 pt-4 border-t border-[#444444]">
              <h3 className="text-xs font-bold text-[#888888] uppercase flex items-center gap-2"><CircleDot className="w-4 h-4" /> Node</h3>
              
              <div className="space-y-1">
                <label className="text-xs text-[#888888]">Roadnet Topology</label>
                <select
                  value={selectedNode.topology || ''}
                  onChange={e => updateNode(selectedSpline.id, selectedNode.id, { topology: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#444444] rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-[#888888]"
                >
                  <option value="">None</option>
                  <option value="single road">Single Road</option>
                  <option value="2 lane road">2 Lane Road</option>
                  <option value="3 lane road">3 Lane Road</option>
                  <option value="4 lane road">4 Lane Road</option>
                  <option value="intersection">Intersection</option>
                  <option value="roundabout">Roundabout</option>
                  <option value="highway interchange">Highway Interchange</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['X', 'Y', 'Z'].map((axis, i) => (
                  <div key={axis} className="space-y-1">
                    <label className="text-xs text-[#888888]">{axis}</label>
                    <div className="bg-[#0a0a0a] border border-[#444444] rounded-lg px-2 py-1 text-xs font-mono text-center">
                      {selectedNode.position[i].toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!selectedSpline && <div className="text-sm text-[#888888] text-center mt-10">Select a spline or node</div>}
        </div>
      </div>
      
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#444444] rounded-full px-6 py-2 shadow-xl flex items-center gap-3 z-10 pointer-events-none">
        <div className={`w-2 h-2 rounded-full ${mode === 'draw' ? 'bg-white' : mode === 'select' ? 'bg-[#888888]' : 'bg-[#444444]'}`} />
        <span className="text-sm font-medium uppercase tracking-widest">{mode} MODE</span>
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, active, onClick, title }: any) {
  return (
    <button onClick={onClick} title={title} className={`p-3 rounded-2xl transition-all ${active ? 'bg-[#444444] text-white shadow-inner' : 'text-[#888888] hover:text-white hover:bg-[#444444]/50'}`}>
      <Icon size={24} />
    </button>
  );
}
