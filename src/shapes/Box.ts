import { Shape } from '../shapes/Shape'
import { Vec3 } from '../math/Vec3'
import { ConvexPolyhedron } from '../shapes/ConvexPolyhedron'
import type { Quaternion } from '../math/Quaternion'

/**
 * A 3d box shape.
 * @example
 *     const size = 1
 *     const halfExtents = new CANNON.Vec3(size, size, size)
 *     const boxShape = new CANNON.Box(halfExtents)
 *     const boxBody = new CANNON.Body({ mass: 1, shape: boxShape })
 *     world.addBody(boxBody)
 */
export class Box extends Shape {
  /**
   * The half extents of the box.
   */
  halfExtents: Vec3

  initHalfExtents: Vec3

  /**
   * Used by the contact generator to make contacts with other convex polyhedra for example.
   */
  convexPolyhedronRepresentation: ConvexPolyhedron

  constructor(halfExtents: Vec3) {
    super({ type: Shape.types.BOX })

    this.halfExtents = halfExtents
    this.initHalfExtents = new Vec3()
    this.initHalfExtents.copy(this.halfExtents)

    this.convexPolyhedronRepresentation = (null as unknown) as ConvexPolyhedron
    this.updateConvexPolyhedronRepresentation()
    this.updateBoundingSphereRadius()
  }

  /**
   * Updates the local convex polyhedron representation used for some collisions.
   */
  updateConvexPolyhedronRepresentation(): void {
    const sx = this.halfExtents.x
    const sy = this.halfExtents.y
    const sz = this.halfExtents.z
    const V = Vec3

    const vertices = [
      new V(-sx, -sy, -sz),
      new V(sx, -sy, -sz),
      new V(sx, sy, -sz),
      new V(-sx, sy, -sz),
      new V(-sx, -sy, sz),
      new V(sx, -sy, sz),
      new V(sx, sy, sz),
      new V(-sx, sy, sz),
    ]

    const faces = [
      [3, 2, 1, 0], // -z
      [4, 5, 6, 7], // +z
      [5, 4, 0, 1], // -y
      [2, 3, 7, 6], // +y
      [0, 4, 7, 3], // -x
      [1, 2, 6, 5], // +x
    ]

    const axes = [new V(0, 0, 1), new V(0, 1, 0), new V(1, 0, 0)]

    const h = new ConvexPolyhedron({ vertices, faces, axes })
    this.convexPolyhedronRepresentation = h
    h.material = this.material
  }

  /**
   * Calculate the inertia of the box.
   */
  calculateLocalInertia(mass: number, target = new Vec3()): Vec3 {
    Box.calculateInertia(this.halfExtents, mass, target)
    return target
  }

  static calculateInertia(halfExtents: Vec3, mass: number, target: Vec3): void {
    const e = halfExtents
    target.x = (1.0 / 12.0) * mass * (2 * e.y * 2 * e.y + 2 * e.z * 2 * e.z)
    target.y = (1.0 / 12.0) * mass * (2 * e.x * 2 * e.x + 2 * e.z * 2 * e.z)
    target.z = (1.0 / 12.0) * mass * (2 * e.y * 2 * e.y + 2 * e.x * 2 * e.x)
  }

  /**
   * Get the box 6 side normals
   * @param sixTargetVectors An array of 6 vectors, to store the resulting side normals in.
   * @param quat Orientation to apply to the normal vectors. If not provided, the vectors will be in respect to the local frame.
   */
  getSideNormals(sixTargetVectors: Vec3[], quat: Quaternion): Vec3[] {
    const sides = sixTargetVectors
    const ex = this.halfExtents
    sides[0].set(ex.x, 0, 0)
    sides[1].set(0, ex.y, 0)
    sides[2].set(0, 0, ex.z)
    sides[3].set(-ex.x, 0, 0)
    sides[4].set(0, -ex.y, 0)
    sides[5].set(0, 0, -ex.z)

    if (quat !== undefined) {
      for (let i = 0; i !== sides.length; i++) {
        quat.vmult(sides[i], sides[i])
      }
    }

    return sides
  }

