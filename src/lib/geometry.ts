export type Vec3 = [number, number, number];

export function v_add(a: Vec3, b: Vec3): Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function v_sub(a: Vec3, b: Vec3): Vec3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function v_scale(a: Vec3, s: number): Vec3 {
    return [a[0] * s, a[1] * s, a[2] * s];
}

export function v_dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function v_len(a: Vec3): number {
    return Math.sqrt(v_dot(a, a));
}

export function v_norm(a: Vec3): Vec3 {
    const length = v_len(a);
    if (length <= 1.0e-9) {
        return [1.0, 0.0, 0.0];
    }
    return [a[0] / length, a[1] / length, a[2] / length];
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ];
}

export function angle_unit(angle_deg: number): Vec3 {
    const radians = (angle_deg * Math.PI) / 180.0;
    return [Math.cos(radians), Math.sin(radians), 0.0];
}

export function left_normal(direction: Vec3): Vec3 {
    return [-direction[1], direction[0], 0.0];
}

export function angle_gap(a1_deg: number, a2_deg: number): number {
    let gap = (a2_deg - a1_deg) % 360.0;
    if (gap < 0) gap += 360.0;
    return gap;
}

export function bisector_angle(a1_deg: number, a2_deg: number): number {
    return a1_deg + angle_gap(a1_deg, a2_deg) * 0.5;
}

export function cubic_hermite(p0: Vec3, p1: Vec3, m0: Vec3, m1: Vec3, t: number): Vec3 {
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2.0 * t3 - 3.0 * t2 + 1.0;
    const h10 = t3 - 2.0 * t2 + t;
    const h01 = -2.0 * t3 + 3.0 * t2;
    const h11 = t3 - t2;
    return [
        h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0],
        h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1],
        h00 * p0[2] + h10 * m0[2] + h01 * p1[2] + h11 * m1[2],
    ];
}

export function sample_hermite(p0: Vec3, p1: Vec3, m0: Vec3, m1: Vec3, count: number): Vec3[] {
    const result: Vec3[] = [];
    for (let i = 0; i < count; i++) {
        result.push(cubic_hermite(p0, p1, m0, m1, i / (count - 1)));
    }
    return result;
}

export function sample_linear(a: Vec3, b: Vec3, count: number): Vec3[] {
    const result: Vec3[] = [];
    for (let i = 0; i < count; i++) {
        result.push(lerp(a, b, i / (count - 1)));
    }
    return result;
}

export function polyline_resample(points: Vec3[], count: number): Vec3[] {
    if (points.length === 0) return [];
    if (points.length === 1) return Array(count).fill(points[0]);
    
    const lengths: number[] = [0.0];
    for (let i = 0; i < points.length - 1; i++) {
        lengths.push(lengths[lengths.length - 1] + v_len(v_sub(points[i + 1], points[i])));
    }
    const total = lengths[lengths.length - 1];
    if (total <= 1.0e-9) return Array(count).fill(points[0]);

    const result: Vec3[] = [];
    for (let i = 0; i < count; i++) {
        const target = total * i / (count - 1);
        for (let j = 0; j < points.length - 1; j++) {
            if ((target >= lengths[j] && target <= lengths[j + 1]) || j === points.length - 2) {
                const span = lengths[j + 1] - lengths[j];
                const local_t = span <= 1.0e-9 ? 0.0 : (target - lengths[j]) / span;
                result.push(lerp(points[j], points[j + 1], local_t));
                break;
            }
        }
    }
    return result;
}

export function sample_smooth_line(a: Vec3, b: Vec3, count: number): Vec3[] {
    const result: Vec3[] = [];
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const t_z = t * t * (3 - 2 * t);
        result.push([
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t_z
        ]);
    }
    return result;
}

export function sample_composite_boundary(M: Vec3, T: Vec3, C_sharp: Vec3, ArcMid: Vec3, count: number): Vec3[] {
    const result: Vec3[] = [];
    const cp = lerp(T, C_sharp, 0.5);
    
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        if (t < 0.5) {
            const local_t = t * 2.0;
            result.push(lerp(M, T, local_t));
        } else {
            const local_t = (t - 0.5) * 2.0;
            const inv_t = 1.0 - local_t;
            
            const x = inv_t * inv_t * T[0] + 2 * inv_t * local_t * cp[0] + local_t * local_t * ArcMid[0];
            const y = inv_t * inv_t * T[1] + 2 * inv_t * local_t * cp[1] + local_t * local_t * ArcMid[1];
            
            const t_z = local_t * local_t * (3 - 2 * local_t);
            const z = T[2] + (ArcMid[2] - T[2]) * t_z;
            
            result.push([x, y, z]);
        }
    }
    return result;
}

