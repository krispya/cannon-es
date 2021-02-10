import * as CANNON from '../../dist/cannon-es.js'
import * as THREE from 'https://unpkg.com/three@0.125.2/build/three.module.js'
import { ConvexGeometry } from 'https://unpkg.com/three@0.125.2/examples/jsm/geometries/ConvexGeometry.js'
import { Geometry } from 'https://unpkg.com/three@0.125.2/examples/jsm/deprecated/Geometry.js'
import { BufferGeometryUtils } from 'https://unpkg.com/three@0.125.2/examples/jsm/utils/BufferGeometryUtils.js'
import { SimplifyModifier } from 'https://unpkg.com/three@0.125.2/examples/jsm/modifiers/SimplifyModifier.js'

class DirectGeometry {
  constructor() {
    this.vertices = []
    this.normals = []
    this.colors = []
    this.uvs = []
    this.uvs2 = []

    this.groups = []

    this.morphTargets = {}

    this.skinWeights = []
    this.skinIndices = []

    // this.lineDistances = [];

    this.boundingBox = null
    this.boundingSphere = null

    // update flags

    this.verticesNeedUpdate = false
    this.normalsNeedUpdate = false
    this.colorsNeedUpdate = false
    this.uvsNeedUpdate = false
    this.groupsNeedUpdate = false
  }

  computeGroups(geometry) {
    const groups = []

    let group, i
    let materialIndex = undefined

    const faces = geometry.faces

    for (i = 0; i < faces.length; i++) {
      const face = faces[i]

      // materials

      if (face.materialIndex !== materialIndex) {
        materialIndex = face.materialIndex

        if (group !== undefined) {
          group.count = i * 3 - group.start
          groups.push(group)
        }

        group = {
          start: i * 3,
          materialIndex: materialIndex,
        }
      }
    }

    if (group !== undefined) {
      group.count = i * 3 - group.start
      groups.push(group)
    }

    this.groups = groups
  }

  fromGeometry(geometry) {
    const faces = geometry.faces
    const vertices = geometry.vertices
    const faceVertexUvs = geometry.faceVertexUvs

    const hasFaceVertexUv = faceVertexUvs[0] && faceVertexUvs[0].length > 0
    const hasFaceVertexUv2 = faceVertexUvs[1] && faceVertexUvs[1].length > 0

    // morphs

    const morphTargets = geometry.morphTargets
    const morphTargetsLength = morphTargets.length

    let morphTargetsPosition

    if (morphTargetsLength > 0) {
      morphTargetsPosition = []

      for (let i = 0; i < morphTargetsLength; i++) {
        morphTargetsPosition[i] = {
          name: morphTargets[i].name,
          data: [],
        }
      }

      this.morphTargets.position = morphTargetsPosition
    }

    const morphNormals = geometry.morphNormals
    const morphNormalsLength = morphNormals.length

    let morphTargetsNormal

    if (morphNormalsLength > 0) {
      morphTargetsNormal = []

      for (let i = 0; i < morphNormalsLength; i++) {
        morphTargetsNormal[i] = {
          name: morphNormals[i].name,
          data: [],
        }
      }

      this.morphTargets.normal = morphTargetsNormal
    }

    // skins

    const skinIndices = geometry.skinIndices
    const skinWeights = geometry.skinWeights

    const hasSkinIndices = skinIndices.length === vertices.length
    const hasSkinWeights = skinWeights.length === vertices.length

    //

    if (vertices.length > 0 && faces.length === 0) {
      console.error('THREE.DirectGeometry: Faceless geometries are not supported.')
    }

    for (let i = 0; i < faces.length; i++) {
      const face = faces[i]

      this.vertices.push(vertices[face.a], vertices[face.b], vertices[face.c])

      const vertexNormals = face.vertexNormals

      if (vertexNormals.length === 3) {
        this.normals.push(vertexNormals[0], vertexNormals[1], vertexNormals[2])
      } else {
        const normal = face.normal

        this.normals.push(normal, normal, normal)
      }

      const vertexColors = face.vertexColors

      if (vertexColors.length === 3) {
        this.colors.push(vertexColors[0], vertexColors[1], vertexColors[2])
      } else {
        const color = face.color

        this.colors.push(color, color, color)
      }

      if (hasFaceVertexUv === true) {
        const vertexUvs = faceVertexUvs[0][i]

        if (vertexUvs !== undefined) {
          this.uvs.push(vertexUvs[0], vertexUvs[1], vertexUvs[2])
        } else {
          console.warn('THREE.DirectGeometry.fromGeometry(): Undefined vertexUv ', i)

          this.uvs.push(new Vector2(), new Vector2(), new Vector2())
        }
      }

      if (hasFaceVertexUv2 === true) {
        const vertexUvs = faceVertexUvs[1][i]

        if (vertexUvs !== undefined) {
          this.uvs2.push(vertexUvs[0], vertexUvs[1], vertexUvs[2])
        } else {
          console.warn('THREE.DirectGeometry.fromGeometry(): Undefined vertexUv2 ', i)

          this.uvs2.push(new Vector2(), new Vector2(), new Vector2())
        }
      }

      // morphs

      for (let j = 0; j < morphTargetsLength; j++) {
        const morphTarget = morphTargets[j].vertices

        morphTargetsPosition[j].data.push(morphTarget[face.a], morphTarget[face.b], morphTarget[face.c])
      }

      for (let j = 0; j < morphNormalsLength; j++) {
        const morphNormal = morphNormals[j].vertexNormals[i]

        morphTargetsNormal[j].data.push(morphNormal.a, morphNormal.b, morphNormal.c)
      }

      // skins

      if (hasSkinIndices) {
        this.skinIndices.push(skinIndices[face.a], skinIndices[face.b], skinIndices[face.c])
      }

      if (hasSkinWeights) {
        this.skinWeights.push(skinWeights[face.a], skinWeights[face.b], skinWeights[face.c])
      }
    }

    this.computeGroups(geometry)

    this.verticesNeedUpdate = geometry.verticesNeedUpdate
    this.normalsNeedUpdate = geometry.normalsNeedUpdate
    this.colorsNeedUpdate = geometry.colorsNeedUpdate
    this.uvsNeedUpdate = geometry.uvsNeedUpdate
    this.groupsNeedUpdate = geometry.groupsNeedUpdate

    if (geometry.boundingSphere !== null) {
      this.boundingSphere = geometry.boundingSphere.clone()
    }

    if (geometry.boundingBox !== null) {
      this.boundingBox = geometry.boundingBox.clone()
    }

    return this
  }
}