  /**
   * Returns the volume of the box.
   */
  volume(): number {
    return 8.0 * this.halfExtents.x * this.halfExtents.y * this.halfExtents.z
  }

  /**
   * updateBoundingSphereRadius
   */
  updateBoundingSphereRadius(): void {
    this.boundingSphereRadius = this.halfExtents.length()
  }

  /**
   * forEachWorldCorner
   */
  forEachWorldCorner(pos: Vec3, quat: Quaternion, callback: (x: number, y: number, z: number) => void): void {
    const e = this.halfExtents
    const corners = [
      [e.x, e.y, e.z],
      [-e.x, e.y, e.z],
      [-e.x, -e.y, e.z],
      [-e.x, -e.y, -e.z],
      [e.x, -e.y, -e.z],
      [e.x, e.y, -e.z],
      [-e.x, e.y, -e.z],
      [e.x, -e.y, e.z],
    ]
    for (let i = 0; i < corners.length; i++) {
      worldCornerTempPos.set(corners[i][0], corners[i][1], corners[i][2])
      quat.vmult(worldCornerTempPos, worldCornerTempPos)
      pos.vadd(worldCornerTempPos, worldCornerTempPos)
      callback(worldCornerTempPos.x, worldCornerTempPos.y, worldCornerTempPos.z)
    }
  }

  /**
   * calculateWorldAABB
   */
  calculateWorldAABB(pos: Vec3, quat: Quaternion, min: Vec3, max: Vec3): void {
    const e = this.halfExtents
    worldCornersTemp[0].set(e.x, e.y, e.z)
    worldCornersTemp[1].set(-e.x, e.y, e.z)
    worldCornersTemp[2].set(-e.x, -e.y, e.z)
    worldCornersTemp[3].set(-e.x, -e.y, -e.z)
    worldCornersTemp[4].set(e.x, -e.y, -e.z)
    worldCornersTemp[5].set(e.x, e.y, -e.z)
    worldCornersTemp[6].set(-e.x, e.y, -e.z)
    worldCornersTemp[7].set(e.x, -e.y, e.z)

    const wc = worldCornersTemp[0]
    quat.vmult(wc, wc)
    pos.vadd(wc, wc)
    max.copy(wc)
    min.copy(wc)
    for (let i = 1; i < 8; i++) {
      const wc = worldCornersTemp[i]
      quat.vmult(wc, wc)
      pos.vadd(wc, wc)
      const x = wc.x
      const y = wc.y
      const z = wc.z
      if (x > max.x) {
        max.x = x
      }
      if (y > max.y) {
        max.y = y
      }
      if (z > max.z) {
        max.z = z
      }

      if (x < min.x) {
        min.x = x
      }
      if (y < min.y) {
        min.y = y
      }
      if (z < min.z) {
        min.z = z
      }
    }

    // Get each axis max
    // min.set(Infinity,Infinity,Infinity);
    // max.set(-Infinity,-Infinity,-Infinity);
    // this.forEachWorldCorner(pos,quat,function(x,y,z){
    //     if(x > max.x){
    //         max.x = x;
    //     }
    //     if(y > max.y){
    //         max.y = y;
    //     }
    //     if(z > max.z){
    //         max.z = z;
    //     }

    //     if(x < min.x){
    //         min.x = x;
    //     }
    //     if(y < min.y){
    //         min.y = y;
    //     }
    //     if(z < min.z){
    //         min.z = z;
    //     }
    // });
  }

  updateScale(scale: Vec3): void {
    const scaledHalfExtents = this.initHalfExtents.vmul(scale)
    this.halfExtents.copy(scaledHalfExtents)

    this.updateConvexPolyhedronRepresentation()
    this.updateBoundingSphereRadius()
  }
}

const worldCornerTempPos = new Vec3()

const worldCornersTemp = [
  new Vec3(),
  new Vec3(),
  new Vec3(),
  new Vec3(),
  new Vec3(),
  new Vec3(),
  new Vec3(),
  new Vec3(),
]