export function sample_bezier_quadratic(p0: Vec3, p1: Vec3, p2: Vec3, count: number): Vec3[] {
    const result: Vec3[] = [];
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const inv_t = 1.0 - t;
        const w0 = inv_t * inv_t;
        const w1 = 2 * inv_t * t;
        const w2 = t * t;
        
        const t_z = t * t * (3 - 2 * t);
        
        result.push([
            w0 * p0[0] + w1 * p1[0] + w2 * p2[0],
            w0 * p0[1] + w1 * p1[1] + w2 * p2[1],
            p0[2] + (p2[2] - p0[2]) * t_z
        ]);
    }
    return result;
}

export function create_radial_curve(center: Vec3, edge: Vec3, dz: number, count: number): Vec3[] {
    const dist = Math.sqrt((edge[0] - center[0])**2 + (edge[1] - center[1])**2);
    if (dist === 0) return sample_linear(center, edge, count);
    const handle_len = dist / 3;
    const dirX = (center[0] - edge[0]) / dist;
    const dirY = (center[1] - edge[1]) / dist;
    const p2: Vec3 = [
        edge[0] + dirX * handle_len,
        edge[1] + dirY * handle_len,
        edge[2] - dz * handle_len
    ];
    const p1: Vec3 = [
        center[0] - dirX * handle_len,
        center[1] - dirY * handle_len,
        center[2]
    ];
    return sample_bezier_cubic(center, p1, p2, edge, count);
}

export function sample_bezier_cubic(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, count: number): Vec3[] {
    const result: Vec3[] = [];
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const mt = 1.0 - t;
        const w0 = mt * mt * mt;
        const w1 = 3 * mt * mt * t;
        const w2 = 3 * mt * t * t;
        const w3 = t * t * t;
        result.push([
            w0 * p0[0] + w1 * p1[0] + w2 * p2[0] + w3 * p3[0],
            w0 * p0[1] + w1 * p1[1] + w2 * p2[1] + w3 * p3[1],
            w0 * p0[2] + w1 * p1[2] + w2 * p2[2] + w3 * p3[2]
        ]);
    }
    return result;
}

export function coons_patch(bottom: Vec3[], top: Vec3[], left: Vec3[], right: Vec3[]): Vec3[][] {
    const u_div = bottom.length - 1;
    const v_div = left.length - 1;
    const p00 = bottom[0];
    const p10 = bottom[bottom.length - 1];
    const p01 = top[0];
    const p11 = top[top.length - 1];
    
    const grid: Vec3[][] = [];
    for (let i = 0; i <= u_div; i++) {
        const u = i / u_div;
        const b = bottom[i];
        const t = top[i];
        const column: Vec3[] = [];
        for (let j = 0; j <= v_div; j++) {
            const v = j / v_div;
            const l = left[j];
            const r = right[j];
            
            const bilinear: Vec3 = [
                (1.0 - u) * (1.0 - v) * p00[0] + u * (1.0 - v) * p10[0] + (1.0 - u) * v * p01[0] + u * v * p11[0],
                (1.0 - u) * (1.0 - v) * p00[1] + u * (1.0 - v) * p10[1] + (1.0 - u) * v * p01[1] + u * v * p11[1],
                (1.0 - u) * (1.0 - v) * p00[2] + u * (1.0 - v) * p10[2] + (1.0 - u) * v * p01[2] + u * v * p11[2],
            ];
            
            const point: Vec3 = [
                (1.0 - v) * b[0] + v * t[0] + (1.0 - u) * l[0] + u * r[0] - bilinear[0],
                (1.0 - v) * b[1] + v * t[1] + (1.0 - u) * l[1] + u * r[1] - bilinear[1],
                (1.0 - v) * b[2] + v * t[2] + (1.0 - u) * l[2] + u * r[2] - bilinear[2],
            ];
            column.push(point);
        }
        grid.push(column);
    }
    return grid;
}

export function partition_edges(total_edges: number): number[] {
    if (total_edges === 6) return [2, 1, 2, 1];
    if (total_edges === 8) return [2, 2, 2, 2];
    const base = Math.floor(total_edges / 4);
    const counts = [base, base, base, base];
    for (let i = 0; i < total_edges - base * 4; i++) {
        counts[i] += 1;
    }
    return counts;
}

export function polygon_chains(vertices: Vec3[], edge_groups: number[]): [Vec3[], Vec3[], Vec3[], Vec3[]] {
    const chains: Vec3[][] = [];
    let idx = 0;
    const total = vertices.length;
    for (const group of edge_groups) {
        const chain: Vec3[] = [vertices[idx]];
        for (let i = 0; i < group; i++) {
            idx = (idx + 1) % total;
            chain.push(vertices[idx]);
        }
        chains.push(chain);
    }
    return [chains[0], chains[1], chains[2], chains[3]];
}