/**
 * Converts a cannon.js shape to a three.js geometry
 * ⚠️ Warning: it will not work if the shape has been rotated
 * or scaled beforehand, for example with ConvexPolyhedron.transformAllPoints().
 * @param {Shape} shape The cannon.js shape
 * @return {Geometry} The three.js geometry
 */
export function shapeToGeometry(shape) {
  switch (shape.type) {
    case CANNON.Shape.types.SPHERE: {
      return new THREE.SphereGeometry(shape.radius, 8, 8)
    }

    case CANNON.Shape.types.PARTICLE: {
      return new THREE.SphereGeometry(0.1, 8, 8)
    }

    case CANNON.Shape.types.PLANE: {
      return new THREE.PlaneGeometry(500, 500, 4, 4)
    }

    case CANNON.Shape.types.BOX: {
      return new THREE.BoxGeometry(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2)
    }

    case CANNON.Shape.types.CYLINDER: {
      return new THREE.CylinderGeometry(shape.radiusTop, shape.radiusBottom, shape.height, shape.numSegments)
    }

    case CANNON.Shape.types.CONVEXPOLYHEDRON: {
      const geometry = new THREE.BufferGeometry()

      // Add vertices
      const positions = []
      for (let i = 0; i < shape.vertices.length; i++) {
        const vertex = shape.vertices[i]
        positions.push(vertex.x, vertex.y, vertex.z)
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

      // Add faces
      const indices = []
      for (let i = 0; i < shape.faces.length; i++) {
        const face = shape.faces[i]

        const a = face[0]
        for (let j = 1; j < face.length - 1; j++) {
          const b = face[j]
          const c = face[j + 1]
          indices.push(a, b, c)
        }
      }
      geometry.setIndex(indices)

      geometry.computeBoundingSphere()

      return geometry
    }

    case CANNON.Shape.types.HEIGHTFIELD: {
      const geometry = new THREE.BufferGeometry()

      const positions = []
      const v0 = new CANNON.Vec3()
      const v1 = new CANNON.Vec3()
      const v2 = new CANNON.Vec3()
      for (let xi = 0; xi < shape.data.length - 1; xi++) {
        for (let yi = 0; yi < shape.data[xi].length - 1; yi++) {
          for (let k = 0; k < 2; k++) {
            shape.getConvexTrianglePillar(xi, yi, k === 0)
            v0.copy(shape.pillarConvex.vertices[0])
            v1.copy(shape.pillarConvex.vertices[1])
            v2.copy(shape.pillarConvex.vertices[2])
            v0.vadd(shape.pillarOffset, v0)
            v1.vadd(shape.pillarOffset, v1)
            v2.vadd(shape.pillarOffset, v2)
            positions.push(v0.x, v0.y, v0.z)
            positions.push(v1.x, v1.y, v1.z)
            positions.push(v2.x, v2.y, v2.z)
          }
        }
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

      geometry.computeBoundingSphere()
      geometry.computeVertexNormals()

      return geometry
    }

    case CANNON.Shape.types.TRIMESH: {
      const geometry = new THREE.BufferGeometry()

      const positions = []
      const v0 = new CANNON.Vec3()
      const v1 = new CANNON.Vec3()
      const v2 = new CANNON.Vec3()
      for (let i = 0; i < shape.indices.length / 3; i++) {
        shape.getTriangleVertices(i, v0, v1, v2)
        positions.push(v0.x, v0.y, v0.z)
        positions.push(v1.x, v1.y, v1.z)
        positions.push(v2.x, v2.y, v2.z)
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

      geometry.computeBoundingSphere()
      geometry.computeVertexNormals()

      return geometry
    }

    default: {
      throw new Error(`Shape not recognized: "${shape.type}"`)
    }
  }
}

/**
 * Converts a cannon.js body to a three.js mesh group
 * @param {Body} body The cannon.js body
 * @param {Material} material The material the mesh will have
 * @return {Group} The three.js mesh group
 */
export function bodyToMesh(body, material) {
  const group = new THREE.Group()

  group.position.copy(body.position)
  group.quaternion.copy(body.quaternion)

  const meshes = body.shapes.map((shape) => {
    const geometry = shapeToGeometry(shape)

    return new THREE.Mesh(geometry, material)
  })

  meshes.forEach((mesh, i) => {
    const offset = body.shapeOffsets[i]
    const orientation = body.shapeOrientations[i]
    mesh.position.copy(offset)
    mesh.quaternion.copy(orientation)

    group.add(mesh)
  })

  return group
}

/**
 * Converts a three.js shape to a cannon.js geometry.
 * ⚠️ Warning: it will not work if the geometry has been rotated
 * or scaled beforehand.
 * If you want a more robust conversion, use this library:
 * https://github.com/donmccurdy/three-to-cannon
 * @param {Geometry} geometry The three.js geometry
 * @return {Shape} The cannon.js shape
 */
export function geometryToShape(geometry) {
  switch (geometry.type) {
    case 'BoxGeometry': {
      const { width = 1, height = 1, depth = 1 } = geometry.parameters

      const halfExtents = new CANNON.Vec3(width / 2, height / 2, depth / 2)
      return new CANNON.Box(halfExtents)
    }

    case 'PlaneGeometry': {
      return new CANNON.Plane()
    }

    case 'SphereGeometry': {
      const { radius } = geometry.parameters
      return new CANNON.Sphere(radius)
    }

    case 'CylinderGeometry': {
      const { radiusTop, radiusBottom, height, radialSegments } = geometry.parameters

      return new CANNON.Cylinder(radiusTop, radiusBottom, height, radialSegments)
    }

    // Create a ConvexPolyhedron with the convex hull if
    // it's none of these
    default: {
      // Simplify the geometry if it has too many points,
      // make it have no more than MAX_VERTEX_COUNT vertices
      const vertexCount = geometry.attributes.position.count
      const MAX_VERTEX_COUNT = 150
      const simplifiedGeometry = new SimplifyModifier().modify(geometry, Math.max(vertexCount - MAX_VERTEX_COUNT, 0))

      // Generate convex hull
      const points = extractVertices(simplifiedGeometry)
      let hullGeometry = new ConvexGeometry(points)
      hullGeometry.deleteAttribute('normal') // https://discourse.threejs.org/t/three-geometry-will-be-removed-from-core-with-r125/22401/54
      hullGeometry = BufferGeometryUtils.mergeVertices(hullGeometry)

      // extract vertices
      const vertices = extractVertices(hullGeometry)

      // compute faces and faceNormals
      const { faces, normals } = computeFacesNormals(hullGeometry, vertices)

      console.log(vertices.length, faces.length, normals.length)

      // Construct polyhedron
      const polyhedron = new CANNON.ConvexPolyhedron({
        vertices: vertices.map((v) => new CANNON.Vec3().copy(v)),
        faces,
        normals: normals.map((v) => new CANNON.Vec3().copy(v)),
      })

      return polyhedron
    }
  }
}

function computeFacesNormals(geom, vertices) {
  const index = geom.index
  console.log(index)

  // compute faces
  // TODO check how index is computed
  const faces = []
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const face = [index.getX(i), index.getY(i), index.getZ(i)]
      faces.push(face)
    }
  } else {
    for (let i = 0; i < vertices.length; i += 3) {
      const face = [i, i + 1, i + 2]
      faces.push(face)
    }
  }

  // compute normals
  const faceNormals = []
  const cb = new THREE.Vector3()
  const ab = new THREE.Vector3()
  for (let i = 0; i < faces.length; i++) {
    const face = faces[i]

    const vA = vertices[face[0]]
    const vB = vertices[face[1]]
    const vC = vertices[face[2]]

    cb.subVectors(vC, vB)
    ab.subVectors(vA, vB)
    cb.cross(ab)

    cb.normalize()

    faceNormals.push(new THREE.Vector3().copy(cb))
    // faceNormals.push(new CANNON.Vec3().copy(cb))
  }

  return { faces, normals: faceNormals }
}

// transform the position attribute into Vector3 array
function extractVertices(bufferGeometry) {
  const vertices = []
  const positionAttribute = bufferGeometry.attributes.position
  for (let i = 0; i < positionAttribute.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i)
    vertices.push(vertex)
  }
  return vertices
}
