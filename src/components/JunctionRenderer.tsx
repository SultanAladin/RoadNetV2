import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { NWayJunctionGenerator, ArmSpec, PatchSpec } from '../lib/geometry';

function PatchMesh({ patch }: { patch: PatchSpec }) {
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const vertices: number[] = [];
        const indices: number[] = [];
        
        const rows = patch.grid.length;
        const cols = patch.grid[0].length;
        
        // Add vertices
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const [x, y, z] = patch.grid[i][j];
                vertices.push(x, y, z);
            }
        }
        
        // Add indices for quads (2 triangles per quad)
        for (let i = 0; i < rows - 1; i++) {
            for (let j = 0; j < cols - 1; j++) {
                const a = i * cols + j;
                const b = i * cols + (j + 1);
                const c = (i + 1) * cols + (j + 1);
                const d = (i + 1) * cols + j;
                
                // Triangle 1 (a, d, b to point normals up)
                indices.push(a, d, b);
                // Triangle 2 (b, d, c to point normals up)
                indices.push(b, d, c);
            }
        }
        
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        
        return geo;
    }, [patch]);

    // Create wireframe geometry for the quads
    const wireframeGeometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const vertices: number[] = [];
        
        const rows = patch.grid.length;
        const cols = patch.grid[0].length;
        
        // Horizontal lines
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols - 1; j++) {
                const p1 = patch.grid[i][j];
                const p2 = patch.grid[i][j + 1];
                vertices.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
            }
        }
        
        // Vertical lines
        for (let j = 0; j < cols; j++) {
            for (let i = 0; i < rows - 1; i++) {
                const p1 = patch.grid[i][j];
                const p2 = patch.grid[i + 1][j];
                vertices.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
            }
        }
        
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        return geo;
    }, [patch]);

    return (
        <group>
            <mesh geometry={geometry}>
                <meshStandardMaterial 
                    color={patch.fill_color} 
                    transparent 
                    opacity={patch.alpha || 0.8} 
                    side={THREE.DoubleSide}
                    polygonOffset
                    polygonOffsetFactor={1}
                    polygonOffsetUnits={1}
                />
            </mesh>
            <lineSegments geometry={wireframeGeometry}>
                <lineBasicMaterial color="#252525" linewidth={1} />
            </lineSegments>
        </group>
    );
}

export function JunctionRenderer({ arms, intersectionHeight, guardRailHeight, guardRailThickness, bridgeDepth = 1.5, bridgeInset = 1.5 }: { arms: ArmSpec[], intersectionHeight: number, guardRailHeight: number, guardRailThickness: number, bridgeDepth?: number, bridgeInset?: number }) {
    const { patches } = useMemo(() => {
        const generator = new NWayJunctionGenerator(
            [0, 0, 0], // center
            22.0,      // arm_length
            4,         // hub_div
            6,         // longitudinal_subdivs
            5.0        // fillet_radius
        );
        return generator.build_case(arms, intersectionHeight, guardRailHeight, guardRailThickness, bridgeDepth, bridgeInset);
    }, [arms, intersectionHeight, guardRailHeight, guardRailThickness, bridgeDepth, bridgeInset]);

    return (
        <Canvas camera={{ position: [0, 40, 40], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 20, 10]} intensity={1} />
            <OrbitControls makeDefault />
            <Grid infiniteGrid fadeDistance={100} sectionColor="#aaaaaa" cellColor="#dddddd" />
            <group rotation={[-Math.PI / 2, 0, 0]}>
                {patches.map((patch, i) => (
                    <PatchMesh key={i} patch={patch} />
                ))}
            </group>
        </Canvas>
    );
}