export interface ArmSpec {
    id: string;
    name: string;
    angle_deg: number;
    outer_height: number;
    fill_color: string;
    width: number;
    pavement_width_left: number;
    pavement_width_right: number;
    slope?: number;
    getZAtRadius?: (r: number) => { z: number, dz: number };
}

export interface PatchSpec {
    name: string;
    grid: Vec3[][];
    fill_color: string;
    alpha: number;
}

export interface ArmBoundary {
    name: string;
    angle_deg: number;
    direction: Vec3;
    left: Vec3;
    mouth_left: Vec3;
    mouth_right: Vec3;
    outer_left: Vec3;
    outer_right: Vec3;
    hub_left: Vec3;
    hub_right: Vec3;
    outer_height: number;
    fill_color: string;
}

export class RoadSegmentGenerator {
    widthStart: number;
    widthEnd: number;
    pave_left: number;
    pave_right: number;
    bridge_depth: number;
    bridge_inset: number;
    curb_height: number;
    guard_rail_height: number;
    guard_rail_thickness: number;

    constructor(
        widthStart: number = 10.0,
        widthEnd: number = 10.0,
        pave_left: number = 2.0,
        pave_right: number = 2.0,
        bridge_depth: number = 1.5,
        bridge_inset: number = 1.5,
        curb_height: number = 0.15,
        guard_rail_height: number = 0.8,
        guard_rail_thickness: number = 0.2
    ) {
        this.widthStart = widthStart;
        this.widthEnd = widthEnd;
        this.pave_left = pave_left;
        this.pave_right = pave_right;
        this.bridge_depth = bridge_depth;
        this.bridge_inset = bridge_inset;
        this.curb_height = curb_height;
        this.guard_rail_height = guard_rail_height;
        this.guard_rail_thickness = guard_rail_thickness;
    }

    build_segment(curve: Vec3[], startDir?: Vec3, endDir?: Vec3, fill_color: string = "#333333"): { patches: PatchSpec[] } {
        if (curve.length < 2) return { patches: [] };

        const patches: PatchSpec[] = [];
        const N = curve.length;

        const lengths = [0];
        for (let i = 1; i < N; i++) {
            lengths.push(lengths[i-1] + Math.hypot(curve[i][0] - curve[i-1][0], curve[i][1] - curve[i-1][1]));
        }
        const total_len = lengths[N - 1];

        const tangents: Vec3[] = [];
        const normals: Vec3[] = [];
        const half_w: number[] = [];

        for (let i = 0; i < N; i++) {
            let t: Vec3;
            if (i === 0) {
                t = startDir ? startDir : v_norm(v_sub(curve[1], curve[0]));
            } else if (i === N - 1) {
                t = endDir ? endDir : v_norm(v_sub(curve[N - 1], curve[N - 2]));
            } else {
                t = v_norm(v_sub(curve[i + 1], curve[i - 1]));
            }
            // Roadnet coordinate system: Z is up, Y is forward, X is right
            // We want the normal to point left in the XY plane
            const n = v_norm([-t[1], t[0], 0]);
            tangents.push(t);
            normals.push(n);

            const t_len = total_len > 0 ? lengths[i] / total_len : 0;
            half_w.push((this.widthStart * (1 - t_len) + this.widthEnd * t_len) / 2);
        }

        const pave_l = this.pave_left;
        const pave_r = this.pave_right;

        // Generate lines
        const center_line = curve;
        const left_inner = curve.map((p, i) => v_add(p, v_scale(normals[i], half_w[i])));
        const right_inner = curve.map((p, i) => v_add(p, v_scale(normals[i], -half_w[i])));
        
        const left_outer = curve.map((p, i) => v_add(p, v_scale(normals[i], half_w[i] + pave_l)));
        const right_outer = curve.map((p, i) => v_add(p, v_scale(normals[i], -(half_w[i] + pave_r))));

        // Road Surface
        patches.push({
            name: "Road Surface",
            grid: [left_inner, right_inner],
            fill_color: fill_color,
            alpha: 1.0
        });

        // Left Curb Drop
        const left_inner_raised = left_inner.map(p => [p[0], p[1], p[2] + this.curb_height] as Vec3);
        patches.push({
            name: "Left Curb Drop",
            grid: [left_inner, left_inner_raised],
            fill_color: "#737373",
            alpha: 1.0
        });

        // Left Pavement
        const left_outer_raised = left_outer.map(p => [p[0], p[1], p[2] + this.curb_height] as Vec3);
        patches.push({
            name: "Left Pavement",
            grid: [left_outer_raised, left_inner_raised],
            fill_color: "#a3a3a3",
            alpha: 1.0
        });

        // Right Curb Drop
        const right_inner_raised = right_inner.map(p => [p[0], p[1], p[2] + this.curb_height] as Vec3);
        patches.push({
            name: "Right Curb Drop",
            grid: [right_inner_raised, right_inner],
            fill_color: "#737373",
            alpha: 1.0
        });

        // Right Pavement
        const right_outer_raised = right_outer.map(p => [p[0], p[1], p[2] + this.curb_height] as Vec3);
        patches.push({
            name: "Right Pavement",
            grid: [right_inner_raised, right_outer_raised],
            fill_color: "#a3a3a3",
            alpha: 1.0
        });

        // Superstructure Sides
        const left_bottom = left_outer.map((p, i) => v_add([p[0], p[1], p[2] - this.bridge_depth], v_scale(normals[i], -this.bridge_inset)));
        patches.push({
            name: "Left Superstructure Side",
            grid: [left_bottom, left_outer_raised],
            fill_color: "#888888",
            alpha: 1.0
        });

        const right_bottom = right_outer.map((p, i) => v_add([p[0], p[1], p[2] - this.bridge_depth], v_scale(normals[i], this.bridge_inset)));
        patches.push({
            name: "Right Superstructure Side",
            grid: [right_bottom, right_outer_raised],
            fill_color: "#888888",
            alpha: 1.0
        });

        // Bottom Face
        patches.push({
            name: "Bottom Face",
            grid: [right_bottom, left_bottom],
            fill_color: "#777777",
            alpha: 1.0
        });

        // Guard Rails
        patches.push(...this.build_guard_rail(left_outer_raised, normals, false));
        patches.push(...this.build_guard_rail(right_outer_raised, normals, true));

        return { patches };
    }

