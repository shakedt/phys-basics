import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import CANNON from 'cannon'


/**
 * Debug
 */
const gui = new GUI()

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Sounds
const hitSound = new Audio('/sounds/hit.mp3')
const playHitSound = (collision) => {
    const impactStrength = collision?.contact.getImpactVelocityAlongNormal()
    if (impactStrength > 1.5) {
        hitSound.volume = Math.random()
        hitSound.currentTime = 0
        hitSound.play()
    }
}  


/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])



let objectsToUpdate = []
const DebugObject = {
    createSphere() {
       createSphere(Math.random(), {
         x: (Math.random() - 0.5) * 3, 
         y: 3, 
         z: (Math.random() - 0.5) * 3 
        })
    },
    reset: () => {
        objectsToUpdate.forEach(object => {
            object.body.removeEventListener('collide', playHitSound)
            world.removeBody(object.body)
            scene.remove(object.sphere)
        })
        objectsToUpdate = []  
    }
}
gui.add(DebugObject, 'createSphere')
gui.add(DebugObject, 'reset')
// physics world
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = true;
world.gravity.set(0, -9.82, 0)

// Materials
const defaultMaterial = new CANNON.Material('default')
// const plasticMaterial = new CANNON.Material('plastic')

const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.1,
        restitution: 0.7
    }
)

const SphereGeometry =  new THREE.SphereGeometry(1, 20, 20);
const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5,
    material: defaultMaterial
});

world.addContactMaterial(defaultContactMaterial)
world.defaultContactMaterial = defaultContactMaterial
const createSphere = (radius, position) => {
    const sphere = new THREE.Mesh(SphereGeometry, sphereMaterial)
    sphere.scale.set(radius, radius, radius)
   
    sphere.castShadow = true
    sphere.position.copy(position)
    scene.add(sphere)

    const shape = new CANNON.Sphere(radius)
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(position.x, position.y, position.z), // ???
        shape,
        material: defaultMaterial
    })
    // body.position.copy(position)
    body.addEventListener('collide', 
        playHitSound
       )
    body.applyLocalForce(new CANNON.Vec3(150, 0, 0), new CANNON.Vec3(0, 0, 0))
    world.addBody(body)

    objectsToUpdate.push({sphere, body})
}

createSphere(0.5, { x: 0, y: 3, z: 0 })

const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body()
floorBody.mass = 0
floorBody.addShape(floorShape)
// adjust floor to be under ball 
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
world.addBody(floorBody)

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 3, 3, 3)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()
let oldElapsedTime = 0
const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const delta = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    // update physics world
    objectsToUpdate.forEach(object => {
        object.sphere.position.copy(object.body.position)
    })
    // sphereBody.applyForce(new CANNON.Vec3(-0.5, 0, 0), sphereBody.position)

    world.step(1 / 60, delta, 3) // 1/60 = 60fps elaspedTime = time since last frame, 3 = number of iterations to calculate physics
    // sphere.position.copy(sphereBody.position) // copy physics position to threejs position

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()