    private build_guard_rail(
        curve: Vec3[],
        normals: Vec3[],
        point_right: boolean
    ): PatchSpec[] {
        if (this.guard_rail_height <= 0 || this.guard_rail_thickness <= 0) return [];

        const patches: PatchSpec[] = [];
        
        const h_top = this.guard_rail_height * 0.8;
        const h_bottom = this.guard_rail_height * 0.4;
        const h_mid = (h_top + h_bottom) / 2;
        const h_q3 = h_bottom + (h_top - h_bottom) * 0.75;
        const h_q1 = h_bottom + (h_top - h_bottom) * 0.25;

        const profile = [
            { offset: this.guard_rail_thickness, z: h_top },
            { offset: 0, z: h_q3 },
            { offset: this.guard_rail_thickness, z: h_mid },
            { offset: 0, z: h_q1 },
            { offset: this.guard_rail_thickness, z: h_bottom }
        ];

        const rail_lines: Vec3[][] = profile.map(prof => 
            curve.map((p, i) => {
                const n = normals[i];
                const nx = point_right ? -n[0] : n[0];
                const ny = point_right ? -n[1] : n[1];
                return [
                    p[0] + nx * prof.offset,
                    p[1] + ny * prof.offset,
                    p[2] + prof.z
                ] as Vec3;
            })
        );

        for (let i = 0; i < profile.length - 1; i++) {
            patches.push({
                name: `Rail Strip ${i}`,
                grid: point_right ? [rail_lines[i], rail_lines[i + 1]] : [rail_lines[i + 1], rail_lines[i]],
                fill_color: "#cbd5e1",
                alpha: 1.0
            });
        }

        return patches;
    }
}

export class NWayJunctionGenerator {
    center: Vec3;
    arm_length: number;
    hub_div: number;
    longitudinal_subdivs: number;
    fillet_radius: number;

    constructor(
        center: Vec3,
        arm_length: number,
        hub_div: number,
        longitudinal_subdivs: number,
        fillet_radius: number = 5.0
    ) {
        this.center = center;
        this.arm_length = arm_length;
        this.hub_div = hub_div;
        this.longitudinal_subdivs = longitudinal_subdivs;
        this.fillet_radius = fillet_radius;
    }

    build_case(arms: ArmSpec[], intersection_height: number = 0, guardRailHeight: number = 0.8, guardRailThickness: number = 0.2, bridge_depth: number = 1.5, bridge_inset: number = 1.5): { patches: PatchSpec[], armData: { id: string, R: number, MC: Vec3, D: Vec3 }[] } {
        const sorted_arms = [...arms].sort((a, b) => a.angle_deg - b.angle_deg);
        const N = sorted_arms.length;
        
        const D: Vec3[] = [];
        const Norm: Vec3[] = [];
        const HalfW: number[] = [];
        const PaveL: number[] = [];
        const PaveR: number[] = [];
        for (let i = 0; i < N; i++) {
            D.push(angle_unit(sorted_arms[i].angle_deg));
            Norm.push(left_normal(D[i]));
            HalfW.push(sorted_arms[i].width * 0.5);
            PaveL.push(sorted_arms[i].pavement_width_left);
            PaveR.push(sorted_arms[i].pavement_width_right);
        }
        
        const C: Vec3[] = [];
        const C_outer: Vec3[] = [];
        const C_bottom: Vec3[] = [];
        for (let i = 0; i < N; i++) {
            const next_idx = (i + 1) % N;
            const d1 = D[i];
            const d2 = D[next_idx];
            const det = d1[0] * d2[1] - d1[1] * d2[0];
            
            // Inner intersection
            const p1 = v_add(this.center, v_scale(Norm[i], HalfW[i]));
            const p2 = v_add(this.center, v_scale(Norm[next_idx], -HalfW[next_idx]));
            let c_point: Vec3;
            if (Math.abs(det) < 1e-4) {
                c_point = v_add(p1, v_scale(d1, HalfW[i] * 2));
            } else {
                const dx = p2[0] - p1[0];
                const dy = p2[1] - p1[1];
                let t1 = (dx * d2[1] - dy * d2[0]) / det;
                if (t1 > 50.0) t1 = 50.0;
                if (t1 < -50.0) t1 = -50.0;
                c_point = v_add(p1, v_scale(d1, t1));
            }
            c_point[2] = 0;
            C.push(c_point);

            // Outer intersection
            const p1_outer = v_add(this.center, v_scale(Norm[i], HalfW[i] + PaveL[i]));
            const p2_outer = v_add(this.center, v_scale(Norm[next_idx], -(HalfW[next_idx] + PaveR[next_idx])));
            let c_outer_point: Vec3;
            if (Math.abs(det) < 1e-4) {
                c_outer_point = v_add(p1_outer, v_scale(d1, (HalfW[i] + PaveL[i]) * 2));
            } else {
                const dx = p2_outer[0] - p1_outer[0];
                const dy = p2_outer[1] - p1_outer[1];
                let t1 = (dx * d2[1] - dy * d2[0]) / det;
                if (t1 > 50.0) t1 = 50.0;
                if (t1 < -50.0) t1 = -50.0;
                c_outer_point = v_add(p1_outer, v_scale(d1, t1));
            }
            c_outer_point[2] = 0;
            C_outer.push(c_outer_point);

            // Bottom intersection
            const p1_bottom = v_add(this.center, v_scale(Norm[i], HalfW[i] + PaveL[i] - bridge_inset));
            const p2_bottom = v_add(this.center, v_scale(Norm[next_idx], -(HalfW[next_idx] + PaveR[next_idx] - bridge_inset)));
            let c_bottom_point: Vec3;
            if (Math.abs(det) < 1e-4) {
                c_bottom_point = v_add(p1_bottom, v_scale(d1, (HalfW[i] + PaveL[i] - bridge_inset) * 2));
            } else {
                const dx = p2_bottom[0] - p1_bottom[0];
                const dy = p2_bottom[1] - p1_bottom[1];
                let t1 = (dx * d2[1] - dy * d2[0]) / det;
                if (t1 > 50.0) t1 = 50.0;
                if (t1 < -50.0) t1 = -50.0;
                c_bottom_point = v_add(p1_bottom, v_scale(d1, t1));
            }
            c_bottom_point[2] = intersection_height - bridge_depth;
            C_bottom.push(c_bottom_point);
        }
        
        const R: number[] = [];
        for (let i = 0; i < N; i++) {
            const prev_idx = (i - 1 + N) % N;
            const proj_L = v_dot(v_sub(C[i], this.center), D[i]);
            const proj_R = v_dot(v_sub(C[prev_idx], this.center), D[i]);
            const proj_outer_L = v_dot(v_sub(C_outer[i], this.center), D[i]);
            const proj_outer_R = v_dot(v_sub(C_outer[prev_idx], this.center), D[i]);
            let r_val = Math.max(proj_L, proj_R, proj_outer_L, proj_outer_R) + this.fillet_radius;
            if (r_val > 50.0) r_val = 50.0;
            R.push(r_val);
        }
        
        const MC: Vec3[] = [];
        const ML: Vec3[] = [];
        const MR: Vec3[] = [];
        const ML_outer: Vec3[] = [];
        const MR_outer: Vec3[] = [];
        const ML_bottom: Vec3[] = [];
        const MR_bottom: Vec3[] = [];
        for (let i = 0; i < N; i++) {
            const mc = v_add(this.center, v_scale(D[i], R[i]));
            MC.push(mc);
            ML.push(v_add(mc, v_scale(Norm[i], HalfW[i])));
            MR.push(v_sub(mc, v_scale(Norm[i], HalfW[i])));
            ML_outer.push(v_add(mc, v_scale(Norm[i], HalfW[i] + PaveL[i])));
            MR_outer.push(v_sub(mc, v_scale(Norm[i], HalfW[i] + PaveR[i])));
            
            const ml_b = v_add(mc, v_scale(Norm[i], HalfW[i] + PaveL[i] - bridge_inset));
            ml_b[2] = intersection_height - bridge_depth;
            ML_bottom.push(ml_b);
            
            const mr_b = v_sub(mc, v_scale(Norm[i], HalfW[i] + PaveR[i] - bridge_inset));
            mr_b[2] = intersection_height - bridge_depth;
            MR_bottom.push(mr_b);
        }
        
        const center_z = intersection_height;
        
        const P_center: Vec3 = [this.center[0], this.center[1], center_z];
        const P_center_bottom: Vec3 = [this.center[0], this.center[1], center_z - bridge_depth];
        
        const MC_bottom: Vec3[] = [];
        let sum_z = 0;
        const arm_dz: number[] = [];
        for (let i = 0; i < N; i++) {
            let z = center_z;
            let dz = 0;
            if (sorted_arms[i].getZAtRadius) {
                const res = sorted_arms[i].getZAtRadius!(R[i]);
                z = res.z;
                dz = res.dz;
            } else {
                const slope = sorted_arms[i].slope || 0;
                z = center_z + slope * R[i];
                dz = slope;
            }
            arm_dz.push(dz);
            MC[i][2] = z;
            ML[i][2] = z;
            MR[i][2] = z;
            ML_outer[i][2] = z;
            MR_outer[i][2] = z;
            ML_bottom[i][2] = z - bridge_depth;
            MR_bottom[i][2] = z - bridge_depth;
            sum_z += z;
        }
        P_center[2] = sum_z / N;
        P_center_bottom[2] = P_center[2] - bridge_depth;

        for (let i = 0; i < N; i++) {
            const next_idx = (i + 1) % N;
            const z = (ML[i][2] + MR[next_idx][2]) / 2;
            C[i][2] = z;
            C_outer[i][2] = z;
            C_bottom[i][2] = z - bridge_depth;
            
            const mc_b = [MC[i][0], MC[i][1], MC[i][2] - bridge_depth] as Vec3;
            MC_bottom.push(mc_b);
        }
        
        const ArcMid: Vec3[] = [];
        const ArcMid_bottom: Vec3[] = [];
        for (let i = 0; i < N; i++) {
            const next_idx = (i + 1) % N;
            ArcMid.push([
                0.25 * ML[i][0] + 0.5 * C[i][0] + 0.25 * MR[next_idx][0],
                0.25 * ML[i][1] + 0.5 * C[i][1] + 0.25 * MR[next_idx][1],
                (ML[i][2] + C[i][2] * 2 + MR[next_idx][2]) / 4
            ]);
            ArcMid_bottom.push([
                0.25 * ML_bottom[i][0] + 0.5 * C_bottom[i][0] + 0.25 * MR_bottom[next_idx][0],
                0.25 * ML_bottom[i][1] + 0.5 * C_bottom[i][1] + 0.25 * MR_bottom[next_idx][1],
                (ML_bottom[i][2] + C_bottom[i][2] * 2 + MR_bottom[next_idx][2]) / 4
            ]);
        }
        
        const patches: PatchSpec[] = [];
        
        const arc_dz: number[] = [];
        for (let i = 0; i < N; i++) {
            const next_idx = (i + 1) % N;
            arc_dz.push((arm_dz[i] + arm_dz[next_idx]) / 2);
        }

        for (let i = 0; i < N; i++) {
            const prev_idx = (i - 1 + N) % N;
            const next_idx = (i + 1) % N;
            
            const full_arc_prev = sample_bezier_quadratic(ML[prev_idx], C[prev_idx], MR[i], 2 * this.hub_div + 1);
            const right_arc_half = full_arc_prev.slice(this.hub_div, 2 * this.hub_div + 1);
            
            patches.push({
                name: `Hub Right ${i}`,
                grid: coons_patch(
                    create_radial_curve(P_center, ArcMid[prev_idx], arc_dz[prev_idx], this.hub_div + 1),
                    sample_linear(MC[i], MR[i], this.hub_div + 1),
                    create_radial_curve(P_center, MC[i], arm_dz[i], this.hub_div + 1),
                    right_arc_half
                ),
                fill_color: "#d4d4d4",
                alpha: 1.0
            });
            
            const full_arc_prev_b = sample_bezier_quadratic(ML_bottom[prev_idx], C_bottom[prev_idx], MR_bottom[i], 2 * this.hub_div + 1);
            const right_arc_half_b = full_arc_prev_b.slice(this.hub_div, 2 * this.hub_div + 1);
            
            patches.push({
                name: `Hub Right Bottom ${i}`,
                grid: coons_patch(
                    create_radial_curve(P_center_bottom, ArcMid_bottom[prev_idx], arc_dz[prev_idx], this.hub_div + 1),
                    sample_linear(MC_bottom[i], MR_bottom[i], this.hub_div + 1),
                    create_radial_curve(P_center_bottom, MC_bottom[i], arm_dz[i], this.hub_div + 1),
                    right_arc_half_b
                ),
                fill_color: "#777777",
                alpha: 1.0
            });
            
            const full_arc_curr = sample_bezier_quadratic(ML[i], C[i], MR[next_idx], 2 * this.hub_div + 1);
            const left_arc_half = full_arc_curr.slice(0, this.hub_div + 1).reverse();
            
            patches.push({
                name: `Hub Left ${i}`,
                grid: coons_patch(
                    create_radial_curve(P_center, ArcMid[i], arc_dz[i], this.hub_div + 1).reverse(),
                    sample_linear(ML[i], MC[i], this.hub_div + 1),
                    left_arc_half,
                    create_radial_curve(P_center, MC[i], arm_dz[i], this.hub_div + 1)
                ),
                fill_color: "#d4d4d4",
                alpha: 1.0
            });
            
            const full_arc_curr_b = sample_bezier_quadratic(ML_bottom[i], C_bottom[i], MR_bottom[next_idx], 2 * this.hub_div + 1);
            const left_arc_half_b = full_arc_curr_b.slice(0, this.hub_div + 1).reverse();
            
            patches.push({
                name: `Hub Left Bottom ${i}`,
                grid: coons_patch(
                    create_radial_curve(P_center_bottom, ArcMid_bottom[i], arc_dz[i], this.hub_div + 1).reverse(),
                    sample_linear(ML_bottom[i], MC_bottom[i], this.hub_div + 1),
                    left_arc_half_b,
                    create_radial_curve(P_center_bottom, MC_bottom[i], arm_dz[i], this.hub_div + 1)
                ),
                fill_color: "#777777",
                alpha: 1.0
            });

            // --- Pavement Generation ---
            const curb_height = 0.15;
            const pave_div = 2;

            // 1. Corner Pavement (between Arm i Left and Arm next_idx Right)
            const full_outer_arc_curr = sample_bezier_quadratic(ML_outer[i], C_outer[i], MR_outer[next_idx], 2 * this.hub_div + 1);
            
            const curb_drop_grid: Vec3[][] = [
                full_arc_curr.map(p => [p[0], p[1], p[2]] as Vec3),
                full_arc_curr.map(p => [p[0], p[1], p[2] + curb_height] as Vec3)
            ];
            
            patches.push({
                name: `Corner Curb Drop ${i}`,
                grid: curb_drop_grid,
                fill_color: "#737373", // darker gray for curb face
                alpha: 1.0
            });
            
            const pave_bottom = full_arc_curr.map(p => [p[0], p[1], p[2] + curb_height] as Vec3);
            const pave_top = full_outer_arc_curr.map(p => [p[0], p[1], p[2] + curb_height] as Vec3);
            
            const corner_pave_grid = coons_patch(
                pave_bottom,
                pave_top,
                sample_linear(pave_bottom[0], pave_top[0], pave_div + 1),
                sample_linear(pave_bottom[pave_bottom.length - 1], pave_top[pave_top.length - 1], pave_div + 1)
            );
            
            patches.push({
                name: `Corner Pavement ${i}`,
                grid: corner_pave_grid,
                fill_color: "#a3a3a3", // lighter gray for pavement top
                alpha: 1.0
            });
            
            patches.push(...this.build_guard_rail(pave_top, true, guardRailHeight, guardRailThickness, '#a0a0a0', curb_height));
            
            const corner_superstructure_side = coons_patch(
                pave_top,
                full_arc_curr_b,
                sample_linear(pave_top[0], full_arc_curr_b[0], pave_div + 1),
                sample_linear(pave_top[pave_top.length - 1], full_arc_curr_b[full_arc_curr_b.length - 1], pave_div + 1)
            );
            
            patches.push({
                name: `Corner Superstructure Side ${i}`,
                grid: corner_superstructure_side,
                fill_color: "#888888",
                alpha: 1.0
            });
        }
        
        const armData = sorted_arms.map((arm, i) => ({
            id: arm.id,
            R: R[i],
            MC: MC[i],
            D: D[i]
        }));
        
        return { patches, armData };
    }

    private build_guard_rail(
        curve: Vec3[],
        point_right: boolean,
        height: number,
        thickness: number,
        color: string,
        curb_height: number = 0
    ): PatchSpec[] {
        if (height <= 0 || thickness <= 0) return [];

        const patches: PatchSpec[] = [];
        const normals: Vec3[] = [];
        const tangents: Vec3[] = [];

        for (let i = 0; i < curve.length; i++) {
            const prev = i === 0 ? curve[0] : curve[i - 1];
            const next = i === curve.length - 1 ? curve[curve.length - 1] : curve[i + 1];
            
            let dx = next[0] - prev[0];
            let dy = next[1] - prev[1];
            
            if (dx === 0 && dy === 0) {
                dx = 1; dy = 0;
            } else {
                const len = Math.hypot(dx, dy);
                dx /= len;
                dy /= len;
            }
            
            tangents.push([dx, dy, 0]);
            let nx = point_right ? dy : -dy;
            let ny = point_right ? -dx : dx;
            normals.push([nx, ny, 0]);
        }

        const h_top = height * 0.8;
        const h_bottom = height * 0.4;
        const h_mid = (h_top + h_bottom) / 2;
        const h_q3 = h_bottom + (h_top - h_bottom) * 0.75;
        const h_q1 = h_bottom + (h_top - h_bottom) * 0.25;

        // W-beam profile points (offset outward, z)
        const profile = [
            { offset: thickness, z: h_top },
            { offset: 0, z: h_q3 },
            { offset: thickness, z: h_mid },
            { offset: 0, z: h_q1 },
            { offset: thickness, z: h_bottom }
        ];

        const rail_lines: Vec3[][] = profile.map(prof => 
            curve.map((p, i) => [
                p[0] + normals[i][0] * prof.offset,
                p[1] + normals[i][1] * prof.offset,
                p[2] + prof.z
            ] as Vec3)
        );

        // Create patches for the W-beam
        for (let i = 0; i < profile.length - 1; i++) {
            patches.push({
                name: `Rail Strip ${i}`,
                grid: point_right ? [rail_lines[i], rail_lines[i + 1]] : [rail_lines[i + 1], rail_lines[i]],
                fill_color: "#cbd5e1", // Light metallic grey
                alpha: 1.0
            });
        }

        // Posts
        let dist = 0;
        const post_spacing = 2.0; 
        const post_size = 0.15;
        const post_half = post_size / 2;
        const post_offset = thickness + post_half; // Center of post

        for (let i = 0; i < curve.length; i++) {
            if (i > 0) {
                const p1 = curve[i - 1];
                const p2 = curve[i];
                dist += Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
            }

            if (i === 0 || i === curve.length - 1 || dist >= post_spacing) {
                if (dist >= post_spacing) dist = 0;

                const p = curve[i];
                const n = normals[i];
                const t = tangents[i];

                const center_x = p[0] + n[0] * post_offset;
                const center_y = p[1] + n[1] * post_offset;

                // Posts go down to the ground (subtract curb_height)
                const p_fl = [center_x - n[0] * post_half + t[0] * post_half, center_y - n[1] * post_half + t[1] * post_half, p[2] - curb_height] as Vec3;
                const p_fr = [center_x - n[0] * post_half - t[0] * post_half, center_y - n[1] * post_half - t[1] * post_half, p[2] - curb_height] as Vec3;
                const p_bl = [center_x + n[0] * post_half + t[0] * post_half, center_y + n[1] * post_half + t[1] * post_half, p[2] - curb_height] as Vec3;
                const p_br = [center_x + n[0] * post_half - t[0] * post_half, center_y + n[1] * post_half - t[1] * post_half, p[2] - curb_height] as Vec3;

                const top_z = p[2] + h_top;
                const pt_fl = [p_fl[0], p_fl[1], top_z] as Vec3;
                const pt_fr = [p_fr[0], p_fr[1], top_z] as Vec3;
                const pt_bl = [p_bl[0], p_bl[1], top_z] as Vec3;
                const pt_br = [p_br[0], p_br[1], top_z] as Vec3;

                const post_color = "#52525b"; // Darker grey for posts
                patches.push({ name: "Post Front", grid: [[p_fl, p_fr], [pt_fl, pt_fr]], fill_color: post_color, alpha: 1.0 });
                patches.push({ name: "Post Back", grid: [[p_br, p_bl], [pt_br, pt_bl]], fill_color: post_color, alpha: 1.0 });
                patches.push({ name: "Post Left", grid: [[p_bl, p_fl], [pt_bl, pt_fl]], fill_color: post_color, alpha: 1.0 });
                patches.push({ name: "Post Right", grid: [[p_fr, p_br], [pt_fr, pt_br]], fill_color: post_color, alpha: 1.0 });
            }
        }

        return patches;
    }
}